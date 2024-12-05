/*
	"Chat Server"
    discreetanize.js - For obscuring badText

    Copyright (©) 2024.12.05 Callum Fisher <cf.fisher.bham@gmail.com>

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

const discreetanize = input => {
    let key = ' abcdefghijklmnopqrstuvwyxz'.split('');
    input = input.split('');
    output = input;
    input.forEach((char, index) => {
        output[index] = key.includes(char) ? `${key.indexOf(char)}` : '?';
        output[index] += ' '; // break character between letters
    });
    return output.join(''); // .trim();
}

const discreetArray = input => {
    if (typeof input !== 'object') throw 'SyntaxError: discreetArray() may only be used with arrays.';
    let output = input;
    input.forEach((item, index) => {
        output[index] = discreetanize(item);
    });
    return output;
}