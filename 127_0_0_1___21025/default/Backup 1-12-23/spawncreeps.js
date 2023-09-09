const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const TRANSPORTER_BASE_PARTS = [CARRY, CARRY, MOVE]



/**
 * Spawns any required creeps
 * @param {Room} room Room object.
 * @param {Creep[]} creeps Creeps belonging to the room.
 * @param {StructureSpawn[]} spawns Spawns belonging to the room.
 */
function spawnCreeps(room, creeps, spawns) {
    const creepsCount = _.countBy(creeps, c => c.memory.role)
    const workers = creepsCount['worker'] || 0
    const upgraders = creepsCount['upgrader'] || 0
    const miners = creepsCount['miner'] || 0
    const transporters = creepsCount['transporter'] || 0
    const targetWorkerCount = getTargetWorkerCount(room);
    const targetMinerCount = getTargetMinerCount(room);
    const targetTransporterCount = getTargetTransporterCount(room)
    const targetUpgraderCount = 1;
    const maxSpawnEnergy = room.energyCapacityAvailable
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
                    refill: true
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
                    preReq: {}
                }
            };
            for (let i = 0; i < targetMinerCount; i++) {
                let name = 'Miner_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        } else if (upgraders < targetUpgraderCount) {
            let body = buildBody(WORKER_BASE_PARTS, 3, maxSpawnEnergy)
            let options = {
                memory: {
                    home: room.name,
                    role: 'upgrader',
                    needTask: true,
                    refill: true
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
                    moving: true
                }
            };
            for (let i = 0; i < targetTransporterCount; i++) {
                let name = 'Transporter_' + room.name + '_' + i
                if (spawn.spawnCreep(body, name, options) === 0) break;
            }
        }
    }
}

function getTargetTransporterCount(room) {
    let controller = room.controller;
    if (!controller) return 0;
    let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.pos.getRangeTo(controller) > 3)
    let controllerContainers = controller.pos.findInRange(FIND_STRUCTURES, 3, {
        filter: (structure) => structure.structureType == STRUCTURE_CONTAINER
    });

    if (controllerContainers.length > 0) {

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
    let maxWorkerCount = 6;
    let energyAvailable = room.energyCapacityAvailable
    let workPartsPerWorker = Math.floor(energyAvailable / 200)
    let targetWorkParts = 10
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



module.exports = spawnCreeps