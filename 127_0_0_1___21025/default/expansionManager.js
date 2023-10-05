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
    constructor(roomName, myRooms) {
        this.roomName = roomName

        let minDist = Infinity
        for (let rName of myRooms) {
            let distance = Game.map.findRoute(rName, this.roomName).length
            if (distance < minDist) {
                minDist = distance
                this.distance = distance
                this.homeRoom = rName
            }
        }


        const room = Game.rooms[this.roomName];
        const controller = room.controller;
        const sources = room.find(FIND_SOURCES);
        const mineral = room.find(FIND_MINERALS)[0];
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);

        let invaderCore = false
        let towers = false;
        for (let s of hostileStructures) {
            if (s.structureType === STRUCTURE_INVADER_CORE) {
                invaderCore = true;
            } else if (s.structureType === STRUCTURE_TOWER) {
                towers = true;
            }

        }
        this.towers = towers
        this.invaderCore = invaderCore


        this.controller_id = controller ? controller.id : null;

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



        let rating = null;

        if (controller && sources.length && mineral) {
            rating = 0
            rating += 25 * this.exitCount
            let distanceRating = 0;

            if (sources.length == 2) {
                rating += 500;
            }

            for (let source of sources) {
                distanceRating += controller.pos.getRangeTo(source)
            }
            distanceRating /= sources.length
            distanceRating += controller.pos.getRangeTo(mineral) * .5
            distanceRating = (100 - distanceRating) * 2
            rating += distanceRating;

            const terrain = new Room.Terrain(this.roomName)
            let swamps = 0;
            let plains = 0
            for (let x = 0; x < 50; x++) {
                for (let y = 0; y < 50; y++) {
                    const t = terrain.get(x, y)
                    if (t === 2) {
                        swamps++;
                    } else if (t === 0) {
                        plains++;
                    }
                }
            }

            rating += 100 * ((plains + swamps) / 2500)

            // 100 * (100 / (100+50))
            rating += (100 * (plains / (plains + swamps)))


            let exits = Object.values(Game.map.describeExits(this.roomName))

            for (let exitRoom of exits) {
                let erData = MEMORY.monitoredRooms[exitRoom]
                if (erData && erData.lastScan !== 0 && !erData.occupied && !erData.reserved) {
                    rating += 100;
                    if (erData.sources) {
                        for (let i = 0; i < erData.sources.length; i++) {
                            rating += 25;
                        }
                    }

                }
            }

        }
        let hostileTarget = false;
        if (towers) {
            hostileTarget = true;
        }

        if (!hostileTarget && hostileCreeps.length > 0) {
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

        this.rating = rating
        this.hostileTarget = hostileTarget
        this.occupied = hostileTarget || hostileStructures.length || (this.reserved && this.reservedBy !== MEMORY.username) ? true : false;

    }

    update(myRooms) {
        const room = Game.rooms[this.roomName];
        const controller = room.controller;
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);

        let invaderCore = false
        let towers = false;
        for (let s of hostileStructures) {
            if (s.structureType === STRUCTURE_INVADER_CORE) {
                invaderCore = true;
            } else if (s.structureType === STRUCTURE_TOWER) {
                towers = true;
            }

        }
        this.towers = towers
        this.invaderCore = invaderCore

        const sources = room.find(FIND_SOURCES)
        const mineral = room.find(FIND_MINERALS)[0]
        let minDist = Infinity
        for (let rName of myRooms) {
            let distance = Game.map.findRoute(rName, this.roomName).length
            if (distance < minDist) {
                minDist = distance
                this.distance = distance
                this.homeRoom = rName
            }
        }

        this.lastScan = Game.time;
        this.level = controller ? controller.level : null;
        this.owned = (controller && controller.owner) ? true : false;
        this.ownedBy = this.owned ? controller.owner.username : null;
        this.my = this.ownedBy === MEMORY.username ? true : false;
        this.reserved = (controller && controller.reservation) ? true : false;
        this.reservedBy = this.reserved ? controller.reservation.username : null;
        let hostileTarget = false;
        if (towers) {
            hostileTarget = true;
        }

        if (!hostileTarget && hostileCreeps.length > 0) {
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
        let rating = null;

        if (controller && sources.length && mineral) {
            rating = 0
            rating += 25 * this.exitCount
            let distanceRating = 0;

            if (sources.length == 2) {
                rating += 500;
            }

            for (let source of sources) {
                distanceRating += controller.pos.getRangeTo(source)
            }
            distanceRating /= sources.length
            distanceRating += controller.pos.getRangeTo(mineral) * .5
            distanceRating = 100 - distanceRating
            rating += distanceRating;

            const terrain = new Room.Terrain(this.roomName)
            let swamps = 0;
            let plains = 0
            for (let x = 0; x < 50; x++) {
                for (let y = 0; y < 50; y++) {
                    const t = terrain.get(x, y)
                    if (t === 2) {
                        swamps++;
                    } else if (t === 0) {
                        plains++;
                    }
                }
            }

            rating += 100 * ((plains + swamps) / 2500)

            // 100 * (100 / (100+50))
            rating += (100 * (plains / (plains + swamps)))


            let exits = Object.values(Game.map.describeExits(this.roomName))

            for (let exitRoom of exits) {
                let erData = MEMORY.monitoredRooms[exitRoom]
                if (erData && erData.lastScan !== 0 && !erData.occupied && !erData.reserved) {
                    rating += 100;
                    if (erData.sources) {
                        for (let i = 0; i < erData.sources.length; i++) {
                            rating += 25;
                        }
                    }
                }
            }

        }

        this.hostileTarget = hostileTarget
        this.occupied = hostileTarget || hostileStructures.length || (this.reserved && this.reservedBy !== MEMORY.username) ? true : false;
        this.rating = rating;
    }

}


function expansionManager(myRooms) {

    if (!MEMORY.rooms) {
        return;
    }

    //delete Memory.rooms['W5N1'].outposts

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
                    if (!data.lastScan) {
                        data = new ScanData(r.name, myRooms)
                        //console.log('DataCreated',JSON.stringify(data))
                        MEMORY.monitoredRooms[r.name] = data;
                    } else {
                        if (Game.time - data.lastScan > 100) {
                            data.update(myRooms)
                            // console.log('DataUpdated',JSON.stringify(data))
                        }
                    }

                    MEMORY.monitoredRooms[r.name] = data;
                }
            }
        }


        // Expand outposts here
        const room = Game.rooms[roomName]
        if (!room) {
            return;
        }
        let spawns = room.find(FIND_MY_SPAWNS)
        let maxRooms = 9;
        let maxRange = 2;


        if (spawns.length === 1) {
            maxRooms = 3;
        }
        if (!room.storage) {
            maxRange = 1;
        }

        if (room.memory.outposts && room.memory.outposts.length < maxRooms) {

            for (let i = 1; i <= maxRange; i++) {
                for (let r of Object.values(MEMORY.monitoredRooms)) {

                    if (r.lastScan === 0) {
                        continue;
                    }

                    let next = false;

                    for (let myRoom of myRooms) {
                        if (Game.rooms[myRoom].memory.outposts.length && Game.rooms[myRoom].memory.outposts.some(o => o === r.roomName)) {
                            next = true;
                            break;
                        }
                    }
                    if (next) {
                        continue;
                    }

                    if (roomName === r.homeRoom && r.distance === i && r.controller_id && !r.occupied && !r.my && !room.memory.outposts.some(o => o === r.roomName)) {

                        room.memory.outposts.push(r.roomName)
                        console.log(r.roomName, 'is now an outpost for', roomName)
                        return;
                    }
                }
            }
        }
    }

    // Claim/Assault mission here

    let mission = MEMORY.mission;
    if (Game.time % 100 === 0 && (!mission || mission.complete)) {
        //console.log('Getting Mission')
        // Get a new mission (Mining outpost, claim new room, attack room)
        mission = getMission(myRooms)

        MEMORY.mission = mission;
    }

    if (mission) {
        //console.log('tick, mission', Game.time, JSON.stringify(mission))
        let body = [];
        let data = MEMORY.monitoredRooms[mission.roomName]
        // Check status.
        switch (mission.type) {
            case 'ASSAULT':


                if (!mission.unitsReq) {
                    //console.log('Getting units required')
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
                    if (c.memory.role === 'soldier' && data.homeRoom === c.memory.home) {
                        if (c.memory.assignedRoom === mission.roomName) {
                            soldierCount++;
                        } else if (c.memory.assignedRoom === undefined) {
                            console.log('reassigning', creep.name, 'to', 'mission.roomName')
                            c.memory.assignedRoom = mission.roomName
                            return;
                        }
                    }
                }
                for (let so of MEMORY.rooms[data.homeRoom].spawnQueue) {
                    if (so.role === 'soldier' && so.options.memory.assignedRoom === mission.roomName) {
                        soldierCount++
                    }
                }

                let targetSoldierCount = 0
              
                for (let role of mission.unitsReq) {
                    if (role === 'soldier') {
                        targetSoldierCount++;
                    }
                }
                //console.log('sc',soldierCount,'tsc',targetSoldierCount)
                body = [];
                while (soldierCount < targetSoldierCount) {
                    if (body.length === 0) {
                        //console.log('Getting Body')
                        body = getBody.defender(Game.rooms[data.homeRoom].energyCapacityAvailable, undefined)
                        //console.log('Got body', JSON.stringify(body))
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
                let room = Game.rooms[mission.roomName]
                let targetClaimerCount = 0;
                let claimerCount = 0;
                if (!room || !room.controller.my) {
                    targetClaimerCount++;

                    for (let creep of Object.values(Game.creeps)) {
                        if (creep.memory.role === 'claimer' && creep.memory.assignedRoom === mission.roomName) {
                            claimerCount++;
                        }
                    }
                    for (let so of MEMORY.rooms[data.homeRoom].spawnQueue) {
                        if (so.role === 'claimer' && so.assignedRoom === mission.roomName) {
                            claimerCount++
                        }
                    }



                    body = [];
                    while (claimerCount < targetClaimerCount) {
                        if (body.length === 0) {
                            body = getBody.reserver(Game.rooms[data.homeRoom].energyCapacityAvailable)
                        }
                        options = {
                            memory: {
                                role: 'claimer',
                                home: data.homeRoom,
                                assignedRoom: mission.roomName,
                            },
                        };
                        MEMORY.rooms[data.homeRoom].spawnQueue.push(new SpawnOrder('claimer', 6, body, options));
                        claimerCount++;
                    }
                }
                if (room && room.find(FIND_HOSTILE_CREEPS).length > 0) {
                    let soldierCount = 0;
                    for (let c of Object.values(Game.creeps)) {
                        if (c.memory.role === 'soldier' && c.memory.assignedRoom === mission.roomName) {
                            soldierCount++;
                        }
                    }
                    for (let so of MEMORY.rooms[data.homeRoom].spawnQueue) {
                        if (so.role === 'soldier' && so.assignedRoom === mission.roomName) {
                            soldierCount++
                        }
                    }

                    let targetSoldierCount = 1

                    body = [];
                    while (soldierCount < targetSoldierCount) {
                        if (body.length === 0) {
                            body = getBody.defender(Game.rooms[data.homeRoom].energyCapacityAvailable, undefined)
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
                }

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
            monitoredRoomNames = [roomName];
            let queue = [...Object.values(Game.map.describeExits(roomName))];

            while (queue.length > 0) {

                let next = queue.pop();
                const neighbors = Object.values(Game.map.describeExits(next))

                for (let neighbor of neighbors) {
                    if (monitoredRoomNames.includes(neighbor)) {
                        continue;
                    }
                    if (Game.map.getRoomLinearDistance(roomName, neighbor) <= RANGE) {
                        queue.push(neighbor);
                        monitoredRoomNames.push(neighbor)
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


    for (let data of Object.values(monitoredRooms)) {
        if (data.lastScan === 0) {
            continue;
        }

        for (let i = 1; i < 11; i++) {

            if (data.distance === i && data.occupied && !data.hostileTarget && data.reservedBy === 'Invader') {

                if (Game.rooms[data.homeRoom].controller.level < 5) {
                    continue;
                }
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

    if (myRooms.length === Game.gcl.level) {
        return;
    }
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
            if (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.some(o => o === r.roomName)) {
                next = true;
                break;
            }
        }
        if (next) {
            continue;
        }

        //  {"name":"W4N1","controller_id":"79ad0773ec3f021","sources":["b8e80773ec3d49f"],"mineralType":"K","hostileCreeps":0,"reserved":false,"hostileTarget":false,"occupied":false,"lastScan":382826,"owned":false,"my":false,"distance":3,"distanceRating":64}
        if (r.distance > 3 && r.controller_id && !r.reserved && !r.occupied && !r.my) {


            let score = r.rating;



            potentialSettlements.push({
                roomName: r.roomName,
                score: score,
            })
        }
    }

    //console.log('Potential Settlements:', JSON.stringify(potentialSettlements), potentialSettlements.length)

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
