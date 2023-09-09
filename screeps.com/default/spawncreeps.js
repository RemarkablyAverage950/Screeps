const { linkData } = require('links')


const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const TRANSPORTER_BASE_PARTS = [CARRY, CARRY, MOVE]
const SOLDIER_BASE_PARTS = [TOUGH, ATTACK, MOVE, MOVE]
const HEALER_BASE_PARTS = [HEAL, HEAL, MOVE]
const SCOUT_BASE_PARTS = [MOVE]
const REMOTE_MINER_BASE_PARTS = [MOVE, WORK]
const REMOTE_TRANSPORTER_BASE_PARTS = [CARRY, MOVE]
const RESERVER_BASE_PARTS = [CLAIM, MOVE]
const HUB_BASE_PARTS = [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
const FILLER_BASE_PARTS = [MOVE, CARRY, CARRY]
const BUILDER_BASE_PARTS = [CARRY, CARRY, MOVE]
const WALLBUILDER_BASE_PARTS = [WORK, CARRY, MOVE]

let creepSpawnInfo = {}

class SpawnInfo {
    constructor(targetCount) {
        this.targetCount = targetCount
        this.body = undefined
    }
}

/**
 * Spawns any required creeps
 * @param {Room} room Room object.
 * @param {Creep[]} creeps Creeps belonging to the room.
 * @param {StructureSpawn[]} spawns Spawns belonging to the room.
 */
function spawnCreeps(room, creeps, spawns) {

    let availableSpawns = spawns.filter(s => s.spawning == null)
    if (availableSpawns.length == 0) {
        return
    }
    let creepsCount = _.countBy(creeps, c => c.memory.role)
    let workers = creepsCount['worker'] || 0
    let fillers = creepsCount['filler'] || 0
    let upgraders = creepsCount['upgrader'] || 0
    let miners = creepsCount['miner'] || 0
    let builders = creepsCount['builder'] || 0
    let haulers = creepsCount['hauler'] || 0
    let soldiers = creepsCount['soldier'] || 0
    let healers = creepsCount['healer'] || 0
    let scouts = creepsCount['scout'] || 0
    let remoteMiners = creepsCount['remoteMiner'] || 0
    let remoteWorkers = creepsCount['remoteWorker'] || 0
    let remoteHaulers = creepsCount['remoteHauler'] || 0
    let reservers = creepsCount['reserver'] || 0
    let claimers = creepsCount['claimer'] || 0
    let hubCreeps = creepsCount['hub'] || 0
    let wallBuilders = creepsCount['wallBuilder'] || 0
    let maintainers = creepsCount['maintainer'] || 0
    let fastFillers = creepsCount['fastFiller'] || 0
    let soldierCreeps = creeps.filter(c => c.memory.role == 'soldier')
    for (let soldierCreep of soldierCreeps) {
        if (soldierCreep.ticksToLive < 500) {
            soldiers--
        }
    }
    let fillerCreeps = creeps.filter(c => c.memory.role == 'filler')
    for (let fillerCreep of fillerCreeps) {
        if (fillerCreep.ticksToLive < 200) {
            fillers--
        }
    }

    const maxCount = Math.max(workers, fillers, fastFillers, upgraders, miners, builders, haulers, soldiers, healers, scouts, remoteMiners, remoteWorkers, remoteHaulers, reservers, claimers, hubCreeps, wallBuilders, maintainers)

    if (!creepSpawnInfo[room.name]) {
        initializeRoomData(room)
    }

    if (Game.time % 10 == 1) {
        creepSpawnInfo[room.name].targetCountsDefined = false
    }
    if (!creepSpawnInfo[room.name] || !creepSpawnInfo[room.name].targetCountsDefined) {
        if (Game.cpu.bucket < 100) {
            return
        }
        initializeRoomData(room, miners, fillers)
    } else {
        creepSpawnInfo[room.name].soldier.targetCount = getTargetSoldierCount(room)
        creepSpawnInfo[room.name].worker.targetCount = getTargetWorkerCount(room, miners, fillers)
    }

    const spawnInfo = creepSpawnInfo[room.name]
    const maxSpawnEnergy = room.energyCapacityAvailable

    for (let spawn of availableSpawns) {
        let spawning = false
        for (let j = 0; j <= maxCount; j++) {
            if (spawning) {
                break
            }
            if (workers < spawnInfo.worker.targetCount) {
                let body;
                if (workers == 0) {
                    body = buildBody(WORKER_BASE_PARTS, 8, room.energyAvailable)
                } else {
                    body = buildBody(WORKER_BASE_PARTS, 8, maxSpawnEnergy)
                }
                let options = {
                    memory: {
                        home: room.name,
                        role: 'worker',
                        needTask: true,
                        refill: true,
                        tasks: [],
                        moving: false,
                    }
                };
                for (let i = 0; i < spawnInfo.worker.targetCount; i++) {
                    let name = 'Worker_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        workers++
                        spawning = true
                        break
                    };
                }
            } else if (miners < spawnInfo.miner.targetCount && miners < j ) {

                let body = buildBody([WORK], 5, maxSpawnEnergy - 50);
                body.push(MOVE);
                let options = {
                    memory: {
                        home: room.name,
                        role: 'miner',
                        needTask: true,
                        tasks: [],
                        mineTarget: undefined,
                        moveTarget: undefined,
                        moving: false
                    }
                };
                for (let i = 0; i < spawnInfo.miner.targetCount; i++) {
                    let name = 'Miner_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        miners++
                        spawning = true
                        break;
                    }
                }
            } else if (fillers < spawnInfo.filler.targetCount) {
                let body;
                body = buildBody(FILLER_BASE_PARTS, 10, room.energyAvailable)

                let options = {
                    memory: {
                        home: room.name,
                        role: 'filler',
                        moving: false,
                    }
                };
                for (let i = 0; i < spawnInfo.filler.targetCount; i++) {
                    let name = 'Filler_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        fillers++
                        spawning = true
                        break
                    };
                }
            } else if (haulers < spawnInfo.hauler.targetCount && haulers < j) {
                let body = buildBody(TRANSPORTER_BASE_PARTS, 6, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'hauler',
                        moving: false,
                    }
                };
                for (let i = 0; i < spawnInfo.hauler.targetCount; i++) {
                    let name = 'Hauler_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        haulers++
                        spawning = true
                        break;
                    }
                }
            } else if (hubCreeps < spawnInfo.hub.targetCount && hubCreeps < j) {
                let body = buildBody(HUB_BASE_PARTS, 1, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'hub',
                        moving: false,
                    }
                };
                for (let i = 0; i < spawnInfo.hub.targetCount; i++) {
                    let name = 'Hub_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        hubCreeps++
                        spawning = true
                        continue;
                    }
                }
            } else if (fastFillers < spawnInfo.fastFiller.targetCount) {
                let body;
                if (room.controller.level <= 7) {
                    body = [MOVE, CARRY, CARRY]
                } else {
                    body = [MOVE, CARRY, CARRY, CARRY, CARRY]
                }
                let options = {
                    memory: {
                        home: room.name,
                        role: 'fastFiller',
                        moving: false,
                    }
                };
                for (let i = 0; i < spawnInfo.fastFiller.targetCount; i++) {
                    let name = 'FastFiller' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        fillers++
                        spawning = true
                        break
                    };
                }
            }  else if (maintainers < spawnInfo.maintainer.targetCount && maintainers < j) {
                let body = buildBody(WALLBUILDER_BASE_PARTS, 6, maxSpawnEnergy);

                let options = {
                    memory: {
                        home: room.name,
                        role: 'maintainer',
                        moving: false
                    }
                };
                for (let i = 0; i < spawnInfo.maintainer.targetCount; i++) {
                    let name = 'Maintainer_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        maintainers++
                        spawning = true
                        break;
                    }
                }
            }/*else if (healers < spawnInfo.targetHealerCount) {
            let body = buildBody(HEALER_BASE_PARTS, Infinity, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'healer',
                    task: 'defendHome',
                    tasks: [],
                    moving: false

                }
            }
            for (let i = 0; i < targetHealerCount; i++) {
                let name = 'Healer_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } */else if (wallBuilders < spawnInfo.wallBuilder.targetCount && wallBuilders < j) {
                let body = buildBody(WORKER_BASE_PARTS, 20, maxSpawnEnergy);
                let options = {
                    memory: {
                        home: room.name,
                        role: 'wallBuilder',
                        moving: false
                    }
                };
                for (let i = 0; i < spawnInfo.wallBuilder.targetCount; i++) {
                    let name = 'WallBuilder_' + room.name + '_' + i
                    let ret = spawn.spawnCreep(body, name, options)
                    if (ret === 0) {
                        wallBuilders++
                        spawning = true
                        break;
                    }
                }
            } else if (upgraders < spawnInfo.upgrader.targetCount && upgraders < j) {

                let upgradeSize = getUpgraderSize(room)
                let body = buildBody(WORKER_BASE_PARTS, upgradeSize, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'upgrader',
                        needTask: true,
                        refill: true,
                        moving: false,
                        tasks: [],
                        storeForecast: { energy: 0 }
                    }
                };
                for (let i = 0; i < spawnInfo.upgrader.targetCount; i++) {
                    let name = 'Upgrader_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        upgraders++
                        spawning = true
                        break;
                    }
                }
            } else if (soldiers < spawnInfo.soldier.targetCount) {
                let body;
                if (maxSpawnEnergy > 1000) {
                    body = buildBody(SOLDIER_BASE_PARTS, Infinity, maxSpawnEnergy - 400)
                    body.push(RANGED_ATTACK)
                    body.push(RANGED_ATTACK)
                    body.push(MOVE)
                    body.push(MOVE)
                } else {
                    body = buildBody(SOLDIER_BASE_PARTS, Infinity, maxSpawnEnergy)
                }
                if (body.length > 50) {
                    body.length = 50
                }
                let options = {
                    memory: {
                        home: room.name,
                        role: 'soldier',
                        needTask: true,
                        moving: false,
                        targetRoom: undefined
                    }
                };
                for (let i = 0; i < spawnInfo.soldier.targetCount + 2; i++) {
                    let name = 'Soldier_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {

                        soldiers++
                        spawning = true
                        break;

                    }
                }
            } else if (scouts < spawnInfo.scout.targetCount && scouts < j) {
                let body = buildBody(SCOUT_BASE_PARTS, 1, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'scout',
                        moving: false,
                        target: room.name,
                        tasks: []
                    }
                };
                for (let i = 0; i < spawnInfo.scout.targetCount; i++) {
                    let name = 'Scout_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        scouts++
                        spawning = true
                        break;
                    }
                }
            } else if (remoteWorkers < spawnInfo.remoteWorker.targetCount && remoteWorkers < j) {
                let body = buildBody(WORKER_BASE_PARTS, 5, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'remoteWorker',
                        moving: false,
                        target: undefined,
                        tasks: [],
                        refill: true
                    }
                };
                for (let i = 0; i < spawnInfo.remoteWorker.targetCount; i++) {
                    let name = 'RemoteWorker_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        remoteWorkers++
                        spawning = true
                        break;
                    }
                }
            }
            else if (remoteMiners < spawnInfo.remoteMiner.targetCount && remoteMiners < j) {
                let body = buildBody(REMOTE_MINER_BASE_PARTS, 5, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'remoteMiner',
                        moving: false,
                        tasks: [],
                        mineTarget: undefined,
                        moveTarget: undefined,
                        targetRoom: undefined
                    }
                };
                for (let i = 0; i < spawnInfo.remoteMiner.targetCount; i++) {
                    let name = 'RemoteMiner_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        remoteMiners++
                        spawning = true
                        break;
                    }
                }
            } else if (remoteHaulers < spawnInfo.remoteHauler.targetCount && remoteHaulers < j) {
                let body = buildBody(TRANSPORTER_BASE_PARTS, 10, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'remoteHauler',
                        moving: false,
                        tasks: [],
                        target: undefined,
                        needTask: true,
                        targetRoom: undefined
                    }
                };
                for (let i = 0; i < spawnInfo.remoteHauler.targetCount; i++) {
                    let name = 'RemoteHauler_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        remoteHaulers++
                        spawning = true
                        break;
                    }
                }
            } else if (builders < spawnInfo.builder.targetCount && builders < j) {
                let body = buildBody(BUILDER_BASE_PARTS, 8, maxSpawnEnergy - 250);
                body.push(WORK)
                body.push(WORK)
                body.push(MOVE)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'builder',
                        moving: false
                    }
                };
                for (let i = 0; i < spawnInfo.builder.targetCount; i++) {
                    let name = 'Builder_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        builders++
                        spawning = true
                        break;
                    }
                }
            }else if (claimers < spawnInfo.claimer.targetCount && claimers < j) {
                let body = buildBody(RESERVER_BASE_PARTS, 1, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'claimer',
                        moving: false,
                        targetRoom: undefined,
                    }
                };
                for (let i = 0; i < spawnInfo.claimer.targetCount; i++) {
                    let name = 'Claimer_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        claimers++
                        spawning = true
                        break;
                    }
                }
            } else if (reservers < spawnInfo.reserver.targetCount && reservers < j && maxSpawnEnergy >= 1300) {
                let body = buildBody(RESERVER_BASE_PARTS, 99, maxSpawnEnergy)
                let options = {
                    memory: {
                        home: room.name,
                        role: 'reserver',
                        moving: false,
                        targetRoom: undefined,
                    }
                };
                for (let i = 0; i < spawnInfo.reserver.targetCount; i++) {
                    let name = 'Reserver_' + room.name + '_' + i
                    if (spawn.spawnCreep(body, name, options) === 0) {
                        reservers++
                        spawning = true
                        break;
                    }
                }
            } else {
                if (room.memory.occupy) {
                    for (const targetRoom of room.memory.occupy) {
                        if (!creeps.some(c => c.memory.role == 'soldier' && c.memory.targetRoom == targetRoom)) {
                            let body;

                            let options = {
                                memory: {
                                    home: room.name,
                                    role: 'soldier',
                                    targetRoom: targetRoom,
                                    moving: false
                                }
                            }
                            for (let i = 0; i < 1; i++) {
                                let name = 'Soldier_' + room.name + '_' + i
                                let ret = spawn.spawnCreep(body, name, options)
                                if (ret === 0) continue;
                            }
                        }
                    }
                }
            }
        }
    }
}


function getUpgraderSize(room) {
    let blockCount = 6
    if (room.storage && room.storage.store[RESOURCE_ENERGY] > 200000) {
        blockCount = 10
    }
    return blockCount;
}

function getTargetHaulerCount(room) {

    let structures = room.find(FIND_STRUCTURES)
    let storages = structures.filter(s => s.structureType == STRUCTURE_STORAGE)

    if (storages.length > 0) {
        const containers = structures.filter(s => s.structureType == STRUCTURE_CONTAINER)
        for (let container of containers) {
            if (container.store[RESOURCE_ENERGY] > 500)
                return 1
        }

        /*let energy = _.sum(containers, c => c.store[RESOURCE_ENERGY])
        return Math.floor(energy / 2000)*/
    }
    return 0;
}


/**
 * @param {Room} room Room object.
 * @returns {number} The target number of workers for a room.
 */
function getTargetWorkerCount(room, miners, fillers) {
    let count = 0
    if (room.controller.level <= 2) {
        count = room.find(FIND_SOURCES).length * 2

    } else {
        if (miners == 0) {
            count += 1
        }
        if (room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER).length == 0) {
            count += 2
        }
    }
    return count
}

/**
 * @param {Room} room Room object.
 * @returns {number} The target number of miners for a room.
 */
function getTargetMinerCount(room) {

    const sources = room.find(FIND_SOURCES);
    const structures = room.find(FIND_STRUCTURES)
    const containers = structures.filter(s => s.structureType == STRUCTURE_CONTAINER);
    const extractors = structures.filter(s => s.structureType == STRUCTURE_EXTRACTOR)
    let count = 0;

    for (let source of sources) {
        for (let container of containers) {
            if (source.pos.isNearTo(container)) {
                count++;
                continue
            }
        }
    }

    if (extractors.length > 0) {
        const mineral = room.find(FIND_MINERALS)[0]
        if (mineral.mineralAmount > 0) {
            count++
        }
    }

    return count
}

/**
 * Generate a body for a creep
 * @param {string[]} baseParts String of base parts to consider
 * @param {number} maxBlocks Maximum block replications.
 * @param {number} energyAvailable Total spawn energy capacity for a room.
 * @returns {string[]} Array of body parts 
 */
function buildBody(baseParts, maxBlocks, energyAvailable) {
    let body = []
    let blockCost = 0
    const MAX_PARTS = 50

    baseParts.forEach(p => {
        blockCost += BODYPART_COST[p]
    })
    for (let i = 0; i < maxBlocks; i++) {
        if (energyAvailable < blockCost || (i * baseParts.length) + baseParts.length > 50) {
            break;
        }
        baseParts.forEach(p => {
            body.push(p.toLowerCase());
        });
        energyAvailable -= blockCost;
    }
    return body
}

/**
 * 
 * @param {Room} room 
 * @returns {number} The target number of scouts to spawn.
 */
function getTargetScoutCount(room) {
    // Only spawn for levels 3-7. At level 8 we will build and use an observer.
    if (room.controller.level == 8 || room.storage == undefined) return 0;
    if (room.memory.neighbors && room.memory.neighbors.length > 100) return 0;

    return 0
}

function getTargetRemoteWorkerCount(room) {
    // if outposts.length > 0, return 1, else return 0
    let count = 0
    if (!room.memory.outposts) {
        return 0
    }
    if (Object.keys(room.memory.outposts).length > 0) {
        count += Object.keys(room.memory.outposts).length
    }
    if (room.memory.claimRoom && Game.rooms[room.memory.claimRoom] && Game.rooms[room.memory.claimRoom].find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_SPAWN)) {
        count += 3
    }
    return count
}

function getTargetRemoteMinerCount(room) {
    let outposts = room.memory.outposts
    let count = 0
    for (let outpost in outposts) {
        const tiles = room.memory.outposts[outpost].buildMap
        if (!tiles) {
            continue
        }
        const containers = tiles.filter(t => t.structure == STRUCTURE_CONTAINER && t.placed == true)
        count += containers.length
    }
    return count
}

function getRemoteTransportCount(room) {
    let outposts = room.memory.outposts
    let count = 0
    for (let outpost in outposts) {
        const tiles = room.memory.outposts[outpost].buildMap
        if (!tiles) {
            continue
        }
        const containers = tiles.filter(t => t.structure == STRUCTURE_CONTAINER && t.placed == true)
        if (containers.length > 0) {
            count++
        }
    }
    return count
}

function getTargetReserverCount(room) {
    let count = 0
    for (let outpost in room.memory.outposts) {
        if (!Game.rooms[outpost]) continue;
        let controller = Game.rooms[outpost].controller
        if (!controller) continue;
        if (!controller.reservation || !controller.reservation.username == 'RemarkablyAverage' || controller.reservation.ticksToEnd < 3000) {
            count++
        }
    }
    return count
}

function getTargetSoldierCount(room) {
    let count = 0
    if (room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER).length == 0)
        count++
    for (let outpost in room.memory.outposts) {
        if (!Game.rooms[outpost]) continue;
        let hostiles = Game.rooms[outpost].find(FIND_HOSTILE_CREEPS)
        if (hostiles.length > 0) {
            count++
        }
    }
    let claimRoom = room.memory.claimRoom
    let defendRoom = room.memory.defendRoom
    if (claimRoom || defendRoom) {
        count += 1
    }
    let harassRoom = room.memory.harassRoom

    if (harassRoom) {
        count++
    }

    return count
}

function getTargetClaimerCount(room) {
    let claimRoom = room.memory.claimRoom
    if (!claimRoom) return 0
    if (!Game.rooms[claimRoom]) return 1
    if (claimRoom && !Game.rooms[claimRoom].controller.my) return 1;
    return 0
}

function getTargetFillerCount(room) {
    if (room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0).length == 0) {
        return 0
    }

    return 2
}

function getTargetBuilderCount(room) {
    let count = 0
    if (room.energyCapacityAvailable > 350 && room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0).length > 0)
        if (room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
            count++
        }
    return count
}

function getTargetWallBuilderCount(room) {
    const hitsTarget = getWallHitsTarget(room)
    let ramparts = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_RAMPART && s.hits < hitsTarget)
    if (ramparts.length == 0) {
        return 0
    } else if (room.storage && room.storage.store[RESOURCE_ENERGY] > 200000) {
        return 3
    }
    return 1
}

function getTargetUpgraderCount(room) {
    let count = 1

    if (!room.storage) {
        let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
        if (containers.length > 0) {
            let sum = 0
            for (let container of containers) {
                sum += container.store[RESOURCE_ENERGY]
            }
            return Math.max(1, Math.ceil(sum / 1000))
        }
    }


    if (room.storage && room.storage.store[RESOURCE_ENERGY] > 200000) {
        count = Math.floor(room.storage.store[RESOURCE_ENERGY] / 100000)
    }

    return count
}

function getTargetRemoteHaulerCount(room, targetRemoteMinerCount) {
    if (room.storage) {
        return targetRemoteMinerCount
    }
    return 0
}

function getTargetHubCount(room) {
    if (room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK).length >= 2) {
        return 1
    }
    return 0
}

function getTargetMaintainerCount(room) {
    if (room.controller.level == 1) {
        return 0
    }
    return 1
}


function getTargetFastFillerCount(room) {
    if (room.storage && linkData[room.name].spawn && room.storage.store[RESOURCE_ENERGY] >= 10000) {
        return 4
    }
    return 0
}


/*

    1. Picks up energy from source (usually storage but container at early levels)
    2. Delivers energy to destinations (spawn, extension, towers)

    


*/

function getFillerBody(room) {
    const destinations = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_TOWER)
    let avgRange = 0;
    let ranges = [];
    if (room.storage) {
        ranges = destinations.map(d => d.getRangeTo(room.storage))

    } else {
        const sources = room.find(FIND_SOURCES)
        for (const source of sources) {
            ranges = ranges.concat(destinations.map(d => d.getRangeTo(source)))
        }
    }
    for (let range of ranges) {
        avgRange += range
    }
    avgRange /= ranges.length

    const capacities = destinations.map(d => d.store.getCapacity())
    let avgCapacity = 0
    for (const capacity of capacities) {
        avgCapacity += capacity
    }
    avgCapacity /= capacities.length



    const energy = room.energyCapacityAvailable

    const trips = Math.ceil(workToBeDone / buildPower / carryCapacity);
    const speed = Math.min(1, moveParts / (workParts + carryParts / 2));
    const travelTime = ((distance * 2) / speed) * trips;
    const workTime = (carryCapacity / buildPower) * trips;

    const time = travelTime + workTime;
    const costPerTick = (workParts * 100 + moveParts * 50 + carryParts * 50) / 1500;

    return [
        costPerTick * time,
        `${workParts}W/${moveParts}M/${carryParts}C: ${time.toFixed(0)} @ ${costPerTick.toFixed(2)}`
    ];





}

function getWallHitsTarget(room) {
    switch (room.controller.level) {
        case 8:
            return 20000000
        case 7:
            return 4000000
        case 6:
            return 3000000
        case 5:
            return 2000000
        default:
            return 1000000
    }
}

function initializeRoomData(room, miners, fillers) {
    const remoteMinerCount = getTargetRemoteMinerCount(room)
    creepSpawnInfo[room.name] = {
        targetCountsDefined: true,
        worker: new SpawnInfo(getTargetWorkerCount(room, miners, fillers)),

        filler: new SpawnInfo(getTargetFillerCount(room)),
        miner: new SpawnInfo(getTargetMinerCount(room)),
        builder: new SpawnInfo(getTargetBuilderCount(room)),
        wallBuilder: new SpawnInfo(getTargetWallBuilderCount(room)),
        hauler: new SpawnInfo(getTargetHaulerCount(room)),
        upgrader: new SpawnInfo(getTargetUpgraderCount(room)),
        soldier: new SpawnInfo(getTargetSoldierCount(room)),
        scout: new SpawnInfo(getTargetScoutCount(room)),//,
        remoteWorker: new SpawnInfo(getTargetRemoteWorkerCount(room)),
        remoteMiner: new SpawnInfo(remoteMinerCount),
        remoteHauler: new SpawnInfo(getTargetRemoteHaulerCount(room, remoteMinerCount)),
        reserver: new SpawnInfo(getTargetReserverCount(room)),
        claimer: new SpawnInfo(getTargetClaimerCount(room)),
        hub: new SpawnInfo(getTargetHubCount(room)),
        maintainer: new SpawnInfo(getTargetMaintainerCount(room)),
        fastFiller: new SpawnInfo(getTargetFastFillerCount(room)),
    }
}

module.exports = spawnCreeps