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
     */
    constructor(role, priority, body, options) {
        this.role = role;
        this.priority = priority;
        this.body = body;
        this.options = options;
        this.boosts = {};
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

    if (Game.time >= roomHeap.spawnData.spawnQueueTimer) {
        getSpawnQueue(room, roomHeap);
        if (!roomHeap.spawnData.spawnQueue.length) {
            roomHeap.spawnData.spawnQueueTimer = Game.time + 10;
        } else {
            roomHeap.spawnData.spawnQueueTimer = Game.time + 100;
        }
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
    let spawnQueue = [];
    // Check startup case:
    if (!roomHeap.creeps.filler.length || !roomHeap.creeps.miner.length) {

        spawnQueue = getBootSpawnQueue(roomHeap);
        if (DEBUG) {
            console.log('Got boot spawnQueue:', JSON.stringify(spawnQueue))
        }
    } else {

        const targetCounts = getTargetCounts(room, roomHeap);
        if (DEBUG) {
            console.log('Got targetCounts', JSON.stringify(targetCounts))
        }


        for (const role of Object.keys(targetCounts)) {

            const queueAmount = roomHeap.creeps[role] ? targetCounts[role] - Object.values(roomHeap.creeps[role]).length : targetCounts[role];
            if (queueAmount) {
                const so = getSpawnOrder(role, roomHeap)

                spawnQueue.push(so)
            }

        }
    }

    if (spawnQueue.length) {
        spawnQueue = spawnQueue.sort((a, b) => b.priority - a.priority);
    }

    roomHeap.spawnData.spawnQueue = spawnQueue;

}

function getSpawnOrder(role, roomHeap,) {
    const priority = SPAWN_PRIORITY[role]
    const body = getBody(role, roomHeap)
    const options = {
        memory: {
            role: role,
            home: roomHeap.roomName
        }
    }
    const boosts = {} // Need a function to figure out if we want to boost creep.
    return new SpawnOrder(role, priority, body, options)
}

function getBootSpawnQueue(roomHeap) {

    let spawnQueue = [];
    const minersReq = roomHeap.creepsRequired.miner;
    const fillersReq = roomHeap.creepsRequired.filler;
    const minerQty = roomHeap.creeps.miner.length;
    const fillerQty = roomHeap.creeps.filler.length;
    console.log('filletQty:', fillerQty)
    let so = getSpawnOrder('miner', roomHeap);
    if (minerQty === 0) {
        spawnQueue.push(so);
        so = { ...so }

    }

    so.priority = 3;

    for (let i = 1; i < minersReq; i++) {

        spawnQueue.push(so);

    }

    so = getSpawnOrder('filler', roomHeap);
    if (fillerQty === 0) {
        spawnQueue.push(so);
        so = { ...so }

    }

    so.priority = 4;

    if (fillerQty === 0) {
        for (let i = 1; i < fillersReq; i++) {
            spawnQueue.push(so);
        }
    }

    console.log('Returning bootSpawnQueue:', JSON.stringify(spawnQueue))
    return spawnQueue;

}

module.exports = spawnManager;