let MEMORY = require('memory');
let Task = require('manageCreeps')

class SignTask extends Task {
    /**
     * @constructor
     * @param {string} id Controller ID.
     * @param {string} str Sign text string.
     */
    constructor(id, str) {
        super('SIGN');
        this.id = id;
        this.str = str;
    }
}

function expansionManager(room) {


    if (!MEMORY.rooms[room.name].monitoredRooms) {
        getMonitoredRooms(room)
    }

    let monitoredRooms = MEMORY.rooms[room.name].monitoredRooms

    for (let r of Object.values(Game.rooms)) {

        let data = monitoredRooms[r.name]
        if (data) {
            // We have a monitored room

            if (!data.lastS || Game.time - data.lastScan > 100) {
                data = scanRoom(r)
                MEMORY.rooms[room.name].monitoredRooms[r.name] = data;
            }

        }
    }



}

/**
 * 
 * @param {Room} room 
 */
function scanRoom(room) {
    const sources = room.find(FIND_SOURCES).length;
    const mineral = room.find(FIND_MINERALS)[0];
    const controller = room.controller;
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS)
    let reserved = false;
    let hostileTarget = false;
    let occupied = false;
    let reservedBy = undefined;

    if (controller) {
        if (controller.reservation) {
            reserved = true;
            reservedBy = controller.reservation.username
            if (reservedBy !== MEMORY.username) {
                hostileTarget = true;
            }
        }
    }


    if (hostileCreeps.length > 0) {
        occupied = true;

        for(let creep of hostileCreeps){
            if(hostileTarget){}
            const body = creep.body
            for(let part of body){
                if(part.type === ATTACK || part.type === RANGED_ATTACK){
                    hostileTarget = true;
                    break;
                }
            }
        }

    }


    let data = {
        controller: controller,
        sources: sources,
        mineral: mineral,

    }
}

/**
 * Finds all rooms with linear distance of 10 from starting room and stores them in memory.
 * @param {Room} room 
 */
function getMonitoredRooms(room) {


    const RANGE = 10;
    let monitoredRoomNames = [];
    let monitoredRooms = {}

    let queue = [room.name];

    while (queue.length > 0) {

        let next = queue.pop();
        monitoredRoomNames.push(next)

        const neighbors = Object.values(Game.map.describeExits(next))

        for (let neighbor of neighbors) {
            if (monitoredRoomNames.some(r => r === neighbor)) {
                continue;
            }
            if (Game.map.getRoomLinearDistance(room.name, neighbor) <= RANGE) {
                queue.push(neighbor);
            }
        }
    }

    for (let name of monitoredRoomNames) {
        monitoredRooms[name] = {}
    }



    MEMORY.rooms[room.name].monitoredRooms = monitoredRooms;

}

function scoutManager() {
    const scouts = Object.values(Game.creeps).filter(c => c.memory.role === 'scout')

    for (let creep of scouts) {

        const home = creep.memory.home;

        let task = MEMORY.rooms[home].creeps[creep.name].task;

        const valid = validateScoutTask(creep, task);

        if (!valid) {

            assignScoutTask(creep);

        }

        executeScoutTask(creep);

    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {Task} task 
 */
function validateScoutTask(creep, task) {

}

/**
 * 
 * @param {Creep} creep 
 */
function assignScoutTask(creep) {

    const controller = creep.room.controller;

    if (controller) {

        const sign = controller.sign;

        if (!sign || sign.username !== MEMORY.username) {
            return new SignTask(controller.id, 'RA was here.')
        }

    }

}

/**
 * 
 * @param {Creep} creep 
 */
function executeScoutTask(creep) {

}


module.exports = {
    expansionManager,
}
