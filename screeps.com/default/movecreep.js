let { managePathfinding, paths, matricies } = require('pathfinding');
let scoutData = require('expansionManager').scoutData
const { clearTask } = require('tasks')


/**
 * Manages pathfinding and moves creep within a room.
 * @param {Creep} creep 
 * @param {Object} target Any object with a room position.
 * @returns {number} Number representing the return from creep.moveTo().
 */
function moveCreep(creep, target, range = 1, maxRooms = 1) {
    const roomName = creep.room.name
    const creepHome = creep.room.home
    const creepName = creep.name
    if (target.pos != undefined) {
        target = target.pos
    }
    /*if (roomName != creep.memory.home) {
        creep.moveTo(target)
        return
    }*/
    //Check if there is a stored path in memory.
    if (!paths[creepHome]) {
        paths[creepHome] = {}
    }
    if (!paths[creepHome][creepName] || paths[creepHome][creepName] == null) {
        paths[creepHome][creepName] = []
    }
    let storedPath = paths[creepHome][creepName]
    if (creep.memory.clearPath) {
        creep.memory.clearPath = false
        storedPath = []
    }

    if (storedPath.length > 0) {
        // check next position for a blocking creep
        let nextPos = storedPath[0];
        let nextCreep = creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y)[0];
        if (nextCreep && nextCreep.my && !nextCreep.memory.moving) {
            // Clear the creep's path from memory.
            storedPath = []
        }
    }



    // if we do not have a path, or the next path is blocked by creep with cree.memory.moving == false, get a new path.
    if (storedPath.length === 0) {

        const pathObj = getCreepPath(creep, target, range, maxRooms)
        if (pathObj.incomplete) {

            creep.memory.moving = false
            clearTask(creep)
            return
        }

        storedPath = pathObj.path.filter(p => p.roomName == creep.room.name)

        if (!storedPath) {
            return
        }
    }


    // check if the creep is on storedPath[0]
    if (storedPath.length > 0 && creep.pos.x == storedPath[0].x && creep.pos.y == storedPath[0].y) {
        storedPath.shift()
    }
    if (!storedPath || storedPath == null) {
        storedPath = []
    }

    // if we have a path, try to move to the next position
    creep.room.visual.poly(storedPath, { stroke: '#ffaa00' });

    paths[creepHome][creepName] = storedPath
    if (storedPath.length === 0) {
        creep.memory.moving = false
        return ERR_NO_PATH
    }
    creep.memory.moving = true
    return creep.moveTo(storedPath[0])
}

/**
 * returns a path to target using the room's CostMatrix
 * @param {Creep} creep 
 * @param {RoomPosition} targetPos Any object with a room position.
 * @returns {PathFinder} The results from PathFinder.search
 */
function getCreepPath(creep, targetPos, range, maxRooms) {

    let ret = PathFinder.search(
        creep.pos, { pos: targetPos, range: range }, {
        plainCost: 3,
        swampCost: 6,
        maxRooms: maxRooms,
        roomCallback: function (roomName) {
            let room = Game.rooms[roomName]
            if (!room) return;
            let matrix;
            if (!matricies[roomName]) {
                matrix = managePathfinding(room)
            } else {
                matrix = PathFinder.CostMatrix.deserialize(matricies[roomName])
            }

            return matrix
        },
    });

    /*if (ret.incomplete) {
        creep.memory.needTask = true
        return
    }*/

    return ret;
}

/**
 * 
 * @param {Creep} creep 
 * @returns {void}
 */
function moveToTargetRoom(creep, targetRoom) {
    if (!targetRoom) { targetRoom = creep.memory.targetRoom }
    if (!targetRoom) {
        return
    }
    let exit = creep.memory.exitPos

    if (!exit || exit.roomName != creep.room.name) {
        let unsafeRooms = []
        const neighbors = scoutData[creep.memory.home].neighbors
        for (let neighbor in neighbors) {
            if (scoutData[creep.memory.home].neighbors[neighbor].safeToTravel == false) {
                unsafeRooms.push(neighbor)
            }
        }

        // find path to targetRoom that avoids all objects in unsafeRoom
        let route = Game.map.findRoute(creep.room.name, targetRoom, {
            routeCallback: (roomName) => {
                if (unsafeRooms.includes(roomName)) {
                    return Infinity;
                }
                return 1;
            }
        });
        if (route.length > 0) {
            exit = creep.pos.findClosestByPath(route[0].exit)
            creep.memory.exitPos = exit
        } else {
            console.log(`No safe path found from ${creep.room.name} to ${targetRoom}`);
            return
        }
    }

    if (creep.memory.exitPos && creep.memory.exitPos.roomName == creep.room.name) {

        moveCreep(creep, exit, 0, 1)
    }
}

/**
 * 
 * @param {Creep} creep 
 */
function findParking(creep) {
    const bfs = (start) => {
        const queue = [start];
        const visited = new Set();
        const directions = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0]
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);

            for (const [dx, dy] of directions) {
                const x = current[0] + dx;
                const y = current[1] + dy;

                let valid = true;
                const look = creep.room.lookAt(x, y);
                for (const lo of look) {
                    if (lo.type === LOOK_CREEPS || lo.type === LOOK_STRUCTURES || lo.type === LOOK_TERRAIN && lo.terrain === 'wall') {
                        valid = false;
                        break;
                    }
                }

                if (valid) {
                    return new RoomPosition(x, y, creep.room.name);
                }

                queue.push([x, y]);
            }
        }
    };

    const pos = bfs([creep.pos.x, creep.pos.y]);
    if (pos) {
        moveCreep(creep, pos, 0, 1);
        creep.memory.moving = true
    }
}

module.exports = {
    moveCreep: moveCreep,
    moveToTargetRoom: moveToTargetRoom,
    findParking: findParking
}