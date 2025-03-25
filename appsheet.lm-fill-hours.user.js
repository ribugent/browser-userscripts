// ==UserScript==
// @name         Fill hours
// @namespace    http://tampermonkey.net/
// @version      2025-03-03
// @description  try to take over the world!
// @author       Gerard Ribugent <ribugent@gmail.com>
// @match        https://www.appsheet.com/start/c1141281-d882-4fef-80fc-d82f5fd8094a?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=appsheet.com
// @grant        unsafeWindow
// ==/UserScript==

const WORKING_SCHEDULE = [
    { start: '8:00', end: '12:00' },
    { start: '12:30', end: '16:30' }
];
const DEFAULT_ENTROPY_MINUTES = 10;

(function() {
    'use strict';

    addEventListener("hashchange", event => detectDetailPage(new URL(event.newURL)));
    detectDetailPage(document.URL);
})();

function detectDetailPage(url) {
    const sectionElement = document.querySelector("div[data-view-state-key]")
    const stateKey = JSON.parse(sectionElement.dataset.viewStateKey)

    if (stateKey.Name === "Detail") {
        renderExtraButtons(sectionElement)
    }
}

function renderExtraButtons(sectionElement) {
    if (sectionElement.querySelector('#fillMonth, #fillToday')) {
        return;
    }

    const addButton = sectionElement.querySelector('button[aria-label="Add"]')

    const fillToday = document.createElement('button');
    fillToday.innerText = '✅ Fill Today';
    fillToday.id='fillToday';
    fillToday.type = 'button'
    fillToday.onclick = () => trackDate(addButton, new Date());
    addButton.parentElement.prepend(fillToday);


    /* const fillMonth = document.createElement('button');
    fillMonth.innerText = '📅 Fill Month';
    fillMonth.id='fillMonth';
    fillMonth.type = 'button'
    addButton.parentElement.prepend(fillMonth);*/
}

async function trackDate(addButton, date) {
    addButton.click();

    const trackForm = document.querySelector('div[aria-label="Manual Entry"]');

	const typeOfDay = trackForm.querySelector('div.Attr_Type_of_day span.ASTappable.ButtonSelectButton');
    console.log(typeOfDay)
    let click = new Event('mousedown', { bubbles: true, cancelable: false, view: window });
    typeOfDay.dispatchEvent(click);
	click = new Event('mouseup', { bubbles: true, cancelable: false, view: window });
	typeOfDay.dispatchEvent(click);
	click = new Event('click', { bubbles: true, cancelable: false, view: window });
	typeOfDay.dispatchEvent(click);

	console.log('Clicked type of day');

	// await sleep(500);


	console.log(`Input date: ${date.toISOString()}`);

    const clockIn = trackForm.querySelector('div.Attr_Clock_In input');
    const clockOut = trackForm.querySelector('div.Attr_Clock_Out input');

    date.setUTCHours(8);
    date.setUTCMinutes(0);
	date.setUTCSeconds(0);
	const clockInDate = date.toISOString().replace(/\.\d+(?:Z)$/, '')
	console.log(`Clock in date: ${clockInDate}`);
    clockIn.focus();
    clockIn.value = clockInDate
    clockIn.dispatchEvent(new Event('change', { bubbles: true, cancelable: false, view: window }));
    // await sleep(500);

    date.setUTCHours(12);
    date.setUTCMinutes(0);
    date.setUTCSeconds(0);
    const clockOutDate = date.toISOString().replace(/\.\d+(?:Z)$/, '')
	console.log(`Clock out date: ${clockOutDate}`);
    clockOut.focus();
    clockOut.value = clockOutDate
    clockOut.dispatchEvent(new Event('change', { bubbles: true, cancelable: false, view: window }));
    // await sleep(1000);
	console.log(`Clock out: ${clockOut.value}`)

	const saveButton = trackForm.querySelector('div[data-testid=subnav-header] button:last-child');
	if (saveButton.innerText === 'Save') {
        saveButton.focus();
        await sleep(1000);
		saveButton.click();
	} else {
		console.log('Save button not found');
	}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
