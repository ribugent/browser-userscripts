// ==UserScript==
// @name         Lattice time off reordering
// @namespace    http://tampermonkey.net/
// @version      2025-03-25
// @description  Time off reordering
// @author       Gerard Ribugent
// @match        https://launchmetrics.latticehq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=latticehq.com
// @grant        window.onurlchange
// ==/UserScript==
"use strict";

const REGEXES = [/^Vacation: \d/, /^Vacation: Carry/];

(function () {
  window.onurlchange = (event) => {
    if (event.url.match(/\/users\/.+?\/time-off$/)) {
      onTimeOffPage();
    }
  };
})();

async function onTimeOffPage() {
  const policies = [
    ...await waitFor("ul.Carousel_scroll__i91Oz li"),
  ];

  const orderedPolicies = [];
  for (const regex of REGEXES) {
    const found = extractPolicy(policies, regex);
    if (found) {
      orderedPolicies.push(found);
    }
  }

  orderedPolicies.push(...policies);
  orderedPolicies.forEach((p) => p.style.removeProperty("scroll-snap-align"));

  const policiesList = document.querySelector("ul.Carousel_scroll__i91Oz");
  policiesList.innerHTTML = "";
  policiesList.append(...orderedPolicies);
};

function extractPolicy(policies, match) {
  const index = policies.findIndex((p) => p.innerText.match(match));
  if (index >= 0) {
    return policies.splice(index, 1)[0];
  } else {
    return null;
  }
}

function waitFor(selector) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        resolve(elements);
      } else {
        if (Date.now() - started > 10000) {
          reject(new Error("Timeout waiting for " + selector));
        } else {
          setTimeout(check, 100);
        }
      }
    };
    check();
  });
}
