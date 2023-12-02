let MEMORY = require('memory');
const { getBody, SPAWN_PRIORITY, getTargetCounts } = require('lib.spawn');
const lib = require('lib');

const DEBUG = 1;

class SpawnOrder {
    /**
     * @constructor
     * @param {string} role 
     * @param {number} priority 
     * @param {BodyPartConstant[]} body 
     * @param {object} options 
     * @param {boolean} allowMinimum
     */
    constructor(role, priority, body, options, allowMinimum) {
        this.role = role;
        this.priority = priority;
        this.body = body;
        this.options = options;
        this.boosts = {};
        this.allowMinimum = allowMinimum;
    }
}

/*
    spawnData object structure:

       spawnData: {
            targetCounts: {},
            bodies: {},
            spawnQueueTimer: Game.time,
            spawnQueue: [],
        },
*/

/**
 * Driving function for this module.
 * 
 * This function checks if there is available spawns. 
 * If there is availability, then it pulls the next spawn order.
 * If there is no spawn orders enqueued and the spawnTimer has expired, it will generate an updated spawnQueue.
 * 
 * If there is a spawnQueue at this point, it will spawn the creep.  
 * 
 * @param {Room} room 
 * @param {Object} roomHeap 
 */
function spawnManager(room, roomHeap) {

    if (DEBUG) {
        //console.log('Entering spawnManager')
    }

    if (Game.time >= roomHeap.spawnData.spawnQueueTimer) {
        getSpawnQueue(room, roomHeap);
        if (!roomHeap.spawnData.spawnQueue.length) {
            roomHeap.spawnData.spawnQueueTimer = Game.time + 10;
        } else {
            roomHeap.spawnData.spawnQueueTimer = Game.time + 100;
        }
    }
    if (DEBUG) {
        //console.log(room.name, 'spawnData', JSON.stringify(roomHeap.spawnData))
    }
    if (!roomHeap.spawnData.spawnQueue.length) {
        return
    }

    const spawns = lib.getStructures(room, [STRUCTURE_SPAWN]).filter(s => !s.spawning);

    if (!spawns.length) {
        return;
    }

    for (const spawn of spawns) {

        let so = roomHeap.spawnData.spawnQueue[roomHeap.spawnData.spawnQueue.length - 1]


        // call spawn unit function here.
        let ret = spawnCreep(spawn, so)

        if (ret !== 0) {
            return;
        }

        roomHeap.spawnData.spawnQueue.pop()
        console.log(spawn.name, 'spawning new', so.role);

    }
}


/**
 * Attempts to spawn the spawn order. Returns the spawnCreep return code.
 * @param {StructureSpawn} spawn 
 * @param {SpawnOrder} so 
 * @returns {number}
 */
function spawnCreep(spawn, so) {

    const name = getName(so, spawn.room.name)
    if (so.allowMinimum) {
        if (spawn.spawnCreep(so.body, name, so.options) === 0) {
            return 0;
        }
        const energyAvailable = spawn.room.energyAvailable;
        let canReduce = true;

        const newSo = { ...so }
        while (canReduce) {
            let cost = 0;
            for (let part of newSo.body) {
                cost += BODYPART_COST[part]
            }
            if (cost <= energyAvailable) {
                spawn.spawnCreep(newSo.body, name, newSo.options)
                so.allowMinimum = false;
                console.log(spawn.name, 'spawning new', newSo.role);
                return 98;
            } else {
                let workParts = newSo.body.filter(p => p === WORK).length;
                let moveParts = newSo.body.filter(p => p === MOVE).length;
                let carryParts = newSo.body.filter(p => p === CARRY).length;
                let body = [];
                if (workParts <= 1 && carryParts <= 1 && moveParts <= 1) {
                    canReduce = false
                    return 99;
                }

                if (workParts > 1) {
                    workParts = Math.ceil(workParts / 2);
                }
                if (carryParts > 1) {
                    carryParts = Math.ceil(carryParts / 2);
                } if (moveParts > 1) {
                    moveParts = Math.ceil(moveParts / 2);
                }
                for (let i = 0; i < workParts; i++) {
                    body.push(WORK)
                }
                for (let i = 0; i < carryParts; i++) {
                    body.push(CARRY)
                }
                for (let i = 0; i < moveParts; i++) {
                    body.push(MOVE)
                }
                newSo.body = body;
            }


        }
    }
    return spawn.spawnCreep(so.body, name, so.options)


}

function getName(so, roomName) {
    //so: {"role":"miner","priority":1,"body":["work","work","move"],"options":{"memory":{"role":"miner","home":"W5N3"}},"boosts":{}}
    let i = 0;
    while (true) {
        const name = roomName + '_' + so.role + '_' + i
        if (!Game.creeps[name]) {
            return name
        }
        i++
    }
}

/**
 * Generates a new spawnQueue for the room based on target counts.
 * @param {Object} roomHeap 
 */
function getSpawnQueue(room, roomHeap) {

    if (DEBUG) {
        //console.log('Entering getSpawnQueue')
    }

    let spawnQueue = roomHeap.spawnData.spawnQueue;
    const targetCounts = getTargetCounts(room, roomHeap);
    // Check startup case:

    if (!roomHeap.creeps.filler.length || !roomHeap.creeps.miner.length) {

        spawnQueue.push(...getBootSpawnQueue(roomHeap, targetCounts));
        if (DEBUG) {
            console.log('Got boot spawnQueue:', JSON.stringify(spawnQueue))
        }
    } else {


        if (DEBUG) {
            console.log('Got targetCounts', JSON.stringify(targetCounts))
        }

        const spawnQueueCounts = _.countBy(spawnQueue, s => s.role)

        for (const role of Object.keys(targetCounts)) {
            let so;
            let spawnQueueCount = spawnQueueCounts[role] || 0;
            let queueAmount = (roomHeap.creeps[role] ? targetCounts[role] - roomHeap.creeps[role].length : targetCounts[role]) - spawnQueueCount;

            if (DEBUG) {
                console.log('checking role', role, '- spawnQueueCounts:', spawnQueueCount, '- queueAmount', queueAmount);
            }

            if (queueAmount > 0) {
                so = getSpawnOrder(role, room, roomHeap)
            }

            while (queueAmount > 0) {
                spawnQueue.push(so)
                queueAmount--;
            }
        }
    }

    if (spawnQueue.length) {
        spawnQueue = spawnQueue.sort((a, b) => b.priority - a.priority);
    }

    if (DEBUG) {
        console.log('spawnQueue:', JSON.stringify(spawnQueue));
        console.log('spawnQueueCounts:', JSON.stringify(spawnQueue.map(s => s.role)));
    }

    roomHeap.spawnData.spawnQueue = spawnQueue;

}

function getSpawnOrder(role, room, roomHeap, allowMinimum = false) {
    const priority = SPAWN_PRIORITY[role]
    const body = getBody(role, roomHeap, room)
    const options = {
        memory: {
            role: role,
            home: roomHeap.roomName
        }
    }
    const boosts = {} // Need a function to figure out if we want to boost creep.
    return new SpawnOrder(role, priority, body, options, allowMinimum)
}

function getBootSpawnQueue(roomHeap) {

    let spawnQueue = [];

    const minerQty = roomHeap.creeps.miner.length;
    const fillerQty = roomHeap.creeps.filler.length;

    if (minerQty === 0) {
        spawnQueue.push(getSpawnOrder('miner', room, roomHeap, true));
    }

    if (fillerQty === 0) {
        spawnQueue.push(getSpawnOrder('filler', room, roomHeap, true));
    }

    return spawnQueue;

}

module.exports = spawnManager;