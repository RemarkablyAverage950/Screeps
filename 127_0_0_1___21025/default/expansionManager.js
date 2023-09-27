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

class ClaimMission extends Mission {
    constructor(roomName) {
        super('CLAIM');
        this.roomName = roomName
    }
}

function expansionManager(room, myRooms) {


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
        mission = getMission(room, monitoredRooms, myRooms)

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
    const sources = room.find(FIND_SOURCES);
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
    let exitCount = Object.values(Game.map.describeExits(room.name)).length;
    let distanceRating = undefined
    if (controller) {
        distanceRating = 0;
      
        for (let source of sources) {
          
            distanceRating += controller.pos.getRangeTo(source)

        }
        distanceRating /= sources.length

        distanceRating += controller.pos.getRangeTo(mineral)

    }
    distanceRating = 100 - distanceRating

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
        sources: sources.map(s => s.id),
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
        exitCount: exitCount,
        distanceRating: distanceRating,


    }

    //console.log('Scanned room', room.name, ':', JSON.stringify(data))
    return data;
}

/**
 * Finds all rooms with linear distance of 10 from starting room and stores them in memory.
 * @param {Room} room 
 */
function getMonitoredRooms(room) {

    //console.log('Getting Monitored Rooms...')
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
        name: room.name,
        controller_id: controller_id,
        level: level,
        sources: sources.map(s => s.id),
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
        exitCount: exitCount,
        distanceRating: 100 - distanceRating,


    }
*/

/**
 * 
 * @param {Room} room 
 * @param {Object} monitoredRooms 
 */
function getMission(room, monitoredRooms, myRooms) {
    //console.log('Entering getMission')
    let spawns = room.find(FIND_MY_SPAWNS)
    let maxRooms = 9;
    if (spawns.length === 1) {
        maxRooms = 3;
    }

    if (room.memory.outposts.length < maxRooms) {

        for (let i = 1; i <= 2; i++) {
            for (let r of Object.values(monitoredRooms)) {
                if (r.lastScan === 0) {
                    continue;
                }

                let next = false;

                for (let myRoom of myRooms) {
                    if (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.some(o => o === r.name)) {
                        next = true;
                        break;
                    }
                }
                if (next) {
                    continue;
                }

                if (r.distance === i && r.controller_id && !r.occupied && !r.my && !room.memory.outposts.some(o => o === r.name)) {

                    room.memory.outposts.push(r.name)
                    console.log('Generating OutpostMission', r.name)
                    return new OutpostMission(r.name)

                }
            }

        }
    }

    // Find settlement target

    /*
        Go through all rooms and put rooms in array.

        If we have at least 10 to pick from give each room a score.
        start with 0, and give
        
            2 sources +50
            3 exits +50
            distanceRating + distanceRating ( larger is better )
            Resource we dont currently have
            distance from hostile room at least 2

    */


    let potentialSettlements = [];
    let ownedMinerals = [
        { constant: RESOURCE_HYDROGEN, count: 0 },
        { constant: RESOURCE_OXYGEN, count: 0 },
        { constant: RESOURCE_LEMERGIUM, count: 0 },
        { constant: RESOURCE_KEANIUM, count: 0 },
        { constant: RESOURCE_ZYNTHIUM, count: 0 },
        { constant: RESOURCE_UTRIUM, count: 0 },
        { constant: RESOURCE_CATALYST, count: 0 },
    ]


    for (let myRoom of myRooms) {
        let mineral = Game.rooms[myRoom].find(FIND_MINERALS)[0]
        ownedMinerals.find(m => m.constant === mineral.mineralType).count++
    }

    let min = Infinity
    for (let m of ownedMinerals) {
        if (m.count < min) {
            min = m.count
        }
    }
    let preferredMinerals = [];
    for (let m of ownedMinerals) {
        if (m.count === min) {
            preferredMinerals.push(m.constant)
        }
    }



    for (let r of Object.values(monitoredRooms)) {
        if (r.lastScan === 0) {
            continue;
        }
        let next = false;

        for (let myRoom of myRooms) {
            if (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.some(o => o === r.name)) {
                next = true;
                break;
            }
        }
        if (next) {
            continue;
        }
        console.log('A', JSON.stringify(r))
        //  {"name":"W4N1","controller_id":"79ad0773ec3f021","sources":["b8e80773ec3d49f"],"mineralType":"K","hostileCreeps":0,"reserved":false,"hostileTarget":false,"occupied":false,"lastScan":382826,"owned":false,"my":false,"distance":3,"distanceRating":64}
        if (r.distance > 3 && r.controller_id && !r.occupied && !r.my) {
            console.log('B')

            let score = 0;
            if (r.sources.length > 1) {
                score += 50;
            }
            if (r.exitCount > 2) {
                score += 50;
            }
            score += r.distanceRating

            let neighbors = Object.values(Game.map.describeExits(r.name))
            let preferred = true;
            for (let n of neighbors) {
                let neighborData = monitoredRooms[n];
                if (neighborData && neighborData.occupied || neighborData.my) {
                    preferred = false;
                }
            }

            if (preferredMinerals.some(m => m === r.mineralType)) {
                score += 50;
            }

            if (preferred) {
                score += 50;
            } else {
                score -= 50;
            }
            console.log('C', score)
            potentialSettlements.push({
                roomName: r.name,
                score: score,
            })
        }
    }

    console.log('D', JSON.stringify(potentialSettlements), potentialSettlements.length)

    if (potentialSettlements.length >= 10) {
        let bestTarget = _.max(potentialSettlements, s => s.score)
        console.log('Generating ClaimMission for', bestTarget.roomName)
        return new ClaimMission(bestTarget.roomName)
    }


    return undefined;
}



module.exports = {
    expansionManager,
}
