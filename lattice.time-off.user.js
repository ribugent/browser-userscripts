// ==UserScript==
// @name         Lattice time off improvements
// @namespace    http://tampermonkey.net/
// @version      2025-04-03
// @description  Reorders and show the vacations balance days on time off page
// @author       Gerard Ribugent
// @match        https://launchmetrics.latticehq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=latticehq.com
// @grant        window.onurlchange
// ==/UserScript==
"use strict";

const VACATION_DAYS = 24;
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

  orderedPolicies.forEach(policy => {
    policy.style.removeProperty("scroll-snap-align")

    if (policy.innerText.match(/days?.*?available/) && !policy.classList.contains("patched-stats")) {
      patchVacationStats(policy, policy.innerText.match(/^Vacation: \d/));
    }
  });

  const policiesList = document.querySelector("ul.Carousel_scroll__i91Oz");
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

function patchVacationStats(vacationPolicy, isEarned) {
  const [earnedRaw, ...earnedText] = vacationPolicy.childNodes[0].childNodes[1].childNodes[0].innerText.split(" ");
  const [scheduledRaw] = vacationPolicy.childNodes[0].childNodes[2].childNodes[0].innerText.split(' ')

  const earnedAvailable = parseFloat(earnedRaw);
  const scheduled = parseFloat(scheduledRaw);

  const totalAvailable = isEarned ? VACATION_DAYS : earnedAvailable;
  const available = totalAvailable - scheduled;
  const availableText = [`${available}/${totalAvailable}`, ...earnedText].join(" ");

  vacationPolicy.childNodes[0].childNodes[1].childNodes[0].innerText = availableText;

  if (isEarned) {
    vacationPolicy.childNodes[0].childNodes[2].childNodes[0].innerText += ` (${earnedAvailable} earned)`;
  }

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
