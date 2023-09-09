let roleWorker = require('role.worker');
let roleMiner = require('role.miner');
let autoBuild = require('autobuild2');
let spawnCreeps = require('spawncreeps');
let taskManager = require('tasks')
let pathfinding = require('pathfinding');
let towers = require('towers');
let roleTransporter = require('role.transporter');



module.exports.loop = function () {
    clearCreepsFromMemory()
    const myRooms = findMyRooms();
    for (const room of myRooms) {
        let spawns = room.find(FIND_MY_SPAWNS)
        towers(room)
        autoBuild(room, spawns)
        let roomCreeps = room.find(FIND_MY_CREEPS).filter(c => c.memory.home === room.name)
        spawnCreeps(room, roomCreeps, spawns)
        taskManager(room, roomCreeps)
        pathfinding.managePathfinding(room)
        runCreeps(roomCreeps)
    }
    // generate pixels
};

/**
 * @returns {Room[]} Array of room objects that I have a controller in.
 */
function findMyRooms() {
    // Get an array of all the rooms in the game
    let rooms = Object.values(Game.rooms);
    // Filter the array to only include rooms with a controller owned by you
    return rooms.filter(room => room.controller && room.controller.my);
}

/**
 * Clears dead creeps from memory.
 */
function clearCreepsFromMemory() {
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            // Clear path from memory.
        }
    }

}

/**
 * Calls functions to operate creeps.
 * @param {Creep[]} creeps Creeps belonging to a room
 */
function runCreeps(creeps) {
    creeps.forEach(c => {
        if (c.memory.role == 'worker' || c.memory.role == 'upgrader') {
            roleWorker.run(c)
        } else if (c.memory.role == 'miner') {
            roleMiner.run(c)
        }else if (c.memory.role == 'transporter'){
            roleTransporter.run(c)
        }

    })
}