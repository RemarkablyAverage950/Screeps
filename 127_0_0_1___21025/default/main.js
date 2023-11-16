let {MEMORY, initializeMemory } = require('memory');

const roomManager = require('roomManager')

require('prototypes');
require('RoomVisual');

let start = false;

module.exports.loop = function () {
  
    // Wait for bucket to buffer before starting.
    if (!start) {
        if (Game.cpu.bucket > 499) {
            start = true;
            
        } else {
            console.log('Initializing bucket:', Game.cpu.bucket, '/500')
            return;
        }
    }

    // Delete dead creeps from memory.
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            const roomName = Memory.creeps[name].home
            delete Memory.creeps[name];
            if (MEMORY.rooms[roomName]) {
                delete MEMORY.rooms[roomName].creeps[name]
            }
        }
    }

    const myRooms = getMyRooms()


    for (const roomName of myRooms) {

        roomManager(roomName)

    }

    if ('generatePixel' in Game.cpu && Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }
}

/**
 * Returns an array of names for rooms owned by me.
 * @returns {string[]}  
 */
function getMyRooms() {

    let myRooms = [];

    for (const roomName of Object.keys(Game.rooms)) {
        if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {

            myRooms.push(roomName);

            /*if (!MEMORY.rooms[roomName]) {
                InitializeRoom(Game.rooms[roomName])
                console.log('Initialized MEMORY for ' + roomName)

            }*/

        };
    };

    for (const roomName of Object.keys(Memory.rooms)) {
        if (!myRooms.some(r => r === roomName)) {
            delete Memory.rooms[roomName]
        }
    }

    return myRooms;
}

/**
 * Initializes and maintains heap memory.
 * @param {Room} room 
 */
function manageMemory(room, creeps) {

    if (!MEMORY.rooms[room.name]) {
        InitializeRoom(room)
        console.log('Initialized MEMORY for ' + room.name)

    }

    for (let creep of creeps) {
        // initialize creep memory if nescessary.
        if (!MEMORY.rooms[room.name].creeps[creep.name]) {

            initializeCreepMemory(creep)

        }
    }

}

/**
 * Initializes heap memory for an individual creep.
 * @param {Creep} creep 
 */
function initializeCreepMemory(creep) {

    MEMORY.rooms[creep.memory.home].creeps[creep.name] = {
        moving: true,
        tasks: [],
        path: undefined,
    }
};

function InitializeRoom(room) {

    const sources = room.find(FIND_SOURCES)
    let sourceObjects = {};
    let minerNumber = 0;

    if (!room.memory.outposts) {
        room.memory.outposts = [];

    }

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
        outposts: {},
        missions: [],
    }
}


