// main.js (entry point)
const { loop } = require('./scheduler'); // Adjust the path accordingly
const profiler = require('screeps-profiler');

require('prototypes');
require('RoomVisual');

// Initialization code, if needed
profiler.enable();
// Main game loop
module.exports.loop = function () {
    profiler.wrap(function() {
    loop();
    })
};