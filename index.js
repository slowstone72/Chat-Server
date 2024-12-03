/*
	"Chat Server"
    index.js - Launcher

    Copyright 2024.09.01 - 2024.12.03 (©) Callum Fisher <cf.fisher.bham@gmail.com>

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

import pkg from "edit-json-file"; // 2024.12.03: To-do: get rid of edit-json-file
const editjsonfile = pkg;
import fs from "fs";
import app from "./app.js";
const moduleName = "Launcher";

console.log("Running.");

// Define default configuration: (config.json)

const validKeys = {
	"firstTimeRun": true,
	"verboseLogging": false,
	"configReady": false,
	'port': 1234
}

// Define valid directories:

const validDirs = [
	"logs",
	"db",
	"midi",
	"midiBackup",
	"midiToImport",
	"cmds",
	"items"
];

let configChangeMade;

// Create missing directories:

validDirs.forEach(dir => {
	fs.exists(`./${dir}`, exists => {
		if (!exists) {
			fs.mkdir(`./${dir}`, err => {
				if (err) {
					console.log(`ERROR: Failed to create directory "${dir}"!`, err);
					process.exit();
				} else {
					console.log(`Created directory: "${dir}"`);
				}
			});
		}
	});
});


// Check config.json:

console.log(`Checking configuration file integrity...`);

const config = editjsonfile("./config.json");

configChangeMade = false;

if (config.data.firstTimeRun == undefined) {
	configChangeMade = true;
	config.set("firstTimeRun", true);
} else if (config.data.firstTimeRun) {
	configChangeMade = true;
	config.set("firstTimeRun", false);
}

// Add missing keys:

Object.keys(validKeys).forEach(key => {
	if (!Object.keys(config.data).includes(key)) {
		configChangeMade = true;
		console.log(`[config.json] Adding missing key "${key}" with value: ${JSON.stringify(validKeys[key])}`);
		config.set(key, validKeys[key]);
	}
});

// Remove unknown keys:

Object.keys(config.data).forEach(key => {
	if (!Object.keys(validKeys).includes(key)) {
		configChangeMade = true;
		console.log(`[config.json] Removing unknown key "${key}"`);
		delete config.data[key];
	}
});

if (config.data.detailedLogging) {
	console.log(`[config.json] Using the following options:`)
	Object.keys(config.data).forEach(key => { // Print out the key values being used:
			console.log(`[config.json] - ${key}: ${JSON.stringify(config.data[key])}`);
	});
}

if (configChangeMade) { // If changes have been made to the configuration file, record those changes: (there's no need to rewrite the file if no changes have been made)
	console.log(`Configuration file integrity check completed. Recording changes now.`);
	config.save();
} else {
	console.log(`Configuration file integrity check completed. No changes made.`);
}

// Run the app:
if (config.get("configReady")) {
	app();
} else {
	console.log(`[!!!] Please review the configuration in "config.json" and change "configReady" to "true" [!!!]`);
}