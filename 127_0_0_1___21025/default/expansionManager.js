let MEMORY = require('memory');
let { getBody, SpawnOrder } = require('manageSpawns');
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

class AssaultMission extends Mission {
    constructor(roomName) {
        super('ASSAULT');
        this.roomName = roomName
        this.unitsReq = undefined;
    }
}

class ScanData {
    constructor(roomName, homeRoom) {
        this.roomName = roomName
        this.homeRoom = homeRoom

        const room = Game.rooms[this.roomName];
        const controller = room.controller;
        const sources = room.find(FIND_SOURCES);
        const mineral = room.find(FIND_MINERALS)[0];
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);

        this.controller_id = controller ? controller.id : null;
        this.distance = Game.map.findRoute(this.homeRoom, this.roomName).length
        this.exitCount = Object.values(Game.map.describeExits(this.roomName)).length;
        this.lastScan = Game.time;
        this.level = controller ? controller.level : null;
        this.mineralType = mineral ? mineral.mineralType : null;
        this.owned = (controller && controller.owner) ? true : false;
        this.ownedBy = this.owned ? controller.owner.username : null;
        this.my = this.ownedBy === MEMORY.username ? true : false;
        this.reserved = (controller && controller.reservation) ? true : false;
        this.reservedBy = this.reserved ? controller.reservation.username : null;
        this.sources = sources.length ? sources.map(s => s.id) : null;



        let distanceRating = null;

        if (controller && sources.length && mineral) {
            distanceRating = 0;

            for (let source of sources) {
                distanceRating += controller.pos.getRangeTo(source)
            }
            distanceRating /= sources.length
            distanceRating += controller.pos.getRangeTo(mineral)
            distanceRating = 100 - distanceRating

        }


        let hostileTarget = false;
        if (hostileCreeps.length > 0) {
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

        this.distanceRating = distanceRating
        this.hostileTarget = hostileTarget
        this.occupied = ((this.reserved && this.reservedBy !== MEMORY.username)
            || this.owned && !this.my
            || this.hostileTarget) ? true : false;

    }

    update() {
        const room = Game.rooms[this.roomName];
        const controller = room.controller;
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);

        this.lastScan = Game.time;
        this.level = controller ? controller.level : null;
        this.owned = (controller && controller.owner) ? true : false;
        this.ownedBy = this.owned ? controller.owner.username : null;
        this.my = this.ownedBy === MEMORY.username ? true : false;
        this.reserved = (controller && controller.reservation) ? true : false;
        this.reservedBy = this.reserved ? controller.reservation.username : null;
        let hostileTarget = false;
        if (hostileCreeps.length > 0) {
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
        this.hostileTarget = hostileTarget
        this.occupied = ((this.reserved && this.reservedBy !== MEMORY.username)
            || this.owned && !this.my
            || this.hostileTarget) ? true : false;
    }

}


function expansionManager(myRooms) {

    if (!MEMORY.rooms) {
        return;
    }

    getMonitoredRooms(myRooms)


    let monitoredRooms = MEMORY.monitoredRooms

    let visibleRooms = Object.values(Game.rooms)
    for (let roomName of myRooms) {
        if (!MEMORY.rooms[roomName] || !MEMORY.rooms[roomName].monitoredRooms) {
            continue;
        }
        for (let r of visibleRooms) {

            if (MEMORY.rooms[roomName].monitoredRooms.some(mr => mr === r.name)) {
                let data = monitoredRooms[r.name]
                if (data) {
                    // We have a monitored room
                    if (!data.lastScan || Game.time - data.lastScan > 100) {
                        data = new ScanData(r.name, roomName)
                        MEMORY.monitoredRooms[r.name] = data;
                    }

                }
            }
        }

        // Expand outposts here
        const room = Game.rooms[roomName]
        let spawns = room.find(FIND_MY_SPAWNS)
        let maxRooms = 9;
        if (spawns.length === 1) {
            maxRooms = 3;
        }

        if (room.memory.outposts.length < maxRooms) {

            for (let i = 1; i <= 2; i++) {
                for (let r of Object.values(MEMORY.monitoredRooms)) {

                    if (r.lastScan === 0) {
                        continue;
                    }

                    let next = false;

                    for (let myRoom of myRooms) {
                        if (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.some(o => o === r.roomName)) {
                            next = true;
                            break;
                        }
                    }
                    if (next) {
                        continue;
                    }

                    if (r.distance === i && r.controller_id && !r.occupied && !r.my && !room.memory.outposts.some(o => o === r.roomName)) {

                        room.memory.outposts.push(r.roomName)
                        console.log(r.roomName, 'is now an outpost for', roomName)

                    }
                }
            }
        }
    }

    // Claim/Assault mission here

    let mission = MEMORY.mission;
    if (Game.time % 1 === 0 && (!mission || mission.complete)) {

        // Get a new mission (Mining outpost, claim new room, attack room)
        mission = getMission(myRooms)

        MEMORY.mission = mission;
    }

    if (mission) {

        // Check status.
        switch (mission.type) {
            case 'ASSAULT':
                let data = MEMORY.monitoredRooms[mission.roomName]

                if (!mission.unitsReq) {
                    let unitsReq = []
                    let targetRoom = Game.rooms[mission.roomName]

                    if (!targetRoom) {
                        //mission.unitsReq = [];
                    } else {

                        let hostiles = targetRoom.find(FIND_HOSTILE_CREEPS)
                        let hostileStructures = targetRoom.find(FIND_HOSTILE_STRUCTURES)


                        if (data.reserved && data.reservedBy === 'Invader' && hostiles.length === 0 && hostileStructures.length > 0) {
                       
                            let unit = 'soldier';


                            unitsReq.push(unit)
                        }
                    }

                    mission.unitsReq = unitsReq;

                }
                let soldierCount = 0;
                for (let c of Object.values(Game.creeps)) {
                    if (c.memory.role === 'soldier' && c.memory.assignedRoom === mission.roomName) {
                        soldierCount++;
                    }
                }
                for (let so of MEMORY.rooms[data.homeRoom].spawnQueue) {
                    if (so.role === 'soldier') {
                        soldierCount++
                    }
                }

                let targetSoldierCount = 0
                for (let role of mission.unitsReq) {
                    if (role === 'soldier') {
                        targetSoldierCount++;
                    }
                }
                let body = [];
                while (soldierCount < targetSoldierCount) {
                    if (body.length === 0) {
                        body = getBody.defender(Game.rooms[data.homeRoom].energyCapacityAvailable,undefined)
                    }
                    options = {
                        memory: {
                            role: 'soldier',
                            home: data.homeRoom,
                            assignedRoom: mission.roomName,
                        },
                    };
                    MEMORY.rooms[data.homeRoom].spawnQueue.push(new SpawnOrder('soldier', 6, body, options));
                    soldierCount++;
                }

                break;
            case 'CLAIM':

                break;
        }


    }

}


/**
 * Finds all rooms with linear distance of 10 from starting room and stores them in memory.
 * @param {Room} room 
 */
function getMonitoredRooms(myRooms) {
    const RANGE = 10;

    let monitoredRooms = MEMORY.monitoredRooms
    if (!monitoredRooms) {
        monitoredRooms = {}
    }

    for (let roomName of myRooms) {

        //console.log('Getting Monitored Rooms...')
        if (!MEMORY.rooms || !MEMORY.rooms[roomName]) {
            continue;
        }
        let monitoredRoomNames = MEMORY.rooms[roomName].monitoredRooms;

        if (!monitoredRoomNames) {
            monitoredRoomNames = [];
            let queue = [roomName];

            while (queue.length > 0) {

                let next = queue.pop();
                monitoredRoomNames.push(next)

                const neighbors = Object.values(Game.map.describeExits(next))

                for (let neighbor of neighbors) {
                    if (monitoredRoomNames.some(r => r === neighbor)) {
                        continue;
                    }
                    if (Game.map.getRoomLinearDistance(roomName, neighbor) <= RANGE) {
                        queue.push(neighbor);
                    }
                }
            }

            for (let name of monitoredRoomNames) {
                if (!monitoredRooms[name]) {
                    monitoredRooms[name] = { lastScan: 0 }
                }
            }

            MEMORY.rooms[roomName].monitoredRooms = monitoredRoomNames // [ monitoredRoomName[] ] 

        }
    }
    MEMORY.monitoredRooms = monitoredRooms;
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
function getMission(myRooms) {

    let monitoredRooms = MEMORY.monitoredRooms
    console.log('A', monitoredRooms.length, JSON.stringify(monitoredRooms))

    for (let data of Object.values(monitoredRooms)) {
        if (data.lastScan === 0) {
            continue;
        }
        console.log('B')
        for (let i = 1; i < 11; i++) {
            console.log('C', data.roomName, data.distance === i, data.occupied, !data.hostileTarget, data.reservedBy === 'Invader')
            if (data.distance === i && data.occupied && !data.hostileTarget && data.reservedBy === 'Invader') {
                console.log('Generating assault mission for', data.roomName)
                return new AssaultMission(data.roomName)
            }
        }

    }

    //console.log('Entering getMission')


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

        //  {"name":"W4N1","controller_id":"79ad0773ec3f021","sources":["b8e80773ec3d49f"],"mineralType":"K","hostileCreeps":0,"reserved":false,"hostileTarget":false,"occupied":false,"lastScan":382826,"owned":false,"my":false,"distance":3,"distanceRating":64}
        if (r.distance > 3 && r.controller_id && !r.occupied && !r.my) {


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

            potentialSettlements.push({
                roomName: r.name,
                score: score,
            })
        }
    }

    console.log('Potential Settlements:', JSON.stringify(potentialSettlements), potentialSettlements.length)

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
