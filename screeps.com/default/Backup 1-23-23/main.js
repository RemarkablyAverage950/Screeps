let roleWorker = require('role.worker');
let roleMiner = require('role.miner');
let autoBuild = require('autobuild2');
let spawnCreeps = require('spawncreeps');
let taskManager = require('taskManager2')
let pathfinding = require('pathfinding');
let towers = require('towers');
let roleTransporter = require('role.transporter');
let roleSoldier = require('role.soldier')
let roleHealer = require('role.healer')
let roleScout = require('role.scout')
let expansionManager = require('expansionManager')
let roleRemoteWorker = require('role.remoteWorker')
let roleRemoteMiner = require('role.remoteMiner')
let roleRemoteTransporter = require('role.remoteTransporter');
const remoteTransporter = require('./role.remoteTransporter');
require('RoomVisual')
require('prototypes')



module.exports.loop = function () {
    clearCreepsFromMemory()

    const myRooms = findMyRooms();
    for (const room of myRooms) {
        let spawns = room.find(FIND_MY_SPAWNS)
        baseDefense(room)

        expansionManager.expansionManager(room)

        safeModeManagement(room)

        towers(room)

        autoBuild(room, spawns)

        let roomCreeps = Object.values(Game.creeps).filter(creep => creep.memory.home === room.name)
        spawnCreeps(room, roomCreeps, spawns)

        taskManager(room, roomCreeps)

        pathfinding.managePathfinding(room)

        runCreeps(roomCreeps)
        sandbox(room, roomCreeps)
    }

    // Generate pixels at bucket 90% full.
    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }
    //console.log(Game.cpu.getUsed(), Game.cpu.bucket)
};

function sandbox(room, creeps) {
    /*let structures = room.find(FIND_STRUCTURES).filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
    for (let structure of structures) {
        if (structure.assignedCreeps().length > 0) {
            console.log('ID:', structure.id, 'store:', structure.store[RESOURCE_ENERGY], 'forecast:', structure.forecast(RESOURCE_ENERGY))
        }
    }*/


}

/*
BODYPART_COST: {
        "move": 50,
        "work": 100,
        "attack": 80,
        "carry": 50,
        "heal": 250,
        "ranged_attack": 150,
        "tough": 10,
        "claim": 600
    },

    soldier block cost = 10+80+50

*/
function baseDefense(room) {
    const hostiles = room.find(FIND_HOSTILE_CREEPS)
    if (hostiles.length > 0) {
        let soldierHitPoints = Math.floor(room.energyCapacityAvailable / 140) * 90
        let target = Math.floor(_.sum(hostiles, h => h.hits))
        room.memory.targetSoldiers = Math.min(Math.ceil(target / soldierHitPoints), 3)
        room.memory.targetHealers = 1
    } else {
        room.memory.targetSoldiers = 0
        room.memory.targetHealers = 0
    }

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
 * @returns {Room[]} Array of room objects that I have a controller in.
 */
function findMyRooms() {
    // Get an array of all the rooms in the game
    // Filter the array to only include rooms with a controller owned by you
    let rooms = Object.values(Game.rooms).filter(room => room.controller && room.controller.my);

    // clear rooms I do not own from Memory.rooms
    for (let roomName in Memory.rooms) {
        if (!rooms.find(room => room.name === roomName)) {
            delete Memory.rooms[roomName];
            console.log(`Cleared ${roomName} from Memory.rooms.`);
        }
    }
    return rooms
}

/**
 * Activated safe mode if needed.
 * @param {Room} room 
 */
function safeModeManagement(room) {
    if (room.controller.safeMode || !room.controller.safeModeAvailable) return;

    let structures = room.find(FIND_STRUCTURES).filter(s =>
        s.structureType == STRUCTURE_SPAWN
        || s.structureType == STRUCTURE_STORAGE
        || s.structureType == STRUCTURE_TOWER
        || s.structureType == STRUCTURE_TERMINAL
        || s.structureType == STRUCTURE_OBSERVER
        || s.structureType == STRUCTURE_FACTORY
        || s.structureType == STRUCTURE_POWER_SPAWN
        || s.structureType == STRUCTURE_NUKER)

    for (let i in structures) {
        if (structures[i].hits < structures[i].hitsMax * 0.5) {
            room.controller.activateSafeMode();
            console.log(`Safe mode activated in ${room.name}`);
            break;
        }
    }
}

/**
 * Calls functions to operate creeps.
 * @param {Creep[]} creeps Creeps belonging to a room
 */
function runCreeps(creeps) {
    creeps.forEach(c => {
        const role = c.memory.role
        if (role == 'worker' || role == 'upgrader') {
            roleWorker.run(c)
        } else if (role == 'miner') {
            roleMiner.run(c)
        } else if (role == 'transporter') {
            roleTransporter.run(c)
        } else if (role == 'soldier') {
            roleSoldier.run(c)
        } else if (role == 'healer') {
            roleHealer.run(c)
        } else if (role == 'scout') {
            roleScout.run(c)
        } else if (role == 'remoteWorker') {
            roleRemoteWorker.run(c)
        } else if (role == 'remoteMiner') {
            roleRemoteMiner.run(c)
        }else if( role == 'remoteTransporter'){
            roleRemoteTransporter.run(c)
        }
    })
}