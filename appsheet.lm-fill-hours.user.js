// ==UserScript==
// @name         Fill hours
// @namespace    http://tampermonkey.net/
// @version      2025-04-03
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
    setOnClickFullButton(fillTodayButton, () => fillDate());
    addButton.parentElement.prepend(fillTodayButton);

    const fillUpToTodayButton = document.createElement('button');
    fillUpToTodayButton.innerText = '📝 Fill Up To Today';
    fillUpToTodayButton.id='fillUpToToday';
    fillUpToTodayButton.type = 'button'
    fillUpToTodayButton.className = buttonClass;
    setOnClickFullButton(fillUpToTodayButton, () => fillMonth(new Date(), true));
    addButton.parentElement.prepend(fillUpToTodayButton);

    const fillCurrentMonth = document.createElement('button');
    fillCurrentMonth.innerText = '📅 Fill current month';
    fillCurrentMonth.id='fillMonth';
    fillCurrentMonth.type = 'button'
    fillCurrentMonth.className = buttonClass;
    setOnClickFullButton(fillCurrentMonth, () => fillMonth());
    addButton.parentElement.prepend(fillCurrentMonth);

    const fillPreviousMonth = document.createElement('button');
    fillPreviousMonth.innerText = '📆 Fill previous month';
    fillPreviousMonth.id='fillPreviousMonth';
    fillPreviousMonth.type = 'button'
    fillPreviousMonth.className = buttonClass;
    setOnClickFullButton(fillPreviousMonth, () => {
        const date = new Date();
        date.setUTCMonth(date.getUTCMonth() - 1);
        return fillMonth(date);
    });
    addButton.parentElement.prepend(fillPreviousMonth);
}

function setOnClickFullButton(button, callback) {
    button.onclick = async () => {
        showWorkingOverlay();
        await callback();
        alert("⚠️ Everything is done, please check everything is ok, specially your holidays or other days off! ⚠️");
        nukeWorkingOverlay();
    }
}

async function fillDate(date = new Date()) {
    const clockHours = buildClockHours(date);

    for (const [clockIn, clockOut] of clockHours) {
        console.log("Filling", clockIn, clockOut);
        await trackDate(clockIn, clockOut);
    }
}

async function fillMonth(date = new Date(), upToToday = false) {
    const daysToFill = await getDaysToFillForMonth(date, upToToday);

    console.log("Days to fill", daysToFill);

    for (const day of daysToFill) {
        await fillDate(day);
    }
}

async function trackDate(clockInDate, clockOutDate) {
    const addButton = document.querySelector('button[aria-label="Add"]');
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

async function getDaysToFillForMonth(date = new Date(), upToToday = false) {
    date.setUTCHours(12, 0, 0, 0);
    const start = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0, 0);

    let lastDay;
    if (upToToday) {
        lastDay = new Date();
        lastDay.setUTCHours(12, 0, 0, 0);
    } else {
        lastDay = new Date(start.toISOString());
        lastDay.setUTCMonth(start.getUTCMonth() + 1, 0);
    }

    const filledDays = await extractFilledDays();
    const daysToFill = [];
    while (start <= lastDay) {
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

function buildClockHours(date) {
    const minuteDiff = [...Array(WORKING_SCHEDULE.length)].map(_ => Math.ceil(Math.random() * ENTROPY_MINUTES));

    const clockHours = WORKING_SCHEDULE.map((schedule, idx) => {
        const begin = schedule.start.split(':');
        const end = schedule.end.split(':');

        date.setUTCHours(...begin, 0, 0);
        date.setUTCMinutes(date.getUTCMinutes() + minuteDiff[idx]);
        const clockIn = date.toISOString().replace(/\.\d+(?:Z)$/, '')

        date.setUTCHours(...end, 0, 0);
        date.setUTCMinutes(date.getUTCMinutes() + minuteDiff[minuteDiff.length - 1 - idx])
        const clockOut = date.toISOString().replace(/\.\d+(?:Z)$/, '')

        return [clockIn, clockOut];
    });

    return clockHours;
}

function showWorkingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'lm-fill-hours-working-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '9999';

    const img = document.createElement('img');
    img.src = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzkzdDN6aDJpcm53ZWdsZWF4N2lrYnR3OHVnYWYzMGo4cTNwNzhjNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lgcUUCXgC8mEo/200.gif";
    img.style.position = 'fixed';
    img.style.top = '50%';
    img.style.left = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.maxWidth = '80%';
    img.style.maxHeight = '80%';
    img.style.zIndex = '10000';
    overlay.appendChild(img);

    nukeWorkingOverlay();
    document.body.appendChild(overlay);
}

function nukeWorkingOverlay() {
    document.getElementById('lm-fill-hours-working-overlay')?.remove();
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
