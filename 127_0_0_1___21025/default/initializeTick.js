let MEMORY = require('memory');


/**
 * Goes through memory and prepares it for new tick.
 * Cleans up dead creeps.
 */
function initializeTick() {

    for (const roomName in MEMORY.rooms) {
        const roomHeap = MEMORY.rooms[roomName];
        roomHeap.structures = undefined;
        roomHeap.droppedResources = undefined;
        roomHeap.creeps = undefined;
    }

    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            delete MEMORY.creeps[name];
        }
    }
    return true;
}

module.exports = initializeTick;