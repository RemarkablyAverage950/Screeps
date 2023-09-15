let MEMORY = require('memory')

const HOSTILE_BUFFER = 4;

/**
 * Returns a path to target using the room's CostMatrix.
 * @param {RoomPosition} origin Origin position.
 * @param {RoomPosition} destination Destination position.
 * @param {number} range The distance from destination the pathfinder will path to.
 * @param {number} maxRooms The maximum number of rooms the pathfinder will search.
 * @returns {RoomPosition[]} The path results from PathFinder.search
 */
function getPath(origin, destination, range, maxRooms) {

    let ret = PathFinder.search(
        origin, { pos: destination, range: range }, {
        plainCost: 2,
        swampCost: 3,
        maxRooms: maxRooms,
        roomCallback: function (roomName) {

            let room = Game.rooms[roomName];
            if (!room) return undefined;

            let matrix = MEMORY.rooms[room.name].costMatrix;

            if (!matrix || Game.time !== matrix[1]) {
                getCostMatrix(room);
                matrix = MEMORY.rooms[room.name].costMatrix
            };

            if (matrix) {
                //console.log('Matrix defined')
                return matrix[0];
            } else {
                //console.log('Matrix undefined')
                return undefined;
            }

        },
    });

    /*if (ret.incomplete) {
        creep.memory.needTask = true
        return
    }*/

    return ret.path;
}

/**
 * Moves the creep using pathfinder.
 * @param {Creep} creep 
 * @param {RoomPosition} destination 
 * @param {number} range 
 * @param {number} maxRooms 
 */
function moveCreep(creep, destination, range, maxRooms) {

    MEMORY.rooms[creep.room.name].creeps[creep.name].moving = true;
    // Pull the path from memory.

    let path = MEMORY.rooms[creep.memory.home].creeps[creep.name].path;

    // Generate a path if needed.
    if (!path || path.length === 0) {
        //console.log('generating path for', creep.name)
        path = getPath(creep.pos, destination, range, maxRooms);
    };
    if (path.length === 0) {
        console.log('Failed to generate path for', creep.name);
        return;
    }
    // Check if there is a stationary creep standing in the next spot.
    const lookCreeps = path[0].lookFor(LOOK_CREEPS);
    if (lookCreeps.length > 0) {
        //console.log('LookCreeps', JSON.stringify(lookCreeps))
        const lookCreep = lookCreeps[0]
        //console.log('LookCreep', JSON.stringify(lookCreep))

        if (MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name] && MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name].moving) {
            // Get a new path if there is.
            //console.log('generating path for', creep.name)
            path = getPath(creep.pos, destination, range, maxRooms);

        }
    }

    const next = path[0];

    const ret = creep.moveTo(next);

    if (ret === 0) {
        path.shift()
    }

    MEMORY.rooms[creep.memory.home].creeps[creep.name].path = path;

}

/**
 * Generates a standard CostMatrix for a room.
 * @param {Room} room 
 */
function getCostMatrix(room) {


    let costMatrix = new PathFinder.CostMatrix();
    let structures = room.find(FIND_STRUCTURES);
    let sites = room.find(FIND_CONSTRUCTION_SITES);
    const terrain = new Room.Terrain(room.name);

    // Set edges to 10 to avoid bouncing in and out of rooms.
    for (let x = 0; x < 50; x++) {
        if (terrain.get(x, 0) !== TERRAIN_MASK_WALL) {
            costMatrix.set(x, 0, 10);
        };
        if (terrain.get(x, 49) !== TERRAIN_MASK_WALL) {
            costMatrix.set(x, 49, 10);
        };
    }

    for (let y = 0; y < 50; y++) {
        if (terrain.get(0, y) !== TERRAIN_MASK_WALL) {
            costMatrix.set(0, y, 10)
        }
        if (terrain.get(49, y) !== TERRAIN_MASK_WALL) {
            costMatrix.set(49, y, 10)
        }
    }


    for (let structure of structures) {


        // Prefer Roads
        if (structure.structureType === STRUCTURE_ROAD) {

            costMatrix.set(structure.pos.x, structure.pos.y, 1);
            continue;

        } else if (structure.structureType === STRUCTURE_CONTAINER
            || (structure.structureType === STRUCTURE_RAMPART && structure.my)) {
            continue;
        };

        // Structure is impassable
        costMatrix.set(structure.pos.x, structure.pos.y, 0xff);
    }

    for (let site of sites) {
        if (site.structureType === STRUCTURE_CONTAINER
            || (site.structureType === STRUCTURE_RAMPART && site.my)
            || site.structureType === STRUCTURE_ROAD) {
            continue;
        };

        costMatrix.set(site.pos.x, site.pos.y, 0xff);
    };

    // Set parked or undetermined creeps to impassable
    let myCreeps = room.find(FIND_MY_CREEPS)
    for (let creep of myCreeps) {

        if (MEMORY.rooms[creep.memory.home].creeps[creep.name]) {
            const moving = MEMORY.rooms[creep.memory.home].creeps[creep.name].moving;

            if (moving === false) {
                costMatrix.set(creep.pos.x, creep.pos.y, 0xff);
            };
        }
    }


    // Prefer distancing from hostile creeps
    let hostileCreeps = room.find(FIND_HOSTILE_CREEPS)

    if (hostileCreeps.length > 0) {

        hostileCreeps = hostileCreeps.filter(c => c.body.some(b => b.type === ATTACK) || c.body.some(b => b.type === RANGED_ATTACK))

        for (let creep of hostileCreeps) {

            for (let x = creep.pos.x - HOSTILE_BUFFER; x <= creep.pos.x + HOSTILE_BUFFER; x++) {
                for (let y = creep.pos.y - HOSTILE_BUFFER; y <= creep.pos.y + HOSTILE_BUFFER; y++) {

                    costMatrix.set(x, y, costMatrix.get(x, y) + 20);

                }
            }
        }
    }



    MEMORY.rooms[room.name].costMatrix = [costMatrix, Game.time];

}

module.exports = {
    getCostMatrix,
    getPath,
    moveCreep,
};