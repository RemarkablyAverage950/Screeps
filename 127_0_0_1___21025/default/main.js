const { manageSpawns } = require('manageSpawns');
const { manageCreeps } = require('manageCreeps');
const roomPlanner = require('roomPlanner');
const { expansionManager } = require('expansionManager');
const manageTowers = require('manageTowers');
const manageLinks = require('manageLinks');
const outpostManager = require('outpostManager');
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
            //console.log('Cleared memory for ' + name)
        }
    }


    const myRooms = getMyRooms()

    expansionManager(myRooms);

    for (const roomName of myRooms) {

        const room = Game.rooms[roomName];
        const creeps = Object.values(Game.creeps).filter(c => c.memory.home === roomName);

        manageMemory(room, creeps);
        outpostManager(room, creeps);
        manageLinks(room);
        roomPlanner(room);
        manageTowers(room);
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
        if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {

            myRooms.push(roomName);

        };
    };

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
        task: undefined,
        path: undefined,
    }
};

function InitializeRoom(room) {

    const sources = room.find(FIND_SOURCES)
    let sourceObjects = {};
    let minerNumber = 0;

    if (!room.memory.outposts) {
        room.memory.outposts = {};
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
    }
}


