const kernel = require('kernel');
const profiler = require('screeps-profiler');
let MEMORY = require('memory');

require('prototypes');
require('RoomVisual');

// Initialization code, if needed
//profiler.enable();
// Main game loop
module.exports.loop = function () {
    profiler.wrap(function () {
        kernel();
    })
};