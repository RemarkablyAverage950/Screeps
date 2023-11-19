const { getTargetCount } = require('lib.spawn');
let { MEMORY } = require('memory');
const spawnManager = require('spawnManager');

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

    manageCreepTasks(room,roomHeap)
    //assignCreepsTasks(room, roomHeap)


    // Set directives


    if (!roomHeap.directive) {
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

    MEMORY.rooms[room.name] = {
        bodies: {},
        constructionSites: {},
        constructionSiteCount: 0,
        controller: controllerCache,
        creeps: {},
        creepsRequired: {},
        directives: {},
        energyAvailable: room.energyAvailable,
        energyCapacityAvailable: room.energyCapacityAvailable,
        energyPerSource: 3000,
        hostileCreeps: [],
        interiorTiles: [],
        missions: [],
        outposts: {},
        roomName: room.name,
        sources: sourceCache,
        spawnQueue: [],
        spawnQueueTimer: Game.time,
        structureCount: 0,
        structures: {},
    }

}

function updateRoomMemory(room, roomHeap) {

    const structures = room.find(FIND_STRUCTURES);
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    // Set creeps cache
    roomHeap.creeps = getCreepsCache(room);



    if (roomHeap.structureCount !== structures.length) {

        roomHeap.energyCapacityAvailable = room.energyCapacityAvailable;

        roomHeap.creepsRequired.miner = getTargetCount.miner(roomHeap);

        // Get interior tiles

        roomHeap.structures = getStructuresCache(structures);

        roomHeap.structureCount = structures.length;
    }

    if (roomHeap.constructionSiteCount !== sites.length) {

        roomHeap.constructionSiteCount = sites.length
        if (constructionSites.length > 0) {
            roomHeap.constructionSites = getConstructionSiteCache(constructionSites)
        }

    }

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
 * @returns {Object}
 */
function getCreepsCache(room) {

    const creeps = room.find(FIND_MY_CREEPS);
    let cache = {};

    for (const creep of creeps) {

        const role = creep.memory.role;

        if (!cache[role]) {
            cache[role] = [creep];
        } else {
            cache[role].push(creep);
        }

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
 * Returns an object of structures, seperated by structureType to cache. Example: {STRUCTURE_EXTENSION: [extension0, extension1], STRUCTURE_SPAWN: [spawn0]}
 * @param {Structure[]} structures 
 * @returns {Object}
 */
function getStructuresCache(structures) {

    let cache = {};

    for (const s of structures) {

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
 * 
 * @param {Room} room 
 * @param {Object} roomHeap 
 */
function manageCreepTasks(room,roomHeap){

    // Validate creep tasks
    
    // Check for directives here

    // Creeps needing tasks

    // Assign tasks

    // Execute tasks

}

module.exports = roomManager;