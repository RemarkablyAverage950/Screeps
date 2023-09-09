const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const TRANSPORTER_BASE_PARTS = [CARRY, CARRY, MOVE]
const SOLDIER_BASE_PARTS = [TOUGH, ATTACK, MOVE]
const HEALER_BASE_PARTS = [HEAL, HEAL, MOVE]
const SCOUT_BASE_PARTS = [MOVE]
const REMOTE_MINER_BASE_PARTS = [MOVE, WORK]
const REMOTE_TRANSPORTER_BASE_PARTS = [CARRY, MOVE]
const RESERVER_BASE_PARTS = [CLAIM, MOVE]
const HUB_BASE_PARTS = [MOVE, CARRY, CARRY, CARRY, CARRY]
const FILLER_BASE_PARTS = [MOVE, CARRY, CARRY]
const BUILDER_BASE_PARTS = [CARRY, CARRY, MOVE]
const WALLBUILDER_BASE_PARTS = [WORK, CARRY, MOVE]

/**
 * Spawns any required creeps
 * @param {Room} room Room object.
 * @param {Creep[]} creeps Creeps belonging to the room.
 * @param {StructureSpawn[]} spawns Spawns belonging to the room.
 */
function spawnCreeps(room, creeps, spawns) {
    let availableSpawns = spawns.filter(s => s.spawning == null)
    if (availableSpawns.length == 0 || room.memory.pauseSpawning == true) {
        return
    }
    const creepsCount = _.countBy(creeps, c => c.memory.role)
    const workers = creepsCount['worker'] || 0
    const fillers = creepsCount['filler'] || 0
    const upgraders = creepsCount['upgrader'] || 0
    const miners = creepsCount['miner'] || 0
    const builders = creepsCount['builder'] || 0
    const transporters = creepsCount['transporter'] || 0
    const soldiers = creepsCount['soldier'] || 0
    const healers = creepsCount['healer'] || 0
    const scouts = creepsCount['scout'] || 0
    const remoteMiners = creepsCount['remoteMiner'] || 0
    const remoteWorkers = creepsCount['remoteWorker'] || 0
    const remoteTransporters = creepsCount['remoteTransporter'] || 0
    const reservers = creepsCount['reserver'] || 0
    const claimers = creepsCount['claimer'] || 0
    const hubCreeps = creepsCount['hub'] || 0
    const wallBuilders = creepsCount['wallBuilder'] || 0

    const targetWorkerCount = getTargetWorkerCount(room, miners, fillers);
    const targetFillerCount = 2
    const targetMinerCount = getTargetMinerCount(room);
    let targetBuilderCount = 0
    if (room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
        targetBuilderCount++
    }
    let targetWallBuilderCount = 0
    if (room.controller.level >= 3) {
        targetWallBuilderCount = 1
    }
    const targetTransporterCount = getTargetTransporterCount(room)
    let targetUpgraderCount = 1;
    if (room.storage && room.storage.store[RESOURCE_ENERGY] > 200000) {
        targetUpgraderCount += 2
        targetWallBuilderCount += 2
    }
    const targetSoldierCount = getTargetSoldierCount(room)
    const targetHealerCount = 0//room.memory.targetHealers
    const targetScoutCount = 0//getTargetScoutCount(room)
    const targetRemoteWorkerCount = getTargetRemoteWorkerCount(room)
    const targetRemoteMinerCount = getTargetRemoteMinerCount(room)
    let targetRemoteTransporterCount = 0
    if (room.storage) {
        targetRemoteTransporterCount = targetRemoteMinerCount
    }//getRemoteTransportCount(room)
    const targetReserverCount = getTargetReserverCount(room)
    const targetClaimerCount = getTargetClaimerCount(room)
    let targetHubCount = 0
    if (room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK).length >= 2) {
        targetHubCount = 1
    }

    const maxSpawnEnergy = room.energyCapacityAvailable
    //console.log(targetRemoteWorkerCount,targetRemoteMinerCount,targetRemoteTransporterCount)

    for (let spawn of availableSpawns) {
        if (workers < targetWorkerCount) {
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
            for (let i = 0; i < targetWorkerCount; i++) {
                let name = 'Worker_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) {
                    continue
                };
            }
        } if (fillers < targetFillerCount) {
            let body;
            body = buildBody(FILLER_BASE_PARTS, 8, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'filler',
                    moving: false,
                }
            };
            for (let i = 0; i < targetFillerCount; i++) {
                let name = 'Filler_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) {
                    continue
                };
            }
        } else if (miners < targetMinerCount) {

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
            for (let i = 0; i < targetMinerCount; i++) {
                let name = 'Miner_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (builders < targetBuilderCount) {

            let body = buildBody(BUILDER_BASE_PARTS, 4, maxSpawnEnergy - 250);
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
            for (let i = 0; i < targetBuilderCount; i++) {
                let name = 'Builder_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (healers < targetHealerCount) {
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
        } else if (wallBuilders < targetWallBuilderCount) {

            let body = buildBody(WORKER_BASE_PARTS, 20, maxSpawnEnergy);

            let options = {
                memory: {
                    home: room.name,
                    role: 'wallBuilder',
                    moving: false
                }
            };
            for (let i = 0; i < targetWallBuilderCount; i++) {
                let name = 'WallBuilder_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (upgraders < targetUpgraderCount) {
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
            for (let i = 0; i < targetUpgraderCount; i++) {
                let name = 'Upgrader_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (transporters < targetTransporterCount) {
            let body = buildBody(TRANSPORTER_BASE_PARTS, 6, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'transporter',
                    needTask: true,
                    refill: true,
                    preReq: {},
                    moving: false,
                    tasks: [],
                }
            };
            for (let i = 0; i < targetTransporterCount; i++) {
                let name = 'Transporter_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (hubCreeps < targetHubCount) {
            console.log('ATTEMPTING TO SPAWN HUB CREEP')
            let body = buildBody(HUB_BASE_PARTS, 1, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'hub',
                    moving: false,
                }
            };
            console.log(body)
            for (let i = 0; i < targetHubCount; i++) {
                let name = 'Hub_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (soldiers < targetSoldierCount) {
            let body = buildBody(SOLDIER_BASE_PARTS, 20, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'soldier',
                    needTask: true,
                    moving: false,
                    targetRoom: undefined
                }
            };
            for (let i = 0; i < targetSoldierCount; i++) {
                let name = 'Soldier_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (scouts < targetScoutCount) {
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
            for (let i = 0; i < targetScoutCount; i++) {
                let name = 'Scout_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (remoteWorkers < targetRemoteWorkerCount) {
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
            for (let i = 0; i < targetRemoteWorkerCount; i++) {
                let name = 'RemoteWorker_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        }
        else if (remoteMiners < targetRemoteMinerCount) {
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
            for (let i = 0; i < targetRemoteMinerCount; i++) {
                let name = 'RemoteMiner_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (remoteTransporters < targetRemoteTransporterCount) {
            let body = buildBody(TRANSPORTER_BASE_PARTS, 10, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'remoteTransporter',
                    moving: false,
                    tasks: [],
                    target: undefined,
                    needTask: true,
                    targetRoom: undefined
                }
            };
            for (let i = 0; i < targetRemoteTransporterCount; i++) {
                let name = 'RemoteTransporter_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (claimers < targetClaimerCount) {
            let body = buildBody(RESERVER_BASE_PARTS, 1, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'claimer',
                    moving: false,
                    targetRoom: undefined,
                }
            };
            for (let i = 0; i < targetClaimerCount; i++) {
                let name = 'Claimer_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else if (reservers < targetReserverCount && maxSpawnEnergy >= 1300) {
            let body = buildBody(RESERVER_BASE_PARTS, 99, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'reserver',
                    moving: false,
                    targetRoom: undefined,
                }
            };
            for (let i = 0; i < targetReserverCount; i++) {
                let name = 'Reserver_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) continue;
            }
        } else {
            if (room.memory.occupy) {
                for (const targetRoom of room.memory.occupy) {
                    if (!creeps.some(c => c.memory.role == 'soldier' && c.memory.targetRoom == targetRoom)) {
                        let body = buildBody(SOLDIER_BASE_PARTS, Infinity, maxSpawnEnergy)
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


function getUpgraderSize(room) {
    let blockCount = 6
    if (room.storage && room.storage.store[RESOURCE_ENERGY] > 200000) {
        blockCount = 10
    }
    return blockCount;
}

function getTargetTransporterCount(room) {

    let structures = room.find(FIND_STRUCTURES)
    let storages = structures.filter(s => s.structureType == STRUCTURE_STORAGE)
    let containers = structures.filter(s => s.structureType == STRUCTURE_CONTAINER)

    if (storages.length > 0) {

        let energy = _.sum(containers, c => c.store[RESOURCE_ENERGY])
        return Math.floor(energy / 1500)
    } else {
        return 0;
    }
}


/**
 * @param {Room} room Room object.
 * @returns {number} The target number of workers for a room.
 */
function getTargetWorkerCount(room, miners, fillers) {
    let count = 0
    if (miners == 0 || fillers == 0) {
        count = 2
    }
    return count
}

/**
 * @param {Room} room Room object.
 * @returns {number} The target number of miners for a room.
 */
function getTargetMinerCount(room) {

    if (!room.memory.targetMinerCount || Game.time % 101 == 0) {
        let sources = room.find(FIND_SOURCES);
        let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER);
        let count = 0;
        for (let source of sources) {
            for (let container of containers) {
                if (source.pos.isNearTo(container)) {
                    count++;
                }
            }
        }
        room.memory.targetMinerCount = count
    };

    return room.memory.targetMinerCount
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
    baseParts.forEach(p => {
        blockCost += BODYPART_COST[p]
    })
    for (let i = 0; i < maxBlocks; i++) {
        if (energyAvailable < blockCost) {
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
    if (room.controller.level < 3 || room.controller.level == 8) return 0;
    if (room.memory.neighbors && room.memory.neighbors.length > 100) return 0;

    return 1
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
    if (room.memory.claimRoom && Game.rooms[room.memory.claimRoom].find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_SPAWN)) {
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
    for (let outpost in room.memory.outposts) {
        if (!Game.rooms[outpost]) continue;
        let hostiles = Game.rooms[outpost].find(FIND_HOSTILE_CREEPS)
        if (hostiles.length > 0) {
            count++
        }
    }
    let claimRoom = Game.rooms[room.memory.claimRoom]

    if (claimRoom) {
        let hostiles = claimRoom.find(FIND_HOSTILE_CREEPS).concat(claimRoom.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER))
        if (hostiles.length > 0) {
            count++
        }
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

module.exports = spawnCreeps