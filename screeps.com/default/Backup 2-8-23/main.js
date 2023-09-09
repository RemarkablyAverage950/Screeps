let roleWorker = require('role.worker2');
let roleMiner = require('role.miner');
const roleBuilder = require('role.builder')
let autoBuild = require('autobuild2');
let spawnCreeps = require('spawncreeps');
let taskManagerOld = require('taskManager2')
let { paths, resetMatricies } = require('pathfinding');
let towers = require('towers');
let roleHauler = require('role.hauler');
let roleSoldier = require('role.soldier')
let roleHealer = require('role.healer')
let roleScout = require('role.scout')
let expansionManager = require('expansionManager')
let roleRemoteWorker = require('role.remoteWorker2')
let roleRemoteMiner = require('role.remoteMiner')
let roleRemoteHauler = require('role.remoteHauler');
let roleReserver = require('role.reserver')
let roleClaimer = require('role.claimer')
let roleRemoteBuilder = require('role.remoteWorker')
const { roleHub } = require('role.hub')
const { roleFiller } = require('role.filler')
const { manageTasks } = require('tasks')
const roleWallBuilder = require('role.wallBuilder')
const linkManager = require('links')
const roleUpgrader = require('role.upgrader')
const roleMaintainer = require('role.maintainer')

require('RoomVisual')
require('prototypes')
let start = true

module.exports.loop = function () {
    if (start) {
        if (Game.cpu.bucket < 100) {
            return
        } else {
            start = false
        }
    }
    clearCreepsFromMemory()
    resetMatricies()
    const myRooms = findMyRooms();
    for (const room of myRooms) {


        let spawns = room.find(FIND_MY_SPAWNS)
        if (spawns.length == 0) {
            if (room.find(FIND_MY_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_SPAWN).length == 0) {
                const flags = Object.values(Game.flags).filter(flag => flag.room && flag.room.name === room.name && flag.name === 'spawn');
                if (flags.length > 0) {
                    const spawnFlag = flags[0];
                    const result = room.createConstructionSite(spawnFlag.pos, STRUCTURE_SPAWN);
                    if (result === OK) {
                        console.log("Spawn construction site created successfully at flag 'spawn' location");
                    } else {
                        console.log("Error creating spawn construction site: " + result);
                    }
                }
            }
            continue
        }
        baseDefense(room)
        expansionManager.expansionManager(room)
        safeModeManagement(room)
        towers(room)
        linkManager(room)
        autoBuild(room, spawns)
        let roomCreeps = Object.values(Game.creeps).filter(creep => creep.memory.home === room.name && !creep.spawning)
        manageTasks(room, roomCreeps)
        spawnCreeps(room, roomCreeps, spawns)
        taskManagerOld(room, roomCreeps)
        //pathfinding.managePathfinding(room)

        runCreeps(roomCreeps)
        sandbox(room, roomCreeps)
    }

    // Generate pixels at bucket 90% full.
    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }
    console.log(Game.cpu.getUsed(), Game.cpu.bucket)


};


function sandbox(room, creeps) {


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
            let room = Memory.creeps[name].home
            delete Memory.creeps[name];
            if (paths[room] && paths[room][name]) {
                delete paths[room][name]
            }
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
        if (role == 'worker') {
            roleWorker.run(c)
        } else if (role == 'filler') {
            roleFiller.run(c)
        } else if (role == 'miner') {
            roleMiner.run(c)
        } else if (role == 'upgrader') {
            roleUpgrader.run(c)
        } else if (role == 'builder') {
            roleBuilder.run(c)
        } else if (role == 'hauler') {
            roleHauler.run(c)
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
        } else if (role == 'remoteHauler') {
            roleRemoteHauler.run(c)
        } else if (role == 'reserver') {
            roleReserver.run(c)
        } else if (role == 'claimer') {
            roleClaimer.run(c)
        } else if (role == 'hub') {
            roleHub.run(c)
        } else if (role == 'wallBuilder') {
            roleWallBuilder.run(c)
        } else if (role == 'maintainer') {
            roleMaintainer.run(c)
        }
    })
}