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
        generateSpawnQueue(roomHeap);
        if (!roomHeap.spawnQueue.length) {
            roomHeap.spawnQueueTimer = Game.time + 10;
        } else {
            roomHeap.spawnQueueTimer = Game.time + 100;
        }
    }

    if (!roomHeap.spawnQueue.length) {
        return
    }

    const spawns = roomHeap.structures[STRUCTURE_SPAWN];

    for (const spawn of spawns) {

        if (!spawn.spawning) {


            let so = roomHeap.spawnQueue[0]

            console.log('so:', JSON.stringify(so))

            // call spawn unit function here.
        }
    }

}

/**
 * Generates a new spawnQueue for the room based on target counts.
 * @param {Object} roomHeap 
 */
function generateSpawnQueue(roomHeap) {
    let spawnQueue = [];
    console.log('Creeps Required:',JSON.stringify(roomHeap.creepsRequired))
    for (const role of Object.keys(roomHeap.creepsRequired)) {

        const queueAmount = roomHeap.creeps[role] ? roomHeap.creepsRequired[role] - Object.values(roomHeap.creeps[role]).length : roomHeap.creepsRequired[role];
        if (queueAmount) {
            const priority = SPAWN_PRIORITY[role]
            const body = getBody(role, roomHeap)
            const options = {
                memory: {
                    role: role,
                    home: roomHeap.roomName
                }
            }
            const boosts = {} // Need a function to figure out if we want to boost creep.
            spawnQueue.push(new SpawnOrder(role, priority, body, options))
        }

    }

    if (spawnQueue.length) {
        spawnQueue = spawnQueue.sort((a, b) => a.priority - b.priority);
    }

    console.log('generated spawnQueue',JSON.stringify(spawnQueue))
    roomHeap.spawnQueue = spawnQueue;

}

function getSpawnOrder(roomHeap) {

}

module.exports = spawnManager;