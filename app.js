/*
    "Chat Server"
    app.js - Main program

    Copyright (©) 2024.07.23 - 2024.12.06 Callum Fisher <cf.fisher.bham@gmail.com>

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

import { Server } from 'socket.io'; // breaking news: socket.io is very inefficient for this purpose and needs to go in the bin
import express from 'express';
import { createServer } from 'node:http';
import fs from 'fs';

export default function app () {

// Load & define settings from config.json:

const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const beVerbose = config.beVerbose ?? true;

const port = process.env.PORT ?? config.port ?? 1234;

const maxMessageLength = config.maxMessageLength ?? 512;
const maxChatHistory = config.maxChatHistory ?? 20;
const maxIdleTime = config.maxIdleTime ?? 60000;
const pulseTime = config.pulseTime ?? 20000; // specifies when clients should send ping msgs, should probably go in the bin
const clientCeiling = config.clientCeiling ?? 20; // max max clients
const maxClientsPerIPA = config.maxClientsPerIPA ?? 2; // max clients per IP address

const ipaMaxKicks = config.ipaMaxKicks ?? 4; // max kicks per IP address before blocking that IP
const ipaBlockTime = config.ipaBlockTime ?? 200000;
const ipaStoreTime = config.ipaStoreTime ?? 100000; // can be overriden for blocked IPAs

// Define temp values:

let maxClients = clientCeiling; // Dynamically adjustable client limit
let clients = [];
let lastNewClient = Date.now(); // For tracking abnormal connections

let ipaStore = [
    {
        'i': '123.456.7.8', // ip address
        't': Date.now(), // date stored
        'b': 2000, // ban time
        'k': 4 // amount of kicks on this ip
    }
];

let chatHistory = [{
    't': Date.now(),
    'n': 'Server',
    'm': 'Hello, send a nice message :-)'
}];

// Define autoMod settings:

// let autoModWhenNoMods = config.autoModWhenNoMods ?? true;

let autoModConfig = config.autoMod ?? {
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

// Load & define badText for autoMod:

const unDiscreetanize = input => {
    let key = ' abcdefghijklmnopqrstuvwyxz'.split('');
    input = input.split(' '); // break character
    let output = input;
    input.forEach((char, index) => {
        output[index] = key[Number(char)] || '?';
    });
    return output.join('');
}

const undiscreetArray = input => {
    let output = input;
    input.forEach((item, index) => {
        output[index] = unDiscreetanize(item);
    });
    return output;
}

let badText;

try {
    badText = JSON.parse(fs.readFileSync(config.badTextFile, 'utf-8'));
} catch (err) {
    console.log(`Error while loading ${config.badTextFile}.`);
    process.exit();
	/* fs.writeFileSync(configFile, JSON.stringify(defaultConfig), 'utf-8');
	badText = JSON.parse(fs.readFileSync(config.badTextFile, 'utf-8')); */
}

const badWords = undiscreetArray(badText.text);

// Define autoMod functions:

const escapeRegExp = input => {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const stripToLetters = input => {
    let validChars = 'abcdefghijklmnopqrstuvwyxyz'.split('');
    input = input.split('');
    input.forEach((char, index) => {
        if (!validChars.includes(char.toLowerCase())) delete input[index];
    });
    return input.join('');
}

const compareStrings = (str1, str2) => {
    let shortest = str2.length >= str1.length ? str1 : str2;
    let longest = str2.length < str1.length ? str1 : str2;
    let matches = 0;

    shortest.split('').forEach((item, index) => ((item === longest[index]) && (matches ++)));
    
    return matches / shortest.length * 100;
}

const checkCapPercent = input => {
    let chars = input.split('');
    let count = 0;
    chars.forEach(char => ((char.toUpperCase() === char) && (count ++)));
    return count / chars.length * 100;
}

const isBadText = (input, tolerance) => {
    if (!tolerance) tolerance = 50;
    input = input.toLowerCase();
    let result = false;
    input.split(' ').forEach(word => { // Can still be bypassed with spaces but whatever
        badWords.forEach(badWord => {
            if (word.length >= badWord.length && compareStrings(badWord, stripToLetters(word)) >= tolerance) result = true;
        });
    });
    return result;
}

const filterTest = input => {
    input = input.toLowerCase();
    let strippedInput = stripToLetters(input);
    badWords.forEach(badWord => {
        if (strippedInput.includes(badWord)) return true;
    });
    return false;
}

const filterText = input => {
    input = input.toLowerCase();
    input.split(' ').forEach(word => { // Can still be bypassed with spaces but whatever
        badWords.forEach(badWord => {
            if (word === badWord) {
                input = input.replace(new RegExp(escapeRegExp(badWord), 'g'), '#'.repeat(badWord.length));
                autoModConfig.chaos ++;
            }
        });
    });
    return input;
}

const filterTextIntense = input => {
    input = input.toLowerCase();
    let strippedInput = stripToLetters(input);
    badWords.forEach(badWord => {
        if (strippedInput.includes(badWord)) {
            input = input.replace(new RegExp(escapeRegExp(badWord), 'g'), '#'.repeat(badWord.length));
            autoModConfig.chaos ++;
        }
    });
    return input;
}

const autoMod = input => {

    if (typeof input !== 'object') throw 'SyntaxError: autoMod() only accepts input type "object"';
    if (!input.a) return;

    switch (input.a) { // Check action:

        case 'chatMsg':

            let now = Date.now();
            let client = input.client;
            let msg = input.msg;

            // Was this message sent less than 1 second after the last one?

            if (now - client.lastActive < 1000) autoModConfig.chaos ++; // Yes, increase the chaos level

            // Does this message contain anything from badText?

            if (filterTest(msg.m)) autoModConfig.chaos ++; // Yes, increase the chaos level

            // Strip the message down to its letters:

            let strippedMessage = stripToLetters(msg.m);

            // Does this message contain excessive UPPERCASE letters?

            if (autoModConfig.capCap !== 0 && checkCapPercent(strippedMessage) >= autoModConfig.capCap) {

                // Yes, warn the user:

                socket.emit('msg', { t: now, n: 'Downstairs Dave', id: 'server', m: 'please don\'t shout' });

                // Optionally, kick the user:

                if (autoModConfig.kickForCap) {

                    sayBye(client, 'kick');

                    return false; // Tell the message handler to not send the message

                }

            }
            
            // Fetch the relevant chat filter level:

            let chatFilterLevel = /* client.chatFilterLevel || */ autoModConfig.chatFilterLevel;
            // client.chatFilterLevel: in the future the server could set filter levels per client to offset abuse per user without punishing everybody

            // Filter the message according to the chat filter level:

            switch (chatFilterLevel) {
                case 1:
                    return filterText(msg.m); // Words between spaces
                case 2:
                    return filterTextIntense(msg.m); // Words ignoring spaces
                case 3:
                    if (isBadText(msg.m, autoModConfig.chatFilterTolerance)) { // Similar words
                        socket.emit('msg', { t: now, n: 'Bob', id: 'server', m: 'please be respectful and take care not to spam' });
                        sayBye(client, 'kick');
                        return false;
                    }
                    break;
            }
            break;
    }

}

// Set up server:

const expressApp = express();
const server = createServer(expressApp);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

app.get('/', (req, res) => {
    res.send('<u>hello, i\'m on the internet</u>');
    // 301 perm, 302 temp
});

server.listen(port, () => {
    console.log(`server launched @ ${port}`);
});

// Handle new connection:

io.on('connection', socket => {

    let ipa = socket.handshake.address; // Fetch IP address of this client

    // Is this IP address blocked?

    if (ipaBlocked(ipa)) {
        socket.disconnect();
        return;
    }

    // Is this IP address at the max amount of clients?

    if (checkIPA(ipa) >= maxClientsPerIPA) {
        socket.emit('bye', 'busy');
        socket.disconnect();
        return;
    }

    // Register connection attempt with autoMod:

    let now = Date.now();

    if (autoModConfig.on) { // 2024.12.05 TO-DO: Add config options for this & maybe move it elsewhere.
        if (now - lastNewClient < 50 && maxClients > 3) maxClients -= 3;
        lastNewClient = now;
    }

    // Is the server full?

    if (clients.length + 1 > maxClients) {
        socket.emit('bye', 'busy');
        socket.disconnect();
        return;
    }

    // Define info for this client:

    let client = {
        socket: socket,
        id: forgeID(),
        lastPulse: now,
        lastActive: now,
        lastMessage: '',
        ipa: ipa
    }

    client.name = `Guest${client.id}`;

    clients.push(client); // Add this to the active client list

    if (beVerbose) console.log(`connect #${client.id}`);

    updateClients(); // Introduce this client to everybody else

    // Send recent chat history to this client:

    socket.emit('chistory', chatHistory);
    socket.on('chistory', () => {
        socket.emit('chistory', chatHistory);
    });

    socket.emit('p', pulseTime);

    socket.on('disconnect', () => {
        if (beVerbose) console.log(`disconnect #${client.id}`);
        // disabled for now due to removing wrong/too many clients - relying on "pulseTime" timeout for now:
        /* clients.splice(clients.indexOf(client), 1);
        updateClients(); */
    });

    socket.on('msg', msg => {

        // Is this a valid message type?

        if (typeof msg !== 'object' || typeof msg.m !== 'string' || msg.m.length > maxMessageLength) {
            sayBye(client, 'kick');
            return;
        }

        // Update client's lastActive:

        let lastActive = client.lastActive;

        client.lastActive = Date.now();

        // Filtering & moderation:

        msg.m = msg.m.replace(/</g,'&lt;').replace(/>/g,'&gt;'); // Prevent html injection

        if (autoModConfig.on) {
            let autoModOut = autoMod({ // Pass info to autoMod:
                a: 'chatMsg',
                client: client,
                msg: msg
            });
            if (autoModOut) {
                msg.m = autoModOut;
            } else {
                return;
            }
        }

        // Is this message the same as the client's last?
        // Is this message being sent less than two seconds after the last one?

        if (msg.m === client.lastMessage && (now - lastActive < 2000)) return;

        // Create outgoing message:

        msg = {
            t: now,
            n: client.name,
            m: msg.m
        };

        // Send:

        io.emit("msg", msg);

        // Update chat history:

        chatHistory.push(msg);
        if (chatHistory.length > maxChatHistory) chatHistory.splice(0, 1)[0];
        client.lastMessage = msg.m;

    });
});

// Define general functions:

const forgeID = () => { // we can come up with a better way later
    return Math.floor(Math.random() * 90000);
}

const checkIPA = ipa => {
    let count = 0;
    clients.forEach(client => (client.ipa === ipa && count ++));
    return count;
}

const ipaBlocked = ipa => {
    let output = false;
    ipaStore.forEach(item => { // can probably replace with .filter or something
        if (item.i === ipa) {
            if (item.b) output = true;
        }
    });
    return output;
}

const updateClients = () => {
    let filteredClients = [];
    clients.forEach(client => {
        filteredClients.push({
            id: client.id,
            n: client.name
        });
    });
    io.emit('max', maxClients);
    io.emit('clients', filteredClients);
}

const sayBye = (client, code) => {
    if (!code) code = 'kick';
    client.socket.emit('bye', code);
    client.socket.disconnect();
    clients.splice(clients.indexOf(client), 1);
    updateClients();
    // record the amount of kicks for this IPA:
    if (code === 'kick') {
        autoModConfig.chaos ++;
        let found = false;
        ipaStore.forEach(ipa => { // can be simplified also probably
            if (ipa.i === client.ipa) {
                ipaStore[ipaStore.indexOf(ipa)].k ++;
                if (ipaStore[ipaStore.indexOf(ipa)].k >= ipaMaxKicks) {
                    ipaStore[ipaStore.indexOf(ipa)].b = Date.now();
                }
                found = true;
            }
        });
        if (found) return;
        ipaStore.push({
            i: client.ipa,
            t: Date.now(),
            k: 1
        });
    }
}

setInterval(() => {
    clients.forEach(client => {
        // check pulse:
        if (Date.now() - client.lastPulse > (pulseTime + 5000)) {
            if (beVerbose) console.log(`disconnect #${client.id} (nopulse)`);
            sayBye(client, 'nopulse');
            return;
        }
        // check user activity:
        if (Date.now() - client.lastActive > maxIdleTime) {
            if (beVerbose) console.log(`disconnect #${client.id} (idle)`);
            sayBye(client, 'idle');
        }
    });
    // check ipaStore, can probably be simplified:
    ipaStore.forEach(item => {
        if (!item.b && (Date.now() - item.t >= ipaStoreTime)) { // delete due to ipa store time expirery
            delete ipaStore[ipaStore.indexOf(item)];
        } else if (item.b && (Date.now() - item.b >= ipaBlockTime)) { // delete due to ipa block time expirery
            delete ipaStore[ipaStore.indexOf(item)];
        }
    });
}, maxIdleTime > pulseTime ? pulseTime : maxIdleTime);



// 2024.12.06 - TO-DO: Drag most of this into the autoMod function.

// autoMod uses a "chaos" integer to dynamically adjust certain restrictions:
if (autoModConfig.on) setInterval(() => {
    if (!autoModConfig.on) return;
    if (maxClients < clientCeiling) maxClients ++;
    if (!autoModConfig.on) return;
    if (clientCeiling !== maxClients) autoModConfig.chaos += 2;
    // adjust chatFilterLevel:
    if (autoModConfig.chaos >= autoModConfig.chaosCap.chatFilterLevel) if (autoModConfig.chatFilterLevel !== 3) autoModConfig.chatFilterLevel ++;
    if (autoModConfig.chaos === 0) if (autoModConfig.chatFilterLevel > 0) autoModConfig.chatFilterLevel --;
    autoModConfig.kickForCap = autoModConfig.chaos > autoModConfig.chaosCap.kickForCap;
    if (autoModConfig.chaos === 0) return;
    autoModConfig.chaos --;
}, 10000);

}