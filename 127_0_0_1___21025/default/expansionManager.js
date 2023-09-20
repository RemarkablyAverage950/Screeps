let MEMORY = require('memory');
let { Task } = require('manageCreeps')

class Mission {
    constructor(type) {
        this.type = type;
        this.complete = false;
    }
}

class OutpostMission extends Mission {
    constructor(roomName) {
        super('OUTPOST');
        this.planned = false;
        this.roomName = roomName
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

            if (!data.lastScan || Game.time - data.lastScan > 100) {
                data = scanRoom(r, room.name)
                MEMORY.rooms[room.name].monitoredRooms[r.name] = data;
            }

        }
    }

    let mission = MEMORY.rooms[room.name].mission;
    if (Game.time % 100 === 0 && (!mission || mission.complete)) {

        // Get a new mission (Mining outpost, claim new room, attack room)
        mission = getMission(room, monitoredRooms)

        MEMORY.rooms[room.name].mission = mission;
    }

    if (mission) {

        // Check status.

        // Create tasks if needed.

    }

}

/**
 * 
 * @param {Room} room 
 * @param {string} homeRoom The name of the home room.
 */
function scanRoom(room, homeRoom) {
    const lastScan = Game.time;
    const sources = room.find(FIND_SOURCES).map(s => s.id);
    const mineral = room.find(FIND_MINERALS)[0];
    let mineralType = undefined;
    if (mineral) {
        mineralType = mineral.mineralType
    }
    const controller = room.controller;
    let controller_id = undefined;
    let level = undefined;
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS)
    let reserved = false;

    let occupied = false;
    let reservedBy = undefined;
    let owned = false;
    let ownedBy = undefined;
    let my = false;
    let distance = Game.map.findRoute(homeRoom, room.name).length;

    let hostileTarget = false;

    if (controller) {
        controller_id = controller.id;
        if (controller.owner) {
            ownedBy = controller.owner
            owned = true;
            level = controller.level;
            if (controller.my) {
                my = true;
            } else {
                hostileTarget = true;
                occupied = true;
            }
        } else if (controller.reservation) {
            reserved = true;
            reservedBy = controller.reservation.username
            if (reservedBy !== MEMORY.username) {
                hostileTarget = true;
                occupied = true;
            }
        }
    }


    if (hostileCreeps.length > 0) {
        occupied = true;

        for (let creep of hostileCreeps) {
            if (hostileTarget) { break; }
            const body = creep.body
            for (let part of body) {
                if (part.type === ATTACK || part.type === RANGED_ATTACK) {
                    hostileTarget = true;
                    break;
                }
            }
        }
    }


    let data = {
        name: room.name,
        controller_id: controller_id,
        level: level,
        sources: sources,
        mineralType: mineralType,
        hostileCreeps: hostileCreeps.length,
        reserved: reserved,
        hostileTarget: hostileTarget,
        occupied: occupied,
        reservedBy: reservedBy,
        lastScan: lastScan,
        owned: owned,
        ownedBy: ownedBy,
        my: my,
        distance: distance,

    }

    console.log('Scanned room', room.name, ':', JSON.stringify(data))
    return data;
}

/**
 * Finds all rooms with linear distance of 10 from starting room and stores them in memory.
 * @param {Room} room 
 */
function getMonitoredRooms(room) {

    console.log('Getting Monitored Rooms...')
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
        monitoredRooms[name] = { lastScan: 0 }
    }



    MEMORY.rooms[room.name].monitoredRooms = monitoredRooms;

}

/*
    let data = {
        controller: controller,
        sources: sources,
        mineral: mineral,
        hostileCreeps: hostileCreeps,
        reserved: reserved,
        hostileTarget: hostileTarget,
        occupied: occupied,
        reservedBy: reservedBy,
        lastScan: lastScan,
        owned: owned,
        ownedBy: ownedBy,
        my: my,
        distance: distance,
    }
*/

/**
 * 
 * @param {Room} room 
 * @param {Object} monitoredRooms 
 */
function getMission(room, monitoredRooms) {
    console.log('Entering getMission')


    for (let i = 1; i <= 2; i++) {
        for (let r of Object.values(monitoredRooms)) {
            if (r.lastScan === 0) {
                continue;
            }
          
            if (r.distance === i && r.controller_id && !r.occupied  && !r.my && !room.memory.outposts.some(o => o === r.name)) {

                //room.memory.outposts.push(r.name)
                MEMORY.rooms[room.name].outposts[r.name] = {
                    plans: undefined,
                    sources: r.sources,
                }
                console.log('Generating OutpostMission', r.name)
                return new OutpostMission(r.name)

            }
        }

    }

    return undefined;
}



module.exports = {
    expansionManager,
}
