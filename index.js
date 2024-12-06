/*
	"Chat Server"
    index.js - Launcher
    2024.09.01 - 2024.12.06
	
	Callum Fisher <cf.fisher.bham@gmail.com>

    This is free and unencumbered software released into the public domain.

    Anyone is free to copy, modify, publish, use, compile, sell, or
    distribute this software, either in source code form or as a compiled
    binary, for any purpose, commercial or non-commercial, and by any
    means.

    In jurisdictions that recognize copyright laws, the author or authors
    of this software dedicate any and all copyright interest in the
    software to the public domain. We make this dedication for the benefit
    of the public at large and to the detriment of our heirs and
    successors. We intend this dedication to be an overt act of
    relinquishment in perpetuity of all present and future rights to this
    software under copyright law.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
    OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    For more information, please refer to <https://unlicense.org/>
*/

import fs from 'fs';
import app from './app.js';

console.log('Launcher running.');

const defaultConfig = {
	'firstTimeRun': true,
	'beVerbose': true,
	'configReady': true,
	'port': 1234,
	'maxMessageLength': 512,
	'maxChatHistory': 20,
	'maxIdleTime': 60000,
	'pulseTime': 20000,
	'clientCeiling': 20,
	'maxClientsPerIPA': 2,
	'autoModWhenNoMods': true,
	'autoMod': {
		on: false,
		chaos: 0,
		capCap: 80, // Percentage of uppercase characters allowed in a message
		kickForCap: false,
		chatFilterLevel: 2,
		chatFilterTolerance: 75,
		chaosCap: {
			chatFilterLevel: 3,
			kickForCap: 15
		}
	},
	'defaultPerms': { // Define default permissions for new users:
		'chat': [
			'send',
			'read'
		]
	},
	'badTextFile': 'badText.json'
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
	Object.keys(config).forEach(key => {
		console.log(`[${configFile}] - ${key}: ${JSON.stringify(config[key])}`);
	});
}

console.log(`Configuration file integrity check completed. ${configChangeMade ? 'Recording changes now' : 'No changes made'}.`);

if (configChangeMade) fs.writeFileSync(configFile, JSON.stringify(config), 'utf-8');

// Finally, launch the app:

if (config.configReady) {
	app();
} else { // ...Or not. We still have some setup to do:
	console.log(`[!!!] Please review the configuration in '${configFile}' and change 'configReady' to 'true' [!!!]`);
}