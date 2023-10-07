let MEMORY = require('memory')

const HOSTILE_BUFFER = 4;
const MAX_PATH_LENGTH = 5;

/**
 * Returns a path to target using the room's CostMatrix.
 * @param {RoomPosition} origin Origin position.
 * @param {RoomPosition} destination Destination position.
 * @param {number} range The distance from destination the pathfinder will path to.
 * @param {number} maxRooms The maximum number of rooms the pathfinder will search.
 * @param {boolean} incomplete Return path incomplete of !incomplete.
 * @returns {RoomPosition[] | Boolean} The path results from PathFinder.search
 */
function getPath(origin, destination, range, maxRooms, incomplete = false) {

    let ret = PathFinder.search(
        origin, { pos: destination, range: range }, {
        plainCost: 2,
        swampCost: 10,
        maxRooms: maxRooms,
        ignoreCreeps: true,
        roomCallback: function (roomName) {

            let room = Game.rooms[roomName];
            if (!room) return undefined;

            if (!MEMORY.rooms[roomName]) {
                MEMORY.rooms[roomName] = {}
            }

            let matrix = MEMORY.rooms[roomName].costMatrix;

            if (!matrix || Game.time !== matrix[1]) {
                getCostMatrix(room);
                matrix = MEMORY.rooms[roomName].costMatrix
            };
            

            if (matrix) {
                return matrix[0];
            } else {
                return undefined;
            }

        },
    });

    if(incomplete){
        return ret.incomplete
    }

    ret.path.length = Math.min(ret.path.length, MAX_PATH_LENGTH)

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

    MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = true;
    // Pull the path from memory.

    let path = MEMORY.rooms[creep.memory.home].creeps[creep.name].path;

    if (path && path.length > 0 && creep.pos.x === path[0].x && creep.pos.y === path[0].y) {
        path.shift()
    }

    // Generate a path if needed.
    if (!path || path.length === 0) {
        path = getPath(creep.pos, destination, range, maxRooms);
    };

    if (path.length === 0) {
        MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
        MEMORY.rooms[creep.memory.home].creeps[creep.name].task = undefined;
        console.log('Failed to generate path for', creep.name, JSON.stringify(creep.pos));
        return;
    }

    let lookCreeps = []

    try {
        lookCreeps = path[0].lookFor(LOOK_CREEPS);
    } catch (e) {
        MEMORY.rooms[creep.memory.home].creeps[creep.name].path = undefined;
        return;
    }

    if (lookCreeps.length > 0) {

        const lookCreep = lookCreeps[0]

        if (lookCreep.my && MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name] && !MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name].moving) {
            // Get a new path if there is.
            path = getPath(creep.pos, destination, range, maxRooms);

        }
    }


    const next = creep.pos.getDirectionTo(path[0]);

    const ret = creep.move(next)

    MEMORY.rooms[creep.memory.home].creeps[creep.name].path = path;

}

function moveCreepToRoom(creep, targetRoomName, hostileRoomValue = 10) {


    let nextRoom = MEMORY.rooms[creep.memory.home].creeps[creep.name].nextroom;

    if (!nextRoom) {

        let from = creep.pos;
        let to = new RoomPosition(25, 25, targetRoomName);

        // Use `findRoute` to calculate a high-level plan for this path,
        // prioritizing highways and owned rooms

        let route = Game.map.findRoute(from.roomName, to.roomName, {
            routeCallback(roomName) {

                let isMyRoom = Game.rooms[roomName] &&
                    Game.rooms[roomName].controller &&
                    Game.rooms[roomName].controller.my;
                let scanData = MEMORY.monitoredRooms[roomName]


                if (!scanData || scanData.hostileTarget === undefined || scanData.occupied) {
                    return 3;
                }
                if (scanData.hostileTarget) {
                    return hostileRoomValue
                }
                let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                let isHighway = (parsed[1] % 10 === 0) ||
                    (parsed[2] % 10 === 0);
                if (isHighway || isMyRoom) {
                    return 1
                }

                return 2;
            }


        })


        if (!route.length) {
            return;
        }
        if (creep.memory.role === 'scout') {
            const p = route.map(r => r.room)
            console.log('Scout path:', JSON.stringify(p))
        }

        nextRoom = route[0].room

        MEMORY.rooms[creep.memory.home].creeps[creep.name].nextroom = nextRoom
    }


    // Invoke PathFinder, allowing access only to rooms from `findRoute`
    let destination = new RoomPosition(25, 25, nextRoom)
    moveCreep(creep, destination, 20, 16)

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
        if (terrain.get(x, 0) !== 1) {
            costMatrix.set(x, 0, 10);
        };
        if (terrain.get(x, 49) !== 1) {
            costMatrix.set(x, 49, 10);
        };
    }

    for (let y = 0; y < 50; y++) {
        if (terrain.get(0, y) !== 1) {
            costMatrix.set(0, y, 10)
        }
        if (terrain.get(49, y) !== 1) {
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

        if (structure.structureType === STRUCTURE_LINK && MEMORY.rooms[room.name].links && MEMORY.rooms[room.name].links.spawn && structure.id === MEMORY.rooms[room.name].links.spawn) {
            let pos = structure.pos;

            costMatrix.set(pos.x - 1, pos.y - 1, 10);
            costMatrix.set(pos.x + 1, pos.y - 1, 10);
            costMatrix.set(pos.x - 1, pos.y + 1, 10);
            costMatrix.set(pos.x + 1, pos.y + 1, 10);
        }
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
            }
        }
    }


    // Prefer distancing from hostile creeps
    let hostileCreeps = room.find(FIND_HOSTILE_CREEPS)

    if (hostileCreeps.length > 0) {
        hostileCreeps.forEach(c => costMatrix.set(c.pos.x, c.pos.y, 0xff))
        hostileCreeps = hostileCreeps.filter(c => c.body.some(b => b.type === ATTACK) || c.body.some(b => b.type === RANGED_ATTACK))

        for (let creep of hostileCreeps) {

            for (let x = creep.pos.x - HOSTILE_BUFFER; x <= creep.pos.x + HOSTILE_BUFFER; x++) {
                for (let y = creep.pos.y - HOSTILE_BUFFER; y <= creep.pos.y + HOSTILE_BUFFER; y++) {
                    if (x > 49 || x < 0 || y > 49 || y < 0) {
                        continue;
                    }

                    if (terrain.get(x, y) !== 1) {
                        costMatrix.set(x, y, costMatrix.get(x, y) + 20);
                    }
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
    moveCreepToRoom,
};