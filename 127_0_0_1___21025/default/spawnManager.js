let MEMORY = require('memory');
const { getBody, SPAWN_PRIORITY, } = require('lib.spawn');
const { SpawnOrder } = require('./manageSpawns');


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

    if (Game.time >= roomHeap.spawnQueueTimer) {
        getSpawnQueue(roomHeap);
        if (!roomHeap.spawnQueue.length) {
            roomHeap.spawnQueueTimer = Game.time + 10;
        } else {
            roomHeap.spawnQueueTimer = Game.time + 100;
        }
    }

    if (!roomHeap.spawnQueue.length) {
        return
    }

    const spawns = roomHeap.structures[STRUCTURE_SPAWN].filter(s => !s.spawning);

    if (!spawns.length) {
        return;
    }

    for (const spawn of spawns) {

        let so = roomHeap.spawnQueue[roomHeap.spawnQueue.length - 1]

        console.log('so:', JSON.stringify(so))

        // call spawn unit function here.
        let ret = spawnCreep(spawn, so)

        if (ret !== 0) {
            return;
        }
        roomHeap.spawnQueue.pop()
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
function getSpawnQueue(roomHeap) {
    let spawnQueue = [];
    console.log('Creeps Required:', JSON.stringify(roomHeap.creepsRequired))
    // Check startup case:
    if ((!roomHeap.creeps.fillers || !roomHeap.creeps.fillers.length) && (!roomHeap.creeps.miners || !roomHeap.creeps.miners.length)) {

        spawnQueue = getBootSpawnQueue(roomHeap)

    }

    for (const role of Object.keys(roomHeap.creepsRequired)) {

        const queueAmount = roomHeap.creeps[role] ? roomHeap.creepsRequired[role] - Object.values(roomHeap.creeps[role]).length : roomHeap.creepsRequired[role];
        if (queueAmount) {
            const so = getSpawnOrder(role, roomHeap)

            spawnQueue.push(so)
        }

    }

    if (spawnQueue.length) {
        spawnQueue = spawnQueue.sort((a, b) => b.priority - a.priority);
    }

    console.log('generated spawnQueue', JSON.stringify(spawnQueue))
    roomHeap.spawnQueue = spawnQueue;

}

function getSpawnOrder(role, roomHeap) {
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
    let so = getSpawnOrder('miner', roomHeap);
    spawnQueue.push(so);
    so.priority = 3;

    for (let i = 1; i < minersReq; i++) {

        spawnQueue.push(so);

    }
    so = getSpawnOrder('filler', roomHeap);
    spawnQueue.push(so);
    so.priority = 4;


    for (let i = 1; i < fillersReq; i++) {
        spawnQueue.push(so);
    }

    return spawnQueue;

}

module.exports = spawnManager;