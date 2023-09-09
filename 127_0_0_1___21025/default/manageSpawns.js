let MEMORY = require('memory');


class SpawnOrder {
    /**
     * @constructor
     * @param {string} role 
     * @param {number} priority 
     * @param {BodyPartConstant[]} body 
     * @param {object} options 
     */
    constructor(role, priority, body, options) {
        this.role = role;
        this.priority = priority;
        this.body = body;
        this.options = options;
    }
}

const SPAWN_TIMER_SET_VALUE = 10;


/**
 * Sets target unit counts and spawns creeps.
 * @param {Room} room Room object.
 * @param {Creep[]} creeps Creeps belonging to the room.
 */
function manageSpawns(room, creeps) {

    // Check if spawns are available
    const availableSpawns = room.find(FIND_MY_SPAWNS).filter(s => s.spawning === null);
    console.log('availableSpawns',availableSpawns.map(s=> s.name))
    if (availableSpawns.length === 0) return;

    let spawnQueue = MEMORY.ROOMS[room.name].spawnQueue;
    console.log('starting tick', Game.time, 'with spawnQueue', spawnQueue.map(q => q.role))

    if (MEMORY.ROOMS[room.name].spawnTimer > 0) {

        MEMORY.ROOMS[room.name].spawnTimer -= 1;
        spawnQueue.push(...getSpawnQueue(room, creeps, true, spawnQueue));

    } else if (spawnQueue.length === 0) {

        spawnQueue = getSpawnQueue(room, creeps, false, spawnQueue);

    } else {

        spawnQueue.push(...getSpawnQueue(room, creeps, true, spawnQueue));

    }

    MEMORY.ROOMS[room.name].spawnQueue = spawnQueue;

    if (spawnQueue.length === 0) {
        MEMORY.ROOMS[room.name].spawnTimer = SPAWN_TIMER_SET_VALUE;
        return;
    }
    console.log('spawnTimer', MEMORY.ROOMS[room.name].spawnTimer)
    //console.log('new spawnQueue', spawnQueue.map(q => q.role))

    for (let spawn of availableSpawns) {

        let ret = undefined;

        if (spawnQueue.length === 0) {
            return;
        }

        for (let priority = 1; priority <= 5; priority++) {

            if (ret == 0) {
                // Successful
                break;
            }

            for (let i = 0; i < spawnQueue.length; i++) {

                if (spawnQueue[i].priority === priority) {

                    // Attempt to spawn the order

                    const name = getCreepName(room.name, spawnQueue[i].role)

                    ret = spawn.spawnCreep(spawnQueue[i].body, name, spawnQueue[i].options)

                    if (ret == 0) {
                        // Successful
                        spawnQueue.splice(i, 1)
                        MEMORY.ROOMS[room.name].spawnQueue = spawnQueue;
                        break;

                    } else if (ret != -6) {
                        console.log('Spawning failed for ' + name + ' with code ' + ret)
                        return;
                    } else {
                        return;
                    }

                };

            };
        };

    };


};

/**
 * Generates spawn orders.
 * Essential creeps are workers,miners,fillers.
 * @param {Room} room 
 * @param {Creep[]} creeps 
 * @param {boolean} onlyEssential True if we are only checking essential creeps.
 * @param {SpawnOrder[]} existingSpawnQueue
 * @returns {SpawnOrder[]}
 */
function getSpawnQueue(room, creeps, onlyEssential, existingSpawnQueue) {

    const energyBudget = room.energyCapacityAvailable;

    let spawnQueue = [];

    let creepsCount = _.countBy(creeps, c => c.memory.role);
    let workerCount = creepsCount['worker'] || 0;
    let minerCount = creepsCount['miner'] || 0;
    let fillerCount = creepsCount['filler'] || 0;

    const targetWorkerCount = getTargetCount.worker(minerCount, fillerCount);
    const targetMinerCount = getTargetCount.miner(room);
    const targetFillerCount = getTargetCount.filler();

    for (let order of existingSpawnQueue) {

        const role = order.role;

        if (role === 'worker') {

            workerCount++;

        } else if (role === 'miner') {

            minerCount++;

        } else if (role === 'filler') {

            fillerCount++;

        };

    };

    //console.log('worker:', workerCount, '/', targetWorkerCount, workerCount < targetWorkerCount, 'miner:', minerCount, '/', targetMinerCount, minerCount < targetMinerCount, 'filler:', fillerCount, '/', targetFillerCount, fillerCount < targetFillerCount)

    let body = [];
    let options = undefined;
    while (workerCount < targetWorkerCount) {

        if (workerCount == 0) {
            body = getBody.worker(room.energyAvailable)

            if (body.length === 0) return spawnQueue;

            options = {
                memory: {
                    role: 'worker',
                    home: room.name,
                },
            }

        } else if (body.length === 0) {
            body = getBody.worker(energyBudget)

            options = {
                memory: {
                    role: 'worker',
                    home: room.name,
                },
            }

        }
        console.log('Worker body generated',body)
        spawnQueue.push(new SpawnOrder('worker', 1, body, options));
        workerCount++;

    };

    body = [];
    while (minerCount < targetMinerCount) {

        if (body.length === 0) {
            body = getBody.miner(energyBudget)
            options = {
                memory: {
                    role: 'miner',
                    home: room.name,
                },
            }
            console.log('Miner body generated',body)
        }

        spawnQueue.push(new SpawnOrder('miner', 2, body, options));
        minerCount++;

    };

    body = [];
    while (fillerCount < targetFillerCount) {

        if (body.length === 0) {
            body = getBody.filler(energyBudget, room)
            options = {
                memory: {
                    role: 'filler',
                    home: room.name,
                },
            }
            console.log('Filler body generated',body)
        }

        spawnQueue.push(new SpawnOrder('filler', 3, body, options));
        fillerCount++;
    };

    if (onlyEssential) return spawnQueue;



    return spawnQueue;

};

/*  BODYPART_COSTS:
        move: 50,
        work: 100,
        attack: 80,
        carry: 50,
        heal: 250,
        ranged_attack: 150,
        tough: 10,
        claim: 600,
*/
const getBody = {

    /**
     * Generates a body for a filler.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    filler: function (budget) {

        const bodyPartBlock = [CARRY, CARRY, MOVE];
        const blockCost = 150;
        const targetCapacity = budget / 2;

        let cost = 0;
        let capacity = 0;
        let body = []

        while (cost + blockCost <= budget && capacity < targetCapacity) {
            body.push(...bodyPartBlock)
            cost += blockCost;
            capacity += 100;
        }

        return body;

    },

    /**
     * Generates a body for a miner.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    miner: function (budget) {

        let cost = 150;
        let workCount = 1;
        let body = [];

        while (cost + 100 <= budget) {
            workCount++;
            cost += 100;
        };

        for (let i = 0; i < workCount; i++) {
            body.push(WORK)
        }

        body.push(MOVE);

        return body;

    },

    /**
     * Generates a body for a worker.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    worker: function (budget) {
        const blockCost = 200;
        let totalCost = 0;
        let workParts = 0;
        let carryParts = 0;
        let moveParts = 0;
        let body = [];

        while (totalCost + blockCost <= budget) {
            workParts++;
            carryParts++;
            moveParts++;
            totalCost += blockCost;
        };

        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        };

        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        };

        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        };

        return body;

    },

}

/**
 * Generates a name for a creep.
 * @param {string} roomName 
 * @param {string} role 
 * @returns {string}
 */
function getCreepName(roomName, role) {

    for (let i = 0; i < 10; i++) {

        const name = roomName + '_' + role + '_' + i;

        if (!Game.creeps[name]) {
            return name;
        };

    };

}

const getTargetCount = {

    /**
     * Returns the target number of fillers. 
     * @returns {number} Hardcoded to 2.
     */
    filler: function () {

        return 2;

    },

    /**
     * Returns the target number of miners.
     * @param {Room} room 
     * @returns {number}
     */
    miner: function (room) {

        return room.find(FIND_SOURCES).length;

    },

    /**
    * Returns the target number of workers.
    * @param {number} minerCount 
    * @param {number} fillerCount 
    * @returns {number} 
    */
    worker: function (minerCount, fillerCount) {

        let count = 0;

        if (minerCount === 0) count++;
        if (fillerCount === 0) count++;

        return count;

    },

}


module.exports = manageSpawns;