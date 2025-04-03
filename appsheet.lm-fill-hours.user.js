// ==UserScript==
// @name         Fill hours
// @namespace    http://tampermonkey.net/
// @version      2025-03-03
// @description  Fill hours for our beloved LM time tracking
// @author       Gerard Ribugent <ribugent@gmail.com>
// @match        https://www.appsheet.com/start/c1141281-d882-4fef-80fc-d82f5fd8094a?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=appsheet.com
// @grant        GM_addStyle
// ==/UserScript==
'use strict';

const WORKING_SCHEDULE = [
    { start: '8:00', end: '12:00' },
    { start: '12:30', end: '16:30' }
];
const ENTROPY_MINUTES = 10;

const css = `
    button.lm-fill-hours-button {
        padding: 4px 10px;
        font-size: 0.778rem;
        box-shadow: none;
        color: #fff;
        background-color: #05ac86;
        min-width: 64px;
        box-sizing: border-box;
        font-family: inherit;
        font-weight: 400;
        line-height: 1.75;
        border-radius: 4px;
        border: 0;
        cursor: pointer;
        margin: 0;
        display: inline-flex;
        outline: 0;
        position: relative;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        margin-right: 5px;
    }
`;

(function() {
    GM_addStyle(css);
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
    const buttonClass = "lm-fill-hours-button";

    const fillTodayButton = document.createElement('button');
    fillTodayButton.innerText = '✅ Fill Today';
    fillTodayButton.id='fillToday';
    fillTodayButton.type = 'button'
    fillTodayButton.className = buttonClass;
    fillTodayButton.onclick = () => fillToday(addButton);
    addButton.parentElement.prepend(fillTodayButton);

    const fillMonthButton = document.createElement('button');
    fillMonthButton.innerText = '📅 Fill month';
    fillMonthButton.id='fillMonth';
    fillMonthButton.type = 'button'
    fillMonthButton.className = buttonClass;
    fillMonthButton.onclick = () => fillMonth(addButton);
    addButton.parentElement.prepend(fillMonthButton);
}

async function fillToday(addButton) {
    const today = new Date();

    const minuteDiff = [...Array(WORKING_SCHEDULE.length)].map(_ => Math.ceil(Math.random() * ENTROPY_MINUTES));

    const clockHours = WORKING_SCHEDULE.map((schedule, idx) => {
        const begin = schedule.start.split(':');
        const end = schedule.end.split(':');

        today.setUTCHours(...begin, 0, 0);
        today.setUTCMinutes(today.getUTCMinutes() + minuteDiff[idx]);
        const clockIn = today.toISOString().replace(/\.\d+(?:Z)$/, '')

        today.setUTCHours(...end, 0, 0);
        today.setUTCMinutes(today.getUTCMinutes() + minuteDiff[minuteDiff.length - 1 - idx])
        const clockOut = today.toISOString().replace(/\.\d+(?:Z)$/, '')

        return [clockIn, clockOut];
    });

    for (const [clockIn, clockOut] of clockHours) {
        await trackDate(addButton, clockIn, clockOut);
    }
}

async function fillMonth(addButton) {
    const daysToFill = await getDaysToFill();

    console.log("Days to fill", daysToFill);

    const clockHours = WORKING_SCHEDULE.flatMap(schedule => {
        return daysToFill.map(day => {
            const begin = schedule.start.split(':');
            const end = schedule.end.split(':');

            day.setUTCHours(...begin, 0, 0);
            const clockIn = day.toISOString().replace(/\.\d+(?:Z)$/, '')

            day.setUTCHours(...end, 0, 0);
            const clockOut = day.toISOString().replace(/\.\d+(?:Z)$/, '')

            return [clockIn, clockOut];
        });
    });

    console.log("Clock hours", clockHours);

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
        await sleep(100);
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

async function getDaysToFill() {
    const now = new Date();
    now.setUTCHours(12, 0, 0, 0);
    const start = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0, 0);

    const lastDayOfMonth = new Date(start.toISOString());
    lastDayOfMonth.setUTCMonth(start.getUTCMonth() + 1, 0);

    const filledDays = await extractFilledDays();
    const daysToFill = [];
    while (start <= lastDayOfMonth) {
        const isWeekDay = start.getDay() > 0 && start.getDay() < 6;
        const isFilled = filledDays.has(`${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`);

        if (isWeekDay && !isFilled) {
            daysToFill.push(new Date(start.getTime()));
        }

        start.setDate(start.getDate() + 1);
    }
    return daysToFill;
}

async function extractFilledDays() {
    const filledDays = new Set();
    const table = document.querySelector("div.TableView__list");

    const initialScrollTop = table.scrollTop;
    table.scrollTo(0, 0);
    while (table.scrollTop < table.scrollHeight) {
        const scrollTo = Math.min(table.scrollTop + 200, table.scrollHeight);
        table.scrollTo(0, scrollTo);
        await sleep(10); // Let event loop to work and render elements
        [...document.querySelectorAll("span[data-testid=date-time-type-display-span]")].map(e => e.innerText.split(" ")[0]).forEach(day => filledDays.add(day));

        // If we didn't scroll, we've reached the bottom
        if (scrollTo !== table.scrollTop) {
            break;
        }
    }

    table.scrollTo(0, initialScrollTop);

    console.log("Filled days", filledDays);

    return filledDays;
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
