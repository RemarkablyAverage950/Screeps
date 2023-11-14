let MEMORY = require('memory')

function roomManager(room) {

    if (!MEMORY.rooms[room.name]) {
        initializeRoomMemory(room)
    }

    // Set up harvest directive







    /* Directives:
         Harvest sources
         Upgrade controllers
         Defend
         Build
         Mine minerals
         Spawn creeps
         Boost creeps

     */



    let myCreeps = room.find(FIND_MY_CREEPS)

    for (const creep of myCreeps) {


        const role = creep.memory.role;
        if (role === 'harvester') {

            const sources = MEMORY.rooms[room.name].sources

            for (const id of Object.keys(sources)) {

                const so = sources[id];
                const source = so.obj;

                if (source.assignedCreeps() < so.maxCreeps) {

                }

            }


        }
    }
}



/**
 * Sets up room memory with static information.
 * @param {Room} room 
 */
function initializeRoomMemory(room) {

    const creeps = room.find(FIND_MY_CREEPS)
    const energyCapacityAvailable = room.energyCapacityAvailable
    const sources = room.find(FIND_SOURCES)


    // Set sources cache
    
    let _sources = {};
    for (const s of sources) {
        _sources[s.id] = {
            id: s.id,
            pos: s.pos,
            maxCreeps: s.maxCreeps(),
            container: s.getContainer(),
            get obj() {
                return Game.getObjectById(this.id)
            }
        }
    }

    _sources.energyPerSource = 3000;


    // Harvesters required

    // Max amount is 
    let maxHarvesters = 0;
    for (const s of _sources) {
        maxHarvesters += s.maxCreeps;
    }

    // Largest size of harvester we can make.
    let maxWorkParts = 2;
    if (energyCapacityAvailable >= 650) {
        maxWorkParts = 5;
    } else if (energyCapacityAvailable >= 500) {
        maxWorkParts = 4
    } else if (energyCapacityAvailable >= 400) {
        maxWorkParts = 3
    }


    _sources.harvestersRequired = Math.min(maxHarvesters, Math.ceil(5 / maxWorkParts) * sources.length)

    if (!room.memory.outposts) {
        room.memory.outposts = [];

    }



    MEMORY.rooms[room.name] = {
        spawnQueue: [],
        spawnTimer: 0,
        creeps: {},
        tasks: {},
        sources: _sources,
        outposts: {},
        missions: [],
        hostileCreeps: [],
        structures: {},
        exteriorTiles: [],
        controller: undefined,
        energyCapacityAvailable: room.energyCapacityAvailable,
    }
    



    // Incomplete below here.
    const controller = room.controller

    if (controller) {
        let controller = {
            id: controller.id,
            pos: controller.pos,
            maxCreeps: controller.maxCreeps(),
            get obj() {
                return Game.getObjectById(this.id)
            }
        }
    }



}