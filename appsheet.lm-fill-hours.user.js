// ==UserScript==
// @name         Fill hours
// @namespace    http://tampermonkey.net/
// @version      2025-03-03
// @description  try to take over the world!
// @author       Gerard Ribugent <ribugent@gmail.com>
// @match        https://www.appsheet.com/start/c1141281-d882-4fef-80fc-d82f5fd8094a?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=appsheet.com
// @grant        none
// ==/UserScript==
'use strict';

const WORKING_SCHEDULE = [
    { start: '8:00', end: '12:00' },
    { start: '12:30', end: '16:30' }
];
const DEFAULT_ENTROPY_MINUTES = 10;

(function() {
    addEventListener("hashchange", event => detectDetailPage(new URL(event.newURL)));
    detectDetailPage(document.URL);
})();

async function detectDetailPage(url) {
    const [sectionElement] = await waitFor("div[data-view-state-key]")
    const stateKey = JSON.parse(sectionElement.dataset.viewStateKey)

    if (stateKey.Name === "Detail") {
        await renderExtraButtons(sectionElement)
    }
}

async function renderExtraButtons(sectionElement) {
    if (sectionElement.querySelector('#fillMonth, #fillToday')) {
        return;
    }

    const [addButton] = await waitFor('button[aria-label="Add"]')

    const fillTodayButton = document.createElement('button');
    fillTodayButton.innerText = '✅ Fill Today';
    fillTodayButton.id='fillToday';
    fillTodayButton.type = 'button'
    fillTodayButton.onclick = () => fillToday(addButton);
    addButton.parentElement.prepend(fillTodayButton);
}

async function fillToday(addButton) {
    const today = new Date();

    const clockHours = WORKING_SCHEDULE.map(schedule => {
        const begin = schedule.start.split(':');
        const end = schedule.end.split(':');

        today.setUTCHours(...begin, 0, 0);
        const clockIn = today.toISOString().replace(/\.\d+(?:Z)$/, '')

        today.setUTCHours(...end, 0, 0);
        const clockOut = today.toISOString().replace(/\.\d+(?:Z)$/, '')

        return [clockIn, clockOut];
    });

    for (const [clockIn, clockOut] of clockHours) {
        await trackDate(addButton, clockIn, clockOut);
    }
}

async function trackDate(addButton, clockInDate, clockOutDate) {
    addButton.click();

    const trackForm = document.querySelector('div[aria-label="Manual Entry"]');

    const clockIn = trackForm.querySelector('div.Attr_Clock_In input');
    const clockOut = trackForm.querySelector('div.Attr_Clock_Out input');
    fillInputDate(clockIn, clockInDate);
    fillInputDate(clockOut, clockOutDate);

	const typeOfDay = trackForm.querySelector('div.Attr_Type_of_day span.ASTappable.ButtonSelectButton');
    for (const event of ['mousedown', 'mouseup', 'click']) {
        typeOfDay.dispatchEvent(new Event(event, { bubbles: true, cancelable: false, view: window }));
    }

    await waitFor('div.Attr_Type_of_day span.ASTappable.ButtonSelectButton.ButtonSelectButton--selected', trackForm);

	const saveButton = trackForm.querySelector('div[data-testid=subnav-header] button:last-child');
	if (saveButton.innerText === 'Save') {
        saveButton.focus();
		saveButton.click();
	} else {
		console.log('Save button not found');
        throw new Error('Save button not found');
	}
}

function fillInputDate(input, date) {
    input.focus();
    input.value = date
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: false, view: window }));
    input.dispatchEvent(new Event('focusout', { bubbles: true, cancelable: false, view: window }));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitFor(selector, root = document) {
    const started = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        const elements = root.querySelectorAll(selector);
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
