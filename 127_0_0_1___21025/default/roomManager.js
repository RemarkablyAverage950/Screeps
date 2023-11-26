const assignTask = require('creepTask.assign');
const validateTask = require('creepTask.validate');
const { getTargetCount } = require('lib.spawn');
let MEMORY = require('memory');
const getRequests = require('roomManager.requests');
const spawnManager = require('spawnManager');
const executeTask = require('creepTask.execute');

function roomManager(roomName) {

    const room = Game.rooms[roomName]

    if (!MEMORY.rooms[room.name] || Game.time % 10000 === 0) {
        initializeRoomMemory(room)
        console.log('Initialized MEMORY for', roomName)
    }

    // Set up harvest directive

    let roomHeap = MEMORY.rooms[room.name];

    updateRoomMemory(room, roomHeap);
    spawnManager(room, roomHeap);
    manageCreepTasks(room, roomHeap)
    //assignCreepsTasks(room, roomHeap)


    // Set directives


    if (!roomHeap.directives) {
        //roomHeap.directive = getDirective(room, roomHeap)
    }



    /* requests:
         Harvest sources
         Upgrade controllers
         Build
         Mine minerals
         Spawn creeps
         Boost creeps
         clean up room

     */



}

class Request {
    constructor(type, id, qty, resourceType) {
        this.type = type;
        this.id = id;
        this.qty = qty;
        this.resourceType = resourceType;
    }
}

/**
 * Sets up room memory with static information.
 * @param {Room} room 
 */
function initializeRoomMemory(room) {

    // Set controller cache
    const controllerCache = getControllerCache(room);

    // Set sources cache
    const sourceCache = getSourcesCache(room)

    if (!room.memory.outposts) {
        room.memory.outposts = [];

    }

    let roomHeap = {
        bodies: {},
        constructionSites: {},
        constructionSiteCount: 0,
        controller: controllerCache,
        creeps: {
            builder: [],
            filler: [],
            hauler: [],
            miner: [],
            scout: [],
            upgrader: [],
        },
        creepsRequired: {},
        directives: {},
        droppedResources: {},
        energyAvailable: room.energyCapacityAvailable, // Set to max, will get actual checked against this value and generate fill tasks if needed.
        energyCapacityAvailable: room.energyCapacityAvailable,
        energyPerSource: 3000,
        hostileCreeps: [],
        interiorTiles: [],
        missions: [],
        outposts: {},
        requests: {
            fill: [],
            transfer: {
                // resourceConstant: [],
            },
            pickup: {
                //resourceConstant: [],
            },
            build: {
                queue: [],
                target: undefined,
            },
            dismantle: {
                queue: [],
                target: undefined,
            },
            lab: {
                boostQueue: [],
                reactQueue: [],
            }


        },
        roomName: room.name,
        sources: sourceCache,
        spawnQueue: [],
        spawnQueueTimer: Game.time,
        structureCount: 0,
        structures: undefined,
    }

    roomHeap.directives.harvest = [];
    // Set up basic room directives.
    for (const so of Object.values(roomHeap.sources)) {
        roomHeap.directives.harvest.push({
            id: so.id,
            maxQty: 3000,
        })
    }

    MEMORY.rooms[room.name] = roomHeap
}

function updateRoomMemory(room, roomHeap) {


    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);

    // Set creeps cache
    roomHeap.creeps = getCreepsCache(room, roomHeap);
    //roomHeap.structures = getStructuresCache(structures);
    roomHeap.constructionSites = getConstructionSiteCache(sites)




}

/**
 * Returns an object of construction sites, seperated by structureType to cache. Example: {STRUCTURE_EXTENSION: [extension0, extension1], STRUCTURE_SPAWN: [spawn0]}
 * @param {Structure[]} structures 
 * @returns {Object}
 */
function getConstructionSiteCache(constructionSites) {

    let cache = {};

    for (const s of constructionSites) {

        if (s.structureType === STRUCTURE_CONTROLLER) {
            continue;
        }

        if (!cache[s.structureType]) {
            cache[s.structureType] = [s];
        } else {
            cache[s.structureType].push(s)
        }
    }

    return cache;

}

/**
 * Returns an object of controller data to cache.
 * @param {Room} room 
 * @returns {Object}
 */
function getControllerCache(room) {

    return {
        id: room.controller.id,
        link_id: undefined, // Set to the ID of a link connected to the controller, if applicable.
        maxCreeps: room.controller.maxCreeps(),
        pos: room.controller.pos,
        get obj() {
            return Game.getObjectById(this.id)
        }
    }

}

/**
 * Returns an object containing arrays of creeps, separated by role, to cache. Example: { role1: [creep0, creep1], role2: [creep2] }
 * @param {Room} room 
 * @param {Object} roomHeap
 * @returns {Object}
 */
function getCreepsCache(room, roomHeap) {

    const creeps = room.find(FIND_MY_CREEPS);
    let cache = roomHeap.creeps;

    for (const creep of creeps) {

        const role = creep.memory.role;
        cache[role].push(creep);
    }

    return cache;
}

function getDirectives(room, roomHeap) {



    if (Object.keys(roomHeap.constructionSites).length) {
        //roomHeap.directives.build 
    }
}


/**
 * Returns an object of source(s) data to cache. Example: {source1: source1 data, source2: source2 data}
 * @param {Room} room 
 * @returns {Object}
 */
function getSourcesCache(room) {

    const sources = room.find(FIND_SOURCES);

    let _sources = {};
    for (const s of sources) {
        _sources[s.id] = {
            container_id: s.getContainer(),
            id: s.id,
            maxCreeps: s.maxCreeps(),
            pos: s.pos,
            get obj() {
                return Game.getObjectById(this.id);
            }
        }
    }

    return _sources;

}



/**
 * 
 * @param {Room} room 
 * @param {Object} roomHeap 
 */
function manageCreepTasks(room, roomHeap) {

    let roomCreeps = Object.values(Game.creeps).filter(c => c.room.name === room.name)

    for (const creep of roomCreeps) {
        // Create tasks stack.
        if (!MEMORY.creeps[creep.name]) {
            MEMORY.creeps[creep.name] = {
                tasks: [],
            }
        }

        let tasks = MEMORY.creeps[creep.name].tasks;

        if (tasks.length) {
            // validate tasks
            if (!validateTask(room, creep)) {
                MEMORY.creeps[creep.name].tasks.shift();
            }
        }


        if (tasks.length === 0) {
            assignTask(room, creep, roomCreeps, roomHeap)
            MEMORY.creeps[creep.name].tasks;
        }

        //executeTasks
        if (tasks.length) {
            // validate tasks
            executeTask(room, creep)

        }

    }

}

module.exports = roomManager;