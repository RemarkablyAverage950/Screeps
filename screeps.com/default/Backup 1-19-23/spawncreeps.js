const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const TRANSPORTER_BASE_PARTS = [CARRY, CARRY, MOVE]
const SOLDIER_BASE_PARTS = [TOUGH, ATTACK, MOVE]
const HEALER_BASE_PARTS = [HEAL, HEAL, MOVE]
const SCOUT_BASE_PARTS = [MOVE]



/**
 * Spawns any required creeps
 * @param {Room} room Room object.
 * @param {Creep[]} creeps Creeps belonging to the room.
 * @param {StructureSpawn[]} spawns Spawns belonging to the room.
 */
function spawnCreeps(room, creeps, spawns) {
    if (room.memory.pauseSpawning == true) {
        //return
    }
    const creepsCount = _.countBy(creeps, c => c.memory.role)
    const workers = creepsCount['worker'] || 0
    const upgraders = creepsCount['upgrader'] || 0
    const miners = creepsCount['miner'] || 0
    const transporters = creepsCount['transporter'] || 0
    const soldiers = creepsCount['soldier'] || 0
    const healers = creepsCount['healer'] || 0
    const scouts = creepsCount['scout'] || 0
    const targetWorkerCount = getTargetWorkerCount(room);
    const targetMinerCount = getTargetMinerCount(room);
    const targetTransporterCount = getTargetTransporterCount(room)
    const targetUpgraderCount = 1;
    const targetSoldierCount = 0//room.memory.targetSoldiers
    const targetHealerCount = 0//room.memory.targetHealers
    const targetScoutCount = getTargetScoutCount(room)
    const maxSpawnEnergy = room.energyCapacityAvailable
    let soldierCreeps = creeps.filter(c => c.memory.role == 'soldier')
    for (let c of soldierCreeps) {
        console.log(c.pos)
    }

    for (let spawn of spawns) {
        if (workers < targetWorkerCount) {
            let body;
            if (workers == 0) {
                body = buildBody(WORKER_BASE_PARTS, 5, room.energyAvailable)
            } else {
                body = buildBody(WORKER_BASE_PARTS, 5, maxSpawnEnergy)
            }
            let options = {
                memory: {
                    home: room.name,
                    role: 'worker',
                    needTask: true,
                    refill: true,
                    tasks: [],
                    storeForecast: { energy: 0 },
                    positionForecast: []
                }
            };
            for (let i = 0; i < targetWorkerCount; i++) {
                let name = 'Worker_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) {
                    break
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
                    preReq: {},
                    tasks: []
                }
            };
            for (let i = 0; i < targetMinerCount; i++) {
                let name = 'Miner_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        } else if (healers < targetHealerCount) {
            console.log('A')
            let body = buildBody(HEALER_BASE_PARTS, Infinity, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'healer',
                    task: 'defendHome',
                    tasks: []
                }
            }
            for (let i = 0; i < targetHealerCount; i++) {
                let name = 'Healer_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        } else if (soldiers < targetSoldierCount) {
            console.log('B')
            let body = buildBody(SOLDIER_BASE_PARTS, Infinity, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'soldier',
                    task: 'defendHome',
                    tasks: []
                }
            }
            for (let i = 0; i < targetSoldierCount; i++) {
                let name = 'Soldier_' + room.name + '_' + i
                let ret = spawn.spawnCreep(body, name, options)
                console.log(ret)
                if (ret === 0) break;
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
                    tasks: [],
                    storeForecast: { energy: 0 }
                }
            };
            for (let i = 0; i < targetUpgraderCount; i++) {
                let name = 'Upgrader_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        } else if (transporters < targetTransporterCount) {
            let body = buildBody(TRANSPORTER_BASE_PARTS, 4, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'transporter',
                    needTask: true,
                    refill: true,
                    preReq: {},
                    moving: true,
                    tasks: [],
                    storeForecast: { energy: 0 }
                }
            };
            for (let i = 0; i < targetTransporterCount; i++) {
                let name = 'Transporter_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        } else if (scouts < targetScoutCount) {
            let body = buildBody(SCOUT_BASE_PARTS, 1, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'scout',
                    moving: true,
                    target: room.name,
                    tasks: []
                }
            };
            for (let i = 0; i < targetScoutCount; i++) {
                let name = 'Scout_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        }
    }
}

function getUpgraderSize(room) {
    const sources = room.find(FIND_SOURCES)
    const containers = room.find(FIND_STRUCTURES).filter(s => {
        let nearSource = false
        for (let source of sources) {
            if (s.pos.isNearTo(source)) {
                nearSource = true
            }
        }
        return s.structureType == STRUCTURE_CONTAINER && nearSource
    })
    let energy = 0
    containers.forEach(c => {
        energy += c.store[RESOURCE_ENERGY]
    })

    if (energy > 2000) return 5;
    return 3;
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
function getTargetWorkerCount(room) {
    let minWorkerCount = 2;
    let maxWorkerCount = 8;
    let energyAvailable = room.energyCapacityAvailable
    let workPartsPerWorker = Math.floor(energyAvailable / 200)
    const targetWorkParts = 15
    let optimalWorkerCount = Math.ceil(targetWorkParts / workPartsPerWorker);
    return Math.max(minWorkerCount, Math.min(optimalWorkerCount, maxWorkerCount));
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
    body.sort((a, b) => (a - b))
    return body
}

/**
 * 
 * @param {Room} room 
 * @returns {number} The target number of scouts to spawn.
 */
function getTargetScoutCount(room) {
    return 0
    // Only spawn for levels 3-7. At level 8 we will build and use an observer.
    if (room.controller.level < 3 || room.controller.level == 8) return 0;
    if (room.memory.neighbors && room.memory.neighbors.length > 100) return 0;

    return 1
}


module.exports = spawnCreeps