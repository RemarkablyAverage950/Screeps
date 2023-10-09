const { manageSpawns, getBody, SpawnOrder } = require('manageSpawns');
const { manageCreeps } = require('manageCreeps');
const roomPlanner = require('roomPlanner');
const { expansionManager } = require('expansionManager');
const manageTowers = require('manageTowers');
const manageLinks = require('manageLinks');
const outpostManager = require('outpostManager');
const manageRoomDefense = require('manageRoomDefense')
const manageTerminals = require('manageTerminals')
let MEMORY = require('memory');
require('prototypes');
require('RoomVisual');



module.exports.loop = function () {
    /*let rn = 'W5N1'
    delete Memory.rooms[rn].outposts
    delete Memory.rooms[rn].plans
    */

    // Remove dead creeps from memory.
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            const roomName = Memory.creeps[name].home
            delete Memory.creeps[name];
            if (MEMORY.rooms[roomName]) {
                delete MEMORY.rooms[roomName].creeps[name]
            }
            //console.log('Cleared memory for ' + name)
        }
    }


    const myRooms = getMyRooms()

    manageTerminals(myRooms);
    expansionManager(myRooms);

    for (const roomName of myRooms) {

        const room = Game.rooms[roomName];
        const creeps = Object.values(Game.creeps).filter(c => c.memory.home === roomName);

        if (room.controller.level < 2 || room.find(FIND_MY_SPAWNS).length === 0) {

            let closest = _.min(myRooms.filter(r => r != roomName), r => Game.map.findRoute(roomName, r).length)
            if (closest) {
                let targetRemoteBuilderCount = 5;

                let remoteBuilderCount = Object.values(Game.creeps).filter(c => c.memory.home === closest && c.memory.role === 'remoteBuilder' && c.memory.assignedRoom === roomName)
                let spawnQueue = MEMORY.rooms[closest].spawnQueue
                for (let so of spawnQueue) {
                    if (so.role === 'remoteBuilder' && so.options.memory.assignedRoom === roomName) {
                        remoteBuilderCount++;
                    }
                }

                body = [];
                while (remoteBuilderCount < targetRemoteBuilderCount) {
                    body = getBody.remoteBuilder(Game.rooms[closest].energyCapacityAvailable, Game.rooms[closest], 0)

                    options = {
                        memory: {
                            role: 'remoteBuilder',
                            home: closest,
                            assignedRoom: roomName,
                        },
                    };
                    console.log('Ordering remote builder for', room.name, 'from', closest)
                    spawnQueue.push(new SpawnOrder('remoteBuilder', 5, body, options));
                    remoteBuilderCount++;
                }
            }

        }



        manageMemory(room, creeps);
        manageRoomDefense(room);
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

            if (!MEMORY.rooms[roomName]) {
                InitializeRoom(Game.rooms[roomName])
                console.log('Initialized MEMORY for ' + roomName)

            }

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
    }
}


