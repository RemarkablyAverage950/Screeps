let MEMORY = require('memory');
let { getBody, SpawnOrder } = require('manageSpawns');
let { Task } = require('manageCreeps')
let { getPath } = require('pathfinder')

class Mission {
    constructor(type) {
        this.type = type;
        this.complete = false;
    }
}

class AssaultMission extends Mission {
    constructor(roomName, startTime) {
        super('ASSAULT');
        this.roomName = roomName;
        this.startTime = startTime
    }
}

class DismantleMission extends Mission {
    /**
     * 
     * @param {String} roomName 
     */
    constructor(roomName) {
        super('DISMANTLE');
        this.roomName = roomName
    }
}

class DefendMission extends Mission {
    constructor(roomName) {
        super('DEFEND');
        this.roomName = roomName
    }
}

class ClaimMission extends Mission {
    constructor(roomName) {
        super('CLAIM');
        this.roomName = roomName;

    }
}

class FetchMission extends Mission {
    constructor(roomName) {
        super('FETCH');
        this.roomName = roomName

    }
}

class InvaderCoreMission extends Mission {
    constructor(roomName) {
        super('INVADER_CORE');
        this.roomName = roomName
        this.unitsReq = undefined;
    }
}

class SupplyMission extends Mission {
    constructor(roomName, resource, qty) {
        super('SUPPLY');
        this.roomName = roomName
        this.resource = resource
        this.qty = qty
    }
}

class ScanData {
    constructor(roomName, myRooms) {
        this.roomName = roomName
        this.assignedScout = undefined;


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
        let safeMode = false;
        if (controller && controller.safeMode) {
            safeMode = true;
        }
        this.safeMode = safeMode;
        let pathToController = true;
        let exit = room.find(FIND_EXIT)[0]
        if (controller && getPath(exit, controller.pos, 1, 1, true)) {
            pathToController = false;
        }
        this.pathToController = pathToController;
        const sources = room.find(FIND_SOURCES);
        const mineral = room.find(FIND_MINERALS)[0];
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        this.hostileCreeps = hostileCreeps.length
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        const structures = room.find(FIND_STRUCTURES)
        this.structureCount = structures.length
        let powerBank = false;
        let portal = false;
        let strucHits = 0
        let storage = room.storage;
        let pathToStorage = true;
        if (storage && getPath(exit, storage.pos, 1, 1, true)) {
            pathToStorage = false;
        }
        this.pathToStorage = pathToStorage;
        this.resources = {}
        this.storeQty = 0
        for (let s of structures) {
            if (s.structureType === STRUCTURE_RAMPART) {
                strucHits += s.hits;
                continue;
            }
            if (s.store) {
                if (structures.some(r => r.structureType === STRUCTURE_RAMPART && r.pos.x === s.pos.x && r.pos.y === s.pos.y)) {
                    continue;
                }

                let storeStocked = false;
                for (let r of Object.keys(s.store)) {
                    if (!this.resources[r]) {
                        this.resources[r] = s.store[r]
                        this.storeQty += s.store[r]
                        storeStocked = true;
                    } else {
                        this.resources[r] += s.store[r]
                        this.storeQty += s.store[r]
                        storeStocked = true;
                    }
                }
                if (!storeStocked) {
                    strucHits += s.hits
                }

            } else if (s.structureType === STRUCTURE_CONTROLLER) {

            } else if (s.structureType === STRUCTURE_POWER_BANK) {
                powerBank = true;
            } else if (s.structureType === STRUCTURE_PORTAL) {
                portal = true;
            } else {
                strucHits += s.hits
            }
        }

        this.structureHits = strucHits;

        let invaderCore = false
        let towers = false;

        for (let s of hostileStructures) {
            if (s.structureType === STRUCTURE_INVADER_CORE) {
                invaderCore = true;
            } else if (s.structureType === STRUCTURE_TOWER) {
                towers = true;
            }

        }
        this.towers = towers;
        this.invaderCore = invaderCore;
        this.powerBank = powerBank;
        this.portal = portal;


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
        if (towers && this.ownedBy && !this.my) {
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

        let pathToController = true;
        let exit = room.find(FIND_EXIT)[0]
        let safeMode = false;
        if (controller && controller.safeMode) {
            safeMode = true;
        }
        this.safeMode = safeMode;
        if (controller && getPath(exit, controller.pos, 1, 1, true)) {
            pathToController = false;
        }
        this.pathToController = pathToController;
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        this.hostileCreeps = hostileCreeps.length
        const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
        const structures = room.find(FIND_STRUCTURES)
        this.structureCount = structures.length
        let powerBank = false;
        let portal = false;
        let strucHits = 0
        this.resources = {}
        this.storeQty = 0
        for (let s of structures) {
            if (s.structureType === STRUCTURE_RAMPART) {
                strucHits += s.hits;
                continue;
            }
            if (s.store) {
                if (structures.some(r => r.structureType === STRUCTURE_RAMPART && r.pos.x === s.pos.x && r.pos.y === s.pos.y).length > 0) {
                    continue;
                }
                let storeStocked = false;
                for (let r of Object.keys(s.store)) {
                    if (!this.resources[r]) {
                        this.resources[r] = s.store[r]
                        this.storeQty += s.store[r]
                        storeStocked = true;
                    } else {
                        this.resources[r] += s.store[r]
                        this.storeQty += s.store[r]
                        storeStocked = true;
                    }
                }
                if (!storeStocked) {
                    strucHits += s.hits
                }

            } else if (s.structureType === STRUCTURE_CONTROLLER) {

            } else if (s.structureType === STRUCTURE_POWER_BANK) {
                powerBank = true;
            } else if (s.structureType === STRUCTURE_PORTAL) {
                portal = true;
            } else {
                strucHits += s.hits
            }
        }

        this.structureHits = strucHits;
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
        if (towers && this.ownedBy && !this.my) {
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

/**
 * 
 * @param {String[]} myRooms 
 * @returns 
 */
function expansionManager(myRooms) {

    if (!MEMORY.rooms) {
        return;
    }

    //delete Memory.rooms['W5N1'].outposts

    getMonitoredRooms(myRooms)


    let monitoredRooms = MEMORY.monitoredRooms
    let monitoredRoomNames = Object.keys(monitoredRooms)
    let visibleRooms = Object.values(Game.rooms)

    for (let r of visibleRooms) {
        if (!monitoredRoomNames.includes(r.name)) {
            monitoredRooms[r.name] = new ScanData(r.name, myRooms)
        }
    }
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

                        MEMORY.monitoredRooms[r.name] = data;
                    } else {
                        if (Game.time - data.lastScan > 100) {
                            data.update(myRooms)

                        }
                    }

                    MEMORY.monitoredRooms[r.name] = data;
                }
            }
        }

        if (Game.time % 50 === 0) {
            // Expand outposts here
            const room = Game.rooms[roomName]
            if (!room) {
                return;
            }
            let spawns = room.find(FIND_MY_SPAWNS)
            let maxRooms = 9;
            let maxRange = 2;


            if (spawns.length === 1) {
                maxRooms = 4;
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
                            if (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.length && Game.rooms[myRoom].memory.outposts.includes(r.roomName)) {
                                next = true;
                                break;
                            }
                        }
                        if (next) {
                            continue;
                        }
                       
                        
                        if (roomName === r.homeRoom && r.distance === i && r.controller_id && !r.occupied && !r.my && r.structureCount < 2 && !room.memory.outposts.some(o => o === r.roomName)) {
                       
                            if (i === 2) {
                                let pathHome = Game.map.findRoute(roomName, r.roomName)

                                try {
                                    if (!Game.rooms[r.homeRoom].memory.outposts.includes(pathHome[0].room)) {
                                    
                                        continue;
                                    }
                                } catch (e) {
                                    console.log('Errored out', e)
                                    continue;
                                }
                            }


                            room.memory.outposts.push(r.roomName)
                            console.log(r.roomName, 'is now an outpost for', roomName)
                            return;
                        }
                    }
                }
            }
        }
    }

    if (Game.time % 50 === 0 && Game.cpu.bucket > 100) {


        getMission(myRooms)


        executeMissions(myRooms)
    }
}

/**
 * 
 * @param {string[]} myRooms 
 */
function executeMissions(myRooms) {


    for (let homeRoomName of myRooms) {

        let homeRoom = Game.rooms[homeRoomName]
        let missions = MEMORY.rooms[homeRoomName].missions
        let spawnQueue = MEMORY.rooms[homeRoomName].spawnQueue
        if (!missions.length) {
            continue;
        }
        for (let mission of missions) {

            if (!mission.complete) {

                let body = [];
                let data = MEMORY.monitoredRooms[mission.roomName]
                let room = Game.rooms[mission.roomName]
                let targetSoldierCount
                let defenderCount;
                let targetDefenderCount;
                let longHaulerCount
                let targetLongHaulerCount;
                let reserverCount;
                let targetReserverCount;


                if (mission.type == 'DEFEND') {
                    if (room.find(FIND_HOSTILE_CREEPS).length === 0) {
                        mission.complete = true;
                        continue;
                    }

                    targetDefenderCount = 1
                    defenderCount = 0;
                    for (let c of Object.values(Game.creeps)) {
                        if (c.memory.role === 'defender' && c.memory.home === homeRoomName && c.memory.assignedRoom === mission.roomName) {
                            defenderCount++;
                        }
                    }
                    for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                        if (so.role === 'defender' && so.assignedRoom === mission.roomName) {
                            defenderCount++
                        }
                    }




                    body = [];
                    while (defenderCount < targetDefenderCount) {
                        if (body.length === 0) {
                            body = getBody.defender(homeRoom.energyCapacityAvailable, undefined)
                        }
                        options = {
                            memory: {
                                role: 'defender',
                                home: homeRoomName,
                                assignedRoom: mission.roomName,
                            },
                        };

                        MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('defender', 4, body, options));
                        defenderCount++;
                    }

                }




                // Check status.
                if (mission.type === 'ASSAULT') {
                    if ((data.ownedBy === undefined && data.reservedBy === undefined) || data.safeMode || Game.time - data.startTime > 10000) {
                        mission.complete = true;
                    }

                    if (homeRoom.storage) {
                        if (room) {
                            if (room.find(FIND_HOSTILE_CREEPS).length === 0) {
                                targetSoldierCount = 0;
                            } else {
                                targetSoldierCount = 2
                            }
                        }
                        soldierCount = 0;
                        for (let c of Object.values(Game.creeps)) {
                            if (c.memory.role === 'soldier' && c.memory.home === homeRoomName && c.memory.assignedRoom === mission.roomName) {
                                soldierCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'soldier' && so.options.memory.assignedRoom === mission.roomName) {
                                soldierCount++
                            }
                        }




                        body = [];
                        while (soldierCount < targetSoldierCount) {
                            if (body.length === 0) {
                                body = getBody.defender(homeRoom.energyCapacityAvailable, undefined)
                            }
                            options = {
                                memory: {
                                    role: 'soldier',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };

                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('soldier', 5, body, options));
                            soldierCount++;
                        }

                    }
                    if (data.structureHits > 0 && homeRoom.controller.level > 4) {
                        let targetDismantlerCount = 1;



                        let dismantlerCount = 0;

                        for (let creep of Object.values(Game.creeps)) {
                            if (creep.memory.role === 'dismantler' && creep.memory.assignedRoom === mission.roomName) {
                                dismantlerCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'dismantler' && so.options.memory.assignedRoom === mission.roomName) {
                                dismantlerCount++
                            }
                        }



                        body = [];
                        while (dismantlerCount < targetDismantlerCount) {

                            if (body.length === 0) {

                                body = getBody.dismantler(Game.rooms[homeRoomName].energyCapacityAvailable, data.structureHits)[0]


                            }

                            options = {
                                memory: {
                                    role: 'dismantler',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };

                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('dismantler', 6, body, options));
                            dismantlerCount++;
                        }
                    }
                    if (homeRoomName === data.homeRoom) {


                        let reserverCount = 0;
                        let targetReserverCount = 1;




                        for (let creep of Object.values(Game.creeps)) {
                            if (creep.memory.role === 'reserver' && creep.memory.assignedRoom === mission.roomName) {
                                reserverCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'reserver' && so.options.memory.assignedRoom === mission.roomName) {
                                reserverCount++
                            }
                        }



                        body = [];
                        while (reserverCount < targetReserverCount) {

                            if (body.length === 0) {

                                body = getBody.reserver(Game.rooms[homeRoomName].energyCapacityAvailable)


                            }

                            options = {
                                memory: {
                                    role: 'reserver',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };

                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('reserver', 5, body, options));
                            reserverCount++;
                        }



                    }


                } else if (mission.type === 'CLAIM') {
                    if (room && (room.controller.owner || room.controller.reservedBy)) {
                        mission.complete = true;
                        continue;
                    }


                    if (!data.pathToController) {
                        let targetDismantlerCount = 4;



                        let dismantlerCount = 0;

                        for (let creep of Object.values(Game.creeps)) {
                            if (creep.memory.role === 'dismantler' && creep.memory.assignedRoom === mission.roomName) {
                                dismantlerCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'dismantler' && so.options.memory.assignedRoom === mission.roomName) {
                                dismantlerCount++
                            }
                        }



                        body = [];
                        while (dismantlerCount < targetDismantlerCount) {

                            if (body.length === 0) {

                                body = getBody.dismantler(Game.rooms[homeRoomName].energyCapacityAvailable, data.structureHits)[0]


                            }

                            options = {
                                memory: {
                                    role: 'dismantler',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };

                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('dismantler', 6, body, options));
                            dismantlerCount++;
                        }

                    } else {

                        let targetClaimerCount = 0;
                        let claimerCount = 0;
                        if (!room || !room.controller.my) {
                            targetClaimerCount++;

                            for (let creep of Object.values(Game.creeps)) {
                                if (creep.memory.role === 'claimer' && creep.memory.assignedRoom === mission.roomName) {
                                    claimerCount++;
                                }
                            }
                            for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                                if (so.role === 'claimer' && so.options.memory.assignedRoom === mission.roomName) {
                                    claimerCount++
                                }
                            }



                            body = [];
                            while (claimerCount < targetClaimerCount) {
                                if (body.length === 0) {
                                    body = getBody.reserver(Game.rooms[homeRoomName].energyCapacityAvailable)
                                }
                                options = {
                                    memory: {
                                        role: 'claimer',
                                        home: homeRoomName,
                                        assignedRoom: mission.roomName,
                                    },
                                };
                                MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('claimer', 6, body, options));
                                claimerCount++;
                            }
                        }
                    }
                    if (room && room.find(FIND_HOSTILE_CREEPS).length > 0) {
                        soldierCount = 0;
                        for (let c of Object.values(Game.creeps)) {
                            if (c.memory.role === 'soldier' && c.memory.assignedRoom === mission.roomName) {
                                soldierCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'soldier' && so.assignedRoom === mission.roomName) {
                                soldierCount++
                            }
                        }

                        targetSoldierCount = 1

                        body = [];
                        while (soldierCount < targetSoldierCount) {
                            if (body.length === 0) {
                                body = getBody.defender(Game.rooms[homeRoomName].energyCapacityAvailable, undefined)
                            }
                            options = {
                                memory: {
                                    role: 'soldier',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };
                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('soldier', 6, body, options));
                            soldierCount++;
                        }
                    }

                } else if (mission.type === 'DISMANTLE') {
                    if (room) {
                        let structures = room.find(FIND_STRUCTURES).filter(s => s.structureType !== STRUCTURE_CONTROLLER)
                        if (structures.length === 0) {
                            mission.complete = true;
                            continue;
                        }
                    }

                    if (room
                        && data.pathToController
                        && (!room.controller.reservation
                            || (room.controller.reservation
                                && (room.controller.reservation.username !== MEMORY.username
                                    || room.controller.reservation.ticksToEnd < 4000)))) {
                        reserverCount = 0;
                        targetReserverCount = 1;

                        for (let creep of Object.values(Game.creeps)) {
                            if (creep.memory.role === 'reserver' && creep.memory.assignedRoom === mission.roomName) {
                                reserverCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'reserver' && so.options.memory.assignedRoom === mission.roomName) {
                                reserverCount++
                            }
                        }


                        body = [];
                        while (reserverCount < targetReserverCount) {

                            if (body.length === 0) {
                                body = getBody.reserver(Game.rooms[homeRoomName].energyCapacityAvailable) // budget, homeRoomName, mission                
                            }

                            options = {
                                memory: {
                                    role: 'reserver',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };

                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('reserver', 5, body, options));
                            reserverCount++;
                        }

                    }

                    if (data.pathToStorage && data.storeQty > 0) {

                        longHaulerCount = 0;
                        targetLongHaulerCount = 1;
                        if (Game.time % 100 === 0) {
                            targetLongHaulerCount = 4
                        }

                        for (let creep of Object.values(Game.creeps)) {
                            if (creep.memory.role === 'longHauler' && creep.memory.assignedRoom === mission.roomName) {
                                longHaulerCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'longHauler' && so.options.memory.assignedRoom === mission.roomName) {
                                longHaulerCount++
                            }
                        }



                        body = [];
                        while (longHaulerCount < targetLongHaulerCount) {

                            if (body.length === 0) {
                                let ret = getBody.longHauler(Game.rooms[homeRoomName].energyCapacityAvailable, homeRoomName, mission.roomName, data.storeQty) // budget, homeRoomName, mission
                                body = ret[0]
                                targetLongHaulerCount = Math.min(4, ret[1])

                            }

                            options = {
                                memory: {
                                    role: 'longHauler',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };
                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('longHauler', 5, body, options));
                            longHaulerCount++;
                        }




                        ;


                    }


                    if (data.hostileCreeps > 0) {
                        // Send hostile creeps
                    }

                    if (data.structureHits > 0) {
                        let targetDismantlerCount = 1;
                        if (Game.time % 100 === 0) {
                            targetDismantlerCount = 4;
                        }



                        let dismantlerCount = 0;

                        for (let creep of Object.values(Game.creeps)) {
                            if (creep.memory.role === 'dismantler' && creep.memory.assignedRoom === mission.roomName) {
                                dismantlerCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                            if (so.role === 'dismantler' && so.options.memory.assignedRoom === mission.roomName) {
                                dismantlerCount++
                            }
                        }



                        body = [];
                        while (dismantlerCount < targetDismantlerCount) {

                            if (body.length === 0) {
                                let ret = getBody.dismantler(Game.rooms[homeRoomName].energyCapacityAvailable, data.structureHits)
                                body = ret[0]
                                targetDismantlerCount = Math.min(4, ret[1])

                            }

                            options = {
                                memory: {
                                    role: 'dismantler',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };
                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('dismantler', 6, body, options));
                            dismantlerCount++;
                        }
                    }

                    if (room && room.find(FIND_HOSTILE_CREEPS).length > 0) {
                        soldierCount = 0;
                        for (let c of Object.values(Game.creeps)) {
                            if (c.memory.role === 'soldier' && c.memory.assignedRoom === mission.roomName) {
                                soldierCount++;
                            }
                        }
                        for (let so of MEMORY.rooms[data.homeRoom].spawnQueue) {
                            if (so.role === 'soldier' && so.options.memory.assignedRoom === mission.roomName) {
                                soldierCount++
                            }
                        }

                        targetSoldierCount = 1

                        body = [];
                        while (soldierCount < targetSoldierCount) {
                            if (body.length === 0) {
                                body = getBody.defender(Game.rooms[homeRoomName].energyCapacityAvailable, undefined)
                            }
                            options = {
                                memory: {
                                    role: 'soldier',
                                    home: homeRoomName,
                                    assignedRoom: mission.roomName,
                                },
                            };
                            MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('soldier', 6, body, options));
                            soldierCount++;
                        }
                    }



                } else if (mission.type === 'INVADER_CORE') {

                    if (room) {
                        if (!room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType === STRUCTURE_INVADER_CORE)) {
                            mission.complete = true;
                        }
                    }

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

                } else if (mission.type === 'SUPPLY') {
                    if (!MEMORY.rooms[mission.roomName].needEnergy) {
                        mission.complete = true
                        continue;
                    }


                    let longHaulerCount = 0;
                    let targetLongHaulerCount = 1
                    if (Game.time % 100 === 0) {
                        targetLongHaulerCount = 4;
                    }





                    for (let creep of Object.values(Game.creeps)) {
                        if (creep.memory.role === 'longHauler' && creep.memory.assignedRoom === mission.roomName) {
                            longHaulerCount++;
                        }
                    }
                    for (let so of MEMORY.rooms[homeRoomName].spawnQueue) {
                        if (so.role === 'longHauler' && so.options.memory.assignedRoom === mission.roomName) {
                            longHaulerCount++
                        }
                    }



                    body = [];
                    while (longHaulerCount < targetLongHaulerCount) {

                        if (body.length === 0) {
                            let ret = getBody.longHauler(homeRoom.energyCapacityAvailable, homeRoomName, mission)
                            body = ret[0]
                            longHaulerCount = Math.min(4, ret[1])

                        }

                        options = {
                            memory: {
                                role: 'longHauler',
                                home: homeRoomName,
                                assignedRoom: mission.roomName,
                            },
                        };
                        console.log(homeRoomName, 'adding longHauler to queue for', mission.roomName)
                        MEMORY.rooms[homeRoomName].spawnQueue.push(new SpawnOrder('longHauler', 5, body, options));
                        longHaulerCount++;
                    }




                }



            }

        }

        for (let i = missions.length - 1; i >= 0; i--) {
            if (MEMORY.rooms[homeRoomName].missions[i].complete) {
                MEMORY.rooms[homeRoomName].missions.splice(i, 1)
            }
        }

    }
}

/**
 * Finds all rooms with linear distance of 10 from starting room and stores them in memory.
 * @param {Room} room 
 */
function getMonitoredRooms(myRooms) {
    const RANGE = 6;

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
                let neighbors = [];
                try {
                    neighbors = Object.values(Game.map.describeExits(next))
                } catch (e) { }
                for (let neighbor of neighbors) {
                    if (monitoredRoomNames.includes(neighbor) || Game.map.getRoomStatus(neighbor).status === 'closed') {
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
    let names = Object.keys(MEMORY.monitoredRooms)

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
 * @return {Mission}
 */
function getMission(myRooms) {

    let monitoredRooms = MEMORY.monitoredRooms;


    let flags = Object.values(Game.flags)


    for (let flag of flags) {

        if (flag.name == 'CLAIM' || flag.name == 'CLAIM1') {

            let targetRoomName = flag.pos.roomName
            let availableRooms = []
            for (let roomName of myRooms) {
                let room = Game.rooms[roomName]
                if (!MEMORY.rooms[roomName].missions.some(m => m.type === 'CLAIM') && room.controller.level > 3 && Game.map.findRoute(roomName, targetRoomName).length <= 10) {
                    availableRooms.push(roomName)
                }
            }
            let assignedRoom = _.min(availableRooms, r => Game.map.findRoute(r, targetRoomName).length)
            if (assignedRoom) {
                MEMORY.rooms[assignedRoom].missions.push(new ClaimMission(targetRoomName, true))
                console.log(assignedRoom, 'claiming', targetRoomName, 'per flag')
                flag.remove()
                break;
            }

        } else if (flag.name == 'DISMANTLE' || flag.name == 'DISMANTLE1') {

            let targetRoomName = flag.pos.roomName
            let availableRooms = []
            for (let roomName of myRooms) {
                let room = Game.rooms[roomName]
                if (!MEMORY.rooms[roomName].missions.some(m => m.type === 'DISMANTLE') && room.controller.level > 3 && Game.map.findRoute(roomName, targetRoomName).length <= 10) {
                    availableRooms.push(roomName)
                }
            }
            let assignedRoom = _.min(availableRooms, r => Game.map.findRoute(r, targetRoomName).length)
            if (assignedRoom) {
                MEMORY.rooms[assignedRoom].missions.push(new DismantleMission(targetRoomName))
                console.log(assignedRoom, 'dismantling', targetRoomName, 'per flag')
                flag.remove()
                break;
            }

        } else if (flag.name == 'ASSAULT' || flag.name == 'ASSAULT1') {
            console.log('Assault flag found')
            let targetRoomName = flag.pos.roomName
            let availableRooms = []
            for (let roomName of myRooms) {
                let room = Game.rooms[roomName]
                if (!MEMORY.rooms[roomName].missions.some(m => m.type === 'ASSAULT') && room.controller.level > 3 && Game.map.findRoute(roomName, targetRoomName).length <= 10) {
                    availableRooms.push(roomName)
                }
            }
            console.log('AvailableRooms', availableRooms)
            for (let availableRoom of availableRooms) {

                MEMORY.rooms[availableRoom].missions.push(new AssaultMission(targetRoomName))
                console.log(availableRoom, 'assaulting', targetRoomName, 'per flag')
                flag.remove()

            }
        }
    }


    for (let roomName of myRooms) {
        let room = Game.rooms[roomName]
        if (room.controller.level < 4) {
            let enemyCreeps = room.find(FIND_HOSTILE_CREEPS)
            if (enemyCreeps.length) {
                let availableRooms = myRooms.filter(r => Game.map.findRoute(r, roomName).length < 10 && Game.rooms[r].storage)

                for (let ar of availableRooms) {
                    console.log(ar, 'creating new defend mission for', roomName)
                    MEMORY.rooms[ar].missions.push(new DefendMission(roomName))
                }

            }
        }
    }

    let availableRooms = myRooms.filter(homeRoomName => !MEMORY.rooms[homeRoomName].missions.some(m => m.type === 'DISMANTLE') && Game.rooms[homeRoomName].storage)

    if (availableRooms.length > 0) {

        for (let r of Object.keys(monitoredRooms)) {
            if (availableRooms.length === 0) {
                return;
            }
            let data = monitoredRooms[r]
            let myOutpost = false;
            for (let myRoomName of myRooms) {
                if (Memory.rooms[myRoomName].outposts.includes(data.roomName)) {
                    myOutpost = true;
                    break;
                }
            }
            if (!myOutpost && !data.ownedBy && (!data.reservedBy || data.reservedBy === MEMORY.username) && data.structureCount > 1 && data.controller_id) {

                let nearbyRooms = availableRooms.filter(hr => Game.map.findRoute(hr, data.roomName).length < 6)

                while (nearbyRooms.length > 0) {

                    homeRoomName = nearbyRooms.pop()
                    let idx = availableRooms.findIndex(r => r === homeRoomName)
                    availableRooms.splice(idx, 1)

                    console.log(homeRoomName, 'creating dismantle mission for', data.roomName)
                    MEMORY.rooms[homeRoomName].missions.push(new DismantleMission(data.roomName))
                }

            }
        }

    }

    let preferredMinerals = [];
    let ownedMinerals = [
        { constant: RESOURCE_HYDROGEN, count: 0 },
        { constant: RESOURCE_OXYGEN, count: 0 },
        { constant: RESOURCE_LEMERGIUM, count: 0 },
        { constant: RESOURCE_KEANIUM, count: 0 },
        { constant: RESOURCE_ZYNTHIUM, count: 0 },
        { constant: RESOURCE_UTRIUM, count: 0 },
        { constant: RESOURCE_CATALYST, count: 0 },
    ];

    // Claim Mission Count
    let claimMissionCount = 0;
    for (let homeRoomName of myRooms) {


        if (MEMORY.rooms[homeRoomName] && MEMORY.rooms[homeRoomName].missions && MEMORY.rooms[homeRoomName].missions.some(m => m.type === 'CLAIM')) {
            claimMissionCount++
        }
    }

    if (myRooms.length + claimMissionCount < Game.gcl.level) {
        // We can generate a claim mission.
        for (let homeRoomName of myRooms) {
            if (!MEMORY.rooms[homeRoomName]) {
                continue;
            }

            let missions = MEMORY.rooms[homeRoomName].missions
            if (!missions.some(m => m.type === 'CLAIM')) {
                // This homeRoom can generate a claim mission.

                let potentialSettlements = [];

                // Fill preferred minerals if empty array.
                if (preferredMinerals.length === 0) {

                    for (let myRoom of myRooms) {
                        let mineral = Game.rooms[myRoom].find(FIND_MINERALS)[0];
                        ownedMinerals.find(m => m.constant === mineral.mineralType).count++;
                    }

                    let min = Infinity;
                    for (let m of ownedMinerals) {
                        if (m.count < min) {
                            min = m.count;
                        }
                    }

                    for (let m of ownedMinerals) {
                        if (m.count === min) {
                            preferredMinerals.push(m.constant);
                        }
                    }

                }

                // Look through monitored rooms and generate list of targets
                for (let roomName of MEMORY.rooms[homeRoomName].monitoredRooms) {
                    let r = MEMORY.monitoredRooms[roomName]

                    if (r.lastScan === 0) {
                        continue;
                    }



                    // Skip this target room if it is an outpost for one of my rooms
                    let next = false;

                    for (let myRoom of myRooms) {
                        if (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.some(o => o === r.roomName) || MEMORY.rooms[myRoom].missions.some(m => m.type === 'CLAIM' && m.roomName === r.roomName)) {
                            next = true;
                            break;
                        }
                    }
                    if (next) {
                        continue;
                    }

                    // See if room meets criteria for being a new room
                    if (r.distance > 3 && r.controller_id && !r.reserved && !r.ownedBy && !r.hostileTarget) {


                        let score = r.rating;

                        if (!preferredMinerals.includes(r.mineralType)) {
                            score -= 250;
                        } else {
                            score += 250;
                        }

                        potentialSettlements.push({
                            roomName: r.roomName,
                            score: score,
                        })
                    }



                }

                // Generate a claim mission if criteria met

                //console.log('Potential Settlements for', homeRoomName + ':', JSON.stringify(potentialSettlements), potentialSettlements.length)
                let potentialSettlementCount = 0
                for (let s of potentialSettlements) {

                    if (s.score >= 1000) {
                        potentialSettlementCount++;
                    }
                }

                if (potentialSettlementCount > 0) {

                    let bestTarget = _.max(potentialSettlements, s => s.score)
                    console.log(homeRoomName, 'Generating ClaimMission for', bestTarget.roomName)

                    let mission = new ClaimMission(bestTarget.roomName)
                    MEMORY.rooms[homeRoomName].missions.push(mission)


                }



            }
        }
    }

    for (let r of Object.values(monitoredRooms)) {
        if (r.invaderCore && r.reservedBy === 'Invader' && r.hostileTarget === false) {
            let homeRoomName = r.homeRoom
            if (!MEMORY.rooms[homeRoomName].missions.some(m => m.type === 'INVADER_CORE')) {
                console.log(homeRoomName, 'generating invader core mission for', r.roomName)
                MEMORY.rooms[homeRoomName].missions.push(new InvaderCoreMission(r.roomName))
            }

        }
    }



    for (let roomName of myRooms) {
        if (MEMORY.rooms[roomName] && MEMORY.rooms[roomName].missions.some(m => m.type === 'ASSAULT')) {
            continue;
        }
        let room = Game.rooms[roomName]
        let mr = MEMORY.rooms[roomName].monitoredRooms

        for (let monitoredRoomName of mr) {
            let r = monitoredRooms[monitoredRoomName]
            if (r.controller_id && !r.safeMode && r.ownedBy && !r.my && r.distance < 3 && r.level < room.controller.level) {
                console.log(roomName, 'creating Assault Mission for', r.roomName)
                MEMORY.rooms[roomName].missions.push(new AssaultMission(r.roomName, Game.time))
            }

        }
    }
    /*
        let roomsNeedingEnergy = [];
        for (let r of myRooms) {
            if (MEMORY.rooms[r].needEnergy) {
                roomsNeedingEnergy.push(r)
            }
        }
        if (roomsNeedingEnergy.length > 0) {
            for (let roomName of myRooms) {
    
                for (let name of roomsNeedingEnergy) {
                    if (Game.map.findRoute(roomName, name).length <= 10 && MEMORY.rooms[roomName].missions && !MEMORY.rooms[roomName].missions.some(m => m.type === 'SUPPLY')) {
                        console.log(roomName, 'generating supply mission for', name)
                        MEMORY.rooms[roomName].missions.push(new SupplyMission(name, RESOURCE_ENERGY, 5000))
                        break;
                    }
    
                }
    
            }
        }*/

}

// Check for Invader Core missions

// Check for Dismantle Missions

// Check for Fetch Missions















/*
 
for (let data of Object.values(monitoredRooms)) {
    if (data.lastScan === 0) {
        continue;
    }
 
    for (let i = 1; i < 11; i++) {
 
        if (data.distance === i && !data.hostileTarget && data.invaderCore) {
 
            if (Game.rooms[data.homeRoom].controller.level < 5) {
                continue;
            }
            console.log('Generating Invader Core mission for', data.roomName)
            return new InvaderCoreMission(data.roomName)
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

/*
 
 
// Find dismantle missions
let dismantleTargets = []
for (let data of Object.values(monitoredRooms)) {
    if (data.lastScan === 0) {
        continue;
    }
    let next = false;
    for (let myRoom of myRooms) {
        if (myRooms.includes(data.roomName) || (Game.rooms[myRoom].memory.outposts && Game.rooms[myRoom].memory.outposts.some(o => o === data.roomName))) {
            next = true;
            break;
        }
    }
    if (next) {
        continue;
    }
    try {
        if (data.structureHits && !data.invaderCore && !data.ownedBy && !data.reservedBy && data.distance <= 2) {
            dismantleTargets.push(data)
        }
    } catch (e) { console.log('Errored out finding structures for', data.roomName) }
 
}
 
if (dismantleTargets.length > 0) {
 
    let bestTarget = _.min(dismantleTargets, r => r.distance)
 
 
    return new DismantleMission(bestTarget.roomName)
 
}
 
 
return undefined;
}
 
*/

module.exports = {
    expansionManager,
}
