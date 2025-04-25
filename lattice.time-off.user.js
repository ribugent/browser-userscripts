// ==UserScript==
// @name         Lattice time off improvements
// @namespace    http://tampermonkey.net/
// @version      2025-04-25
// @description  Reorders and show the vacations balance days on time off page
// @author       Gerard Ribugent
// @match        https://launchmetrics.latticehq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=latticehq.com
// @run-at       document-idle
// @grant        window.onurlchange
// ==/UserScript==
"use strict";

const CAROUSEL_CLASS = "_scroll_kt8wt_1";
const VACATION_DAYS = 24;
const VACATION_DAYS_EARNED_PER_MONTH = 2;
const REGEXES = [/^Vacation: \d/, /^Vacation: Carry/];

(function () {
  window.onurlchange = (event) => {
    if (event.url.match(/\/users\/.+?\/time-off$/)) {
      onTimeOffPage();
    }
  };

  if (document.URL.match(/\/users\/.+?\/time-off$/)) {
    onTimeOffPage();
  }
})();

async function onTimeOffPage() {
  const policies = [
    ...await waitFor(`ul.${CAROUSEL_CLASS} li`),
  ];

  const orderedPolicies = [];
  for (const regex of REGEXES) {
    const found = extractPolicy(policies, regex);
    if (found) {
      orderedPolicies.push(found);
    }
  }

  orderedPolicies.push(...policies);

  orderedPolicies.forEach(policy => {
    policy.style.removeProperty("scroll-snap-align")

    if (policy.innerText.match(/^Vacation: \d/) && !policy.classList.contains("patched-stats")) {
      patchEarnedVacationStats(policy);
    }
  });

  const policiesList = document.querySelector(`ul.${CAROUSEL_CLASS}`);
  policiesList.replaceChildren(...orderedPolicies);
  policiesList.scroll(0 ,0);
};

function extractPolicy(policies, match) {
  const index = policies.findIndex((p) => p.innerText.match(match));
  if (index >= 0) {
    return policies.splice(index, 1)[0];
  } else {
    return null;
  }
}

function patchEarnedVacationStats(vacationPolicy) {
  const [availableRaw, ...availableText] = vacationPolicy.childNodes[0].childNodes[1].childNodes[0].innerText.split(" ");

  const totalEarnedToday = (new Date().getMonth() + 1) * 2;
  const spentDays = totalEarnedToday - availableRaw;
  const realAvailable = VACATION_DAYS - spentDays;

  const newAvailableText = [realAvailable, ...availableText].join(" ");
  vacationPolicy.childNodes[0].childNodes[1].childNodes[0].innerText = newAvailableText;
  vacationPolicy.childNodes[0].childNodes[2].childNodes[0].innerText += ` (${availableRaw} earned balance)`;

  vacationPolicy.classList.add("patched-stats");
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
