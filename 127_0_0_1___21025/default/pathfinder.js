let MEMORY = require('memory');
const helper = require('lib.helper');




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
function getPath(creep = undefined, origin, destination, range, maxRooms, incomplete = false, avoidCreeps = false, allowedRooms = false) {

    let ret = PathFinder.search(
        origin, { pos: destination, range: range }, {
        plainCost: 2,
        swampCost: 10,
        maxRooms: maxRooms,
        ignoreCreeps: true,
        maxOps: 50000,
        roomCallback: function (roomName) {
            if (Game.map.getRoomStatus(roomName).status !== 'normal') return false;

            if (allowedRooms.length && !allowedRooms.includes(roomName) && roomName !== destination.roomName) {

                let scanData = MEMORY.monitoredRooms[roomName]

                if (!scanData || (scanData && scanData.hostileTarget)) {
                    return false;
                }
            }
            let room = Game.rooms[roomName];
            if (!room) {
                if (MEMORY.rooms[roomName]) {
                    let cm = MEMORY.rooms[roomName].costMatrix[0]
                    if (cm) {
                        return cm
                    }
                }
                return undefined;
            }



            if (!MEMORY.rooms[roomName]) {
                MEMORY.rooms[roomName] = {}
            }

            let matrix = MEMORY.rooms[roomName].costMatrix;

            if (!matrix || Game.time !== matrix[1]) {
                getCostMatrix(room, avoidCreeps);
                matrix = MEMORY.rooms[roomName].costMatrix
            };


            if (matrix) {
                // Modify matrix
                let m = matrix[0]
                if (creep && avoidCreeps) {
                    let myCreeps = room.find(FIND_MY_CREEPS).filter(c => c.pos.getRangeTo(creep) < 5)
                    for (let creep of myCreeps) {
                        if (MEMORY.rooms[creep.memory.home] && MEMORY.rooms[creep.memory.home].creeps[creep.name] && !MEMORY.rooms[creep.memory.home].creeps[creep.name].moving) {
                            m.set(creep.pos.x, creep.pos.y, 0xff)
                            continue;
                        }
                        /*if (creep.memory.role === 'defender' || creep.memory.role === 'soldier') {
                            m.set(creep.pos.x, creep.pos.y, 0xff)
                            continue;
                        }
 
                        if (MEMORY.rooms[creep.memory.home].creeps[creep.name]) {
                            const moving = MEMORY.rooms[creep.memory.home].creeps[creep.name].moving;
 
                            if (moving === false) {
                                let task = MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks[0]
                                if (task && task.type === 'HARVEST') {
                                    m.set(creep.pos.x, creep.pos.y, 0xff);
                                } else {
                                    m.set(creep.pos.x, creep.pos.y, m.get(creep.pos.x, creep.pos.y) + 5)
                                }
                            } else {
                                m.set(creep.pos.x, creep.pos.y, m.get(creep.pos.x, creep.pos.y) + 2)
                            }
                        }*/
                    }



                    // Prefer distancing from hostile creeps
                    let hostileCreeps = room.find(FIND_HOSTILE_CREEPS)

                    if (hostileCreeps.length > 0) {
                        let terrain = new Room.Terrain(roomName)
                        hostileCreeps.forEach(c => m.set(c.pos.x, c.pos.y, 0xff))
                        hostileCreeps = hostileCreeps.filter(c => c.body.some(b => b.type === ATTACK) || c.body.some(b => b.type === RANGED_ATTACK))

                        for (let creep of hostileCreeps) {

                            for (let x = creep.pos.x - HOSTILE_BUFFER; x <= creep.pos.x + HOSTILE_BUFFER; x++) {
                                for (let y = creep.pos.y - HOSTILE_BUFFER; y <= creep.pos.y + HOSTILE_BUFFER; y++) {
                                    if (x > 49 || x < 0 || y > 49 || y < 0) {
                                        continue;
                                    }

                                    if (terrain.get(x, y) !== 1) {
                                        m.set(x, y, m.get(x, y) + 20);
                                    }
                                }
                            }
                        }
                    }
                }

                return m;
            } else {
                return undefined;
            }

        },
    });



    if (incomplete) {
        return ret.incomplete
    }

    if (ret.incomplete) {
        return undefined;
    }



    return ret.path;
}

/**
 * Moves the creep using pathfinder.
 * @param {Creep} creep 
 * @param {RoomPosition} destination 
 * @param {number} range 
 * @param {number} maxRooms 
 * @param {string[]} allowedRooms
 */
function moveCreep(creep, destination, range, maxRooms, allowedRooms = false) {

    if (creep.fatigue > 0) {
        return;
    }
    MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = true;
    // Pull the path from memory.

    let path = MEMORY.rooms[creep.memory.home].creeps[creep.name].path;

    if (path && path.length > 1 && creep.room.name !== path[0].roomName && creep.room.name === path[1].roomName) {
        path.shift()
    }

    if (path && path.length > 0 && creep.pos.x === path[0].x && creep.pos.y === path[0].y) {
        path.shift()
    }

    // Generate a path if needed.
    if (!path || path.length === 0) {
        path = getPath(creep, creep.pos, destination, range, maxRooms, false, false, allowedRooms);
        if (!path) {

            //console.log('Failed to generate path for', creep.name, JSON.stringify(creep.pos), 'to', JSON.stringify(destination),'Tasks:',JSON.stringify(MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks));
            MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
            MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks = [];
            return;
        }

    };

    let lookCreeps = []
    if (path && path.length && path[0].roomName === creep.room.name) {
        let lookStructs = path[0].lookFor(LOOK_STRUCTURES)
        if (lookStructs.length) {
            for (let s of lookStructs) {
                if (s.structureType !== STRUCTURE_ROAD && (s.structureType !== STRUCTURE_RAMPART && s.my)) {
                    path = getPath(creep, creep.pos, destination, range, maxRooms, false, true, allowedRooms)
                    break;
                }
            }
        }
    }

    try {
        lookCreeps = path[0].lookFor(LOOK_CREEPS);
    } catch (e) {
        MEMORY.rooms[creep.memory.home].creeps[creep.name].path = undefined;
        return;
    }

    if (lookCreeps.length > 0) {

        const lookCreep = lookCreeps[0]
        try {
            if (!lookCreep.my) {
                MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks = [];
            } else if (lookCreep.my && MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name] && (!MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name].moving || (MEMORY.rooms[creep.memory.home].creeps[creep.name].blockingCreep && MEMORY.rooms[creep.memory.home].creeps[creep.name].blockingCreep === lookCreep.name))) {

                let moving = helper.pushCreep(lookCreep, creep);

                // Get a new path if there is.
                if (!moving) {


                    path = getPath(creep, creep.pos, destination, range, maxRooms, false, true, allowedRooms);
                    if (!path || path.length === 0) {
                        MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
                        MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks = [];
                        return;
                    }
                } else {
                    MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name].moving = true;
                }

            } else if (lookCreep.fatigue) {

                let timeToMove = Math.ceil(lookCreep.fatigue / (2 * lookCreep.getActiveBodyparts(MOVE)))

                if (timeToMove > 1) {

                    path = getPath(creep, creep.pos, destination, range, maxRooms, false, true, allowedRooms);

                }

            } else {
                MEMORY.rooms[creep.memory.home].creeps[creep.name].blockingCreep = lookCreep.name
            }
        } catch (e) { }
    }
    if (!path || path.length === 0) {
        MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
        MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks = [];
        //console.log('Failed to generate path for', creep.name, JSON.stringify(creep.pos), 'to', JSON.stringify(destination));
        return;
    }

    const next = creep.pos.getDirectionTo(path[0]);
    const directions = {
        1: '↑',
        2: '↗',
        3: '→',
        4: '↘',
        5: '↓',
        6: '↙',
        7: '←',
        8: '↖',
    }

    creep.say(directions[next])
    const ret = creep.move(next)
    if (ret !== 0) {
        //MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
    }
    MEMORY.rooms[creep.memory.home].creeps[creep.name].blockingCreep = undefined;
    MEMORY.rooms[creep.memory.home].creeps[creep.name].path = path;

}

/**
 * 
 * @param {Creep} creep 
 * @param {String} targetRoomName 
 * @param {RoomPosition} targetPos
 * @param {number} hostileRoomValue 
 * @param {boolean} returnRoute 
 * @returns 
 */
function moveCreepToRoom(creep, targetRoomName, targetPos = undefined, hostileRoomValue = 10) {
    let allowedRooms = false;

    let nextRoom = MEMORY.rooms[creep.memory.home].creeps[creep.name].nextroom;
    let route = []
    if (!nextRoom) {

        let from = creep.pos;
        let to = new RoomPosition(25, 25, targetRoomName);

        // Use `findRoute` to calculate a high-level plan for this path,
        // prioritizing highways and owned rooms

        route = Game.map.findRoute(from.roomName, to.roomName, {
            routeCallback(roomName) {
                if (Game.map.getRoomStatus(roomName).status !== 'normal') return 0xff;

                let isMyRoom = Game.rooms[roomName] &&
                    Game.rooms[roomName].controller &&
                    Game.rooms[roomName].controller.my;
                let scanData = MEMORY.monitoredRooms[roomName]

                if (scanData && scanData.hostileTarget) {
                    if (scanData.towers) {
                        return 0xff;
                    }
                    return hostileRoomValue
                }

                if (!scanData || scanData.hostileTarget === undefined || scanData.occupied) {
                    return 3;
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
        allowedRooms = [creep.room.name, ...route.map(r => r.room)]

    }


    // Invoke PathFinder, allowing access only to rooms from `findRoute`
    let destination = new RoomPosition(25, 25, targetRoomName)


    moveCreep(creep, destination, 23, 64, allowedRooms)

}




/**
 * Generates a standard CostMatrix for a room.
 * @param {Room} room 
 */
function getCostMatrix(room, avoidCreeps) {


    let costMatrix = new PathFinder.CostMatrix();
    let structures = room.find(FIND_STRUCTURES);
    let sites = room.find(FIND_MY_CONSTRUCTION_SITES);
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

        /*if (structure.structureType === STRUCTURE_LINK && MEMORY.rooms[room.name].links && MEMORY.rooms[room.name].links.spawn && structure.id === MEMORY.rooms[room.name].links.spawn) {
            let pos = structure.pos;

            costMatrix.set(pos.x - 1, pos.y - 1, 10);
            costMatrix.set(pos.x + 1, pos.y - 1, 10);
            costMatrix.set(pos.x - 1, pos.y + 1, 10);
            costMatrix.set(pos.x + 1, pos.y + 1, 10);
        }*/
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


    MEMORY.rooms[room.name].costMatrix = [costMatrix, Game.time];

}

module.exports = {
    getCostMatrix,
    getPath,
    moveCreep,
    moveCreepToRoom,
};