# Tampermonkey Scripts

This repository contains useful Tampermonkey scripts for enhancing web applications.

## Installing Tampermonkey (Required)

Before using any scripts in this repository, you must first install the Tampermonkey browser extension. Tampermonkey is a userscript manager that safely allows custom JavaScript code to run on specific websites, enhancing their functionality.

These scripts will not work without Tampermonkey installed. Please install it for your browser using one of these official links:

- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Chrome](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd)

## Installing Scripts

1. Click on the script link you want to install
2. Tampermonkey will open showing the script source
3. Click the "Install" button
4. Click "Install" again in the confirmation dialog

## Available Scripts

### AppSheet lm fill hours

Extends AppSheet with a few extra buttons to fill hours in the time tracking form, with these features:

- Random minute variations (up to 10 minutes) to clock-in and clock-out times, these are pre-configured, adjust them as needed.
- Tracking entries are send as "Automatic" instead of "Manual".
- Girona office holidays are defined in the script and will not be filled.

[Install](https://github.com/ribugent/browser-userscripts/raw/refs/heads/main/appsheet.lm-fill-hours.user.js)

### Lattice Time-Off Enhancement

This script enhances the Lattice time-off view by:

- Reorders the time-off policies to show the vacation days first always
- Showing total available vacation days including unearned time

> **Warning**: This script is still on early development, double check the vacation balance

[Install](https://github.com/ribugent/browser-userscripts/raw/refs/heads/main/lattice.time-off.user.js)

## No Responsibility

These scripts are provided "as is", without warranty of any kind. Use them at your own risk. The author is not responsible for any issues that may arise from using these scripts.
