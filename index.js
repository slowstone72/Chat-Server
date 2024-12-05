/*
	"Chat Server"
    index.js - Launcher

    Copyright (©) 2024.09.01 - 2024.12.05 Callum Fisher <cf.fisher.bham@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import fs from 'fs';
import app from './app.js';

console.log('Launcher running.');

const defaultConfig = {
	'firstTimeRun': true,
	'verboseLogging': false,
	'configReady': false,
	'port': 1234,
	'maxMessageLength': 512,
	'maxChatHistory': 20,
	'maxIdleTime': 60000,
	'pulseTime': 20000,
	'clientCeiling': 20,
	'maxClientsPerIPA': 2,
	'autoMod': {
		on: true,
		chaos: 0,
		capCap: 80, // the max percentage cap of uppercase characters in a message
		kickForCap: false,
		chatFilterLevel: 2,
		chatFilterTolerance: 75,
		chaosCap: {
			chatFilterLevel: 3,
			kickForCap: 15
		}
	} 
}

const configFile = 'config.json';

let config;

try {
	config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
} catch (err) {
	console.log('Error while loading config.json, recreating...');
	fs.writeFileSync(configFile, JSON.stringify(defaultConfig), 'utf-8');
	config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
}

// Define valid directories:

// const validDirs = [];

let configChangeMade;

// Create missing directories:

/* validDirs.forEach(dir => {
	fs.exists(`./${dir}`, exists => {
		if (!exists) {
			fs.mkdir(`./${dir}`, err => {
				if (err) {
					console.log(`ERROR: Failed to create directory '${dir}'!`, err);
					process.exit();
				} else {
					console.log(`Created directory: '${dir}'`);
				}
			});
		}
	});
}); */


// Check config.json:

console.log('Checking configuration file integrity...');

if (typeof config.firstTimeRun === 'undefined') {
	configChangeMade = true;
	config.firstTimeRun = true;
} else if (config.firstTimeRun) {
	configChangeMade = true;
	config.firstTimeRun = false;
}

// Add missing keys:

Object.keys(defaultConfig).forEach(key => {
	if (!Object.keys(config).includes(key)) {
		console.log(`[${configFile}] Adding missing key '${key}' with value: ${JSON.stringify(defaultConfig[key])}`);
		config[key] = defaultConfig[key];
		configChangeMade = true;
	}
});

// Remove unknown keys:

Object.keys(config).forEach(key => {
	if (!Object.keys(defaultConfig).includes(key)) {
		console.log(`[${configFile}] Removing unknown key '${key}'`);
		delete config[key];
		configChangeMade = true;
	}
});

if (config.beVerbose) {
	console.log(`[${configFile}] Using the following options:`);
	Object.keys(config).forEach(key => { // Print out the key values being used:
		console.log(`[${configFile}] - ${key}: ${JSON.stringify(config[key])}`);
	});
}

if (configChangeMade) { // If changes have been made to the configuration file, record those changes: (there's no need to rewrite the file if no changes have been made)
	console.log(`Configuration file integrity check completed. Recording changes now.`);
	fs.writeFileSync(configFile, JSON.stringify(config), 'utf-8');
} else {
	console.log(`Configuration file integrity check completed. No changes made.`);
}

// Run the app:
if (config.configReady) {
	app();
} else {
	console.log(`[!!!] Please review the configuration in '${configFile}' and change 'configReady' to 'true' [!!!]`);
}