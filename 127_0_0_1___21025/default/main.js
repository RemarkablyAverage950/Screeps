const manageSpawns = require('manageSpawns');
const manageCreeps = require('manageCreeps');
const roomPlanner = require('roomPlanner')
let MEMORY = require('memory');
require('prototypes');
require('RoomVisual');



module.exports.loop = function () {


    // Remove dead creeps from memory.
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            const roomName = Memory.creeps[name].home
            delete Memory.creeps[name];
            delete MEMORY.rooms[roomName].creeps[name]
            console.log('Cleared memory for ' + name)
        }
    }


    const myRooms = getMyRooms()


    for (const roomName of myRooms) {

        const room = Game.rooms[roomName];
        const creeps = Object.values(Game.creeps).filter(c => c.memory.home === roomName);

        manageMemory(room, creeps);
        roomPlanner(room);
        manageSpawns(room, creeps);
        manageCreeps(room, creeps);

    }

}

/**
 * Returns an array of names for rooms owned by me.
 * @returns {string[]}  
 */
function getMyRooms() {

    let myRooms = [];

    for (const roomName of Object.keys(Game.rooms)) {
        if (Game.rooms[roomName].controller.my) {

            myRooms.push(roomName);

        };
    };

    return myRooms;
}

/**
 * Initializes and maintains heap memory.
 * @param {Room} room 
 */
function manageMemory(room) {

    if (!MEMORY.rooms[room.name]) {
        InitializeRoom(room)
        console.log('Initialized MEMORY for ' + room.name)

    }

}

function InitializeRoom(room) {

    const sources = room.find(FIND_SOURCES)
    let sourceObjects = {};
    let minerNumber = 0;

    for (let source of sources) {

        sourceObjects[source.id] = {
            maxCreeps: source.maxCreeps(),
            container: source.getContainer(),
            minerNumber: minerNumber.toString(),
        };

        minerNumber++;
    }

    MEMORY.rooms[room.name] = {
        spawnQueue: [],
        spawnTimer: 0,
        creeps: {},
        tasks: {},
        sources: sourceObjects,
    }
}


