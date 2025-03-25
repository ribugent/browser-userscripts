// ==UserScript==
// @name         Lattice time off reordering
// @namespace    http://tampermonkey.net/
// @version      2025-03-25
// @description  Time off reordering
// @author       Gerard Ribugent
// @match        https://launchmetrics.latticehq.com/users/*/time-off
// @icon         https://www.google.com/s2/favicons?sz=64&domain=latticehq.com
// @grant        none
// ==/UserScript==

const REGEXES = [/^Vacation: \d/, /^Vacation: Carry/];

(function () {
  "use strict";

  const policies = [
    ...document.querySelectorAll("ul.Carousel_scroll__i91Oz li"),
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
})();

function extractPolicy(policies, match) {
  const index = policies.findIndex((p) => p.innerText.match(match));
  if (index >= 0) {
    return policies.splice(index, 1)[0];
  } else {
    return null;
  }
}
