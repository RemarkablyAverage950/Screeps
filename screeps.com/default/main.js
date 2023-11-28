const { manageSpawns, getBody, SpawnOrder } = require('manageSpawns');
const { manageCreeps } = require('manageCreeps');
const roomPlanner = require('roomPlanner');
const { expansionManager } = require('expansionManager');
const manageTowers = require('manageTowers');
const manageLinks = require('manageLinks');
const outpostManager = require('outpostManager');
const manageRoomDefense = require('manageRoomDefense');
const manageTerminals = require('manageTerminals');
const manageLabs = require('manageLabs');
const managePowerSpawn = require('managePowerSpawn')
const manageNukes = require('manageNukes');
let MEMORY = require('memory');
const manageObserver = require('manageObserver');
const manageMarket = require('manageMarket')
require('prototypes');
require('RoomVisual');


let start = false;
module.exports.loop = function () {
    /*if (Game.time % 15000 === 0) {

        console.log('Resetting memory')

        MEMORY = {
            rooms: {},
            
        };
        return;
    }*/

    if (!start) {

        if (Game.cpu.bucket > 499) {

            start = true;
        } else {
            console.log('Initializing bucket:', Game.cpu.bucket, '/500')
            return;
        }
    }

    //Game.rooms['W58S32'].memory.outposts.push('W58S31')
    /*let rn = 'W5N1'
    delete Memory.rooms[rn].outposts
    delete Memory.rooms[rn].plans
    */

    // Remove dead creeps from memory.
    //let cpuStart = Game.cpu.getUsed()
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
    //console.log('Deleting creeps from memory',Game.cpu.getUsed()-cpuStart)
    //cpuStart = Game.cpu.getUsed()

    const myRooms = getMyRooms()
    //console.log('Getting Rooms',Game.cpu.getUsed()-cpuStart)
    //cpuStart = Game.cpu.getUsed()
    manageMarket(myRooms);
    manageTerminals(myRooms);
    //console.log('Managing terminals',Game.cpu.getUsed()-cpuStart)
    //cpuStart = Game.cpu.getUsed()
    expansionManager(myRooms);
    //console.log('Expansion Manager',Game.cpu.getUsed()-cpuStart)
    manageNukes(myRooms)

    for (const roomName of myRooms) {
        //console.log('Room',roomName)
        if (Game.cpu.bucket < 100) {
            console.log('Breaking out of main for CPU Bucket')
            break;
        }
        const room = Game.rooms[roomName];

        const creeps = Object.values(Game.creeps).filter(c => c.memory.home === roomName);

        if (Game.time % 20 === 0 && room.controller.level < 2 || room.find(FIND_MY_SPAWNS).length === 0) {

            let closest = _.min(myRooms.filter(r => r != roomName && Game.rooms[r].controller.level > 3), r => Game.map.findRoute(roomName, r).length)

            if (closest !== Infinity) {
                let targetRemoteBuilderCount = 5;

                let remoteBuilderCount = Object.values(Game.creeps).filter(c => c.memory.home === closest && c.memory.role === 'remoteBuilder' && c.memory.assignedRoom === roomName).length
                let spawnQueue = MEMORY.rooms[closest].spawnQueue
                for (let so of spawnQueue) {
                    if (so.role === 'remoteBuilder' && so.options.memory.assignedRoom === roomName) {
                        remoteBuilderCount++;
                    }
                }

                body = [];
                while (remoteBuilderCount < targetRemoteBuilderCount) {
                    body = getBody.remoteBuilder(Game.rooms[closest].energyCapacityAvailable, Game.rooms[closest], 0) // budget, room, conserveEnergy

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
        /*
        let structures = room.find(FIND_STRUCTURES)
        let energy = 0;
        let dropped = room.find(FIND_DROPPED_RESOURCES)
        for (let s of structures) {
            if (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) {
                energy += s.store[RESOURCE_ENERGY]
                if (energy > 5000) {
                    break;
                }
            }
        }
        if (energy < 5000) {
            for (let d of dropped) {
                if (d.resourceType === RESOURCE_ENERGY) {
                    energy += d.amount
                }
            }
        }

        if (energy < 5000) {
            // Request energy be brought over.
            MEMORY.rooms[roomName].needEnergy = true;
        } else {
            MEMORY.rooms[roomName].needEnergy = false;
        }
        */

        //cpuStart = Game.cpu.getUsed()
        manageMemory(room, creeps);
        //console.log('manageMemory',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        manageRoomDefense(room);
        //console.log('manageRoomDefense',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        outpostManager(room, creeps);
        //console.log('outpostManager',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        manageLinks(room);
        //console.log('manageLinks',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        roomPlanner(room);
        //console.log('roomPlanner',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        manageTowers(room);
        //console.log('manageTowers',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        manageSpawns(room, creeps);
        //console.log('manageSpawns',Game.cpu.getUsed()-cpuStart)
        //cpuStart = Game.cpu.getUsed()
        manageLabs(room)
        managePowerSpawn(room)
        manageCreeps(room, creeps);
        //console.log('manageCreeps',Game.cpu.getUsed()-cpuStart)

        if (room.controller.level === 8) {
            manageObserver(room)
        }

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
        missions: [],
    }
}


