let pathfinding = require('pathfinding');

/**
 * Manages pathfinding and moves creep within a room.
 * @param {Creep} creep 
 * @param {Object} target Any object with a room position.
 * @returns {number} Number representing the return from creep.moveTo().
 */
function moveCreep(creep, target, range = 1) {
    const roomName = creep.room.name
    const creepName = creep.name
    //Check if there is a stored path in memory.
    if (!pathfinding.paths[roomName][creepName] || pathfinding.paths[roomName][creepName] == null) {
        pathfinding.paths[roomName][creepName] = []
    }
    let storedPath = pathfinding.paths[roomName][creepName]
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
        storedPath = getCreepPath(creep, target, range).path
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

    pathfinding.paths[roomName][creepName] = storedPath
    if (storedPath.length === 0) {
        return ERR_NO_PATH
    }
    return creep.moveTo(storedPath[0])


}

/**
 * returns a path to target using the room's CostMatrix
 * @param {Creep} creep 
 * @param {Object} target Any object with a room position.
 * @returns {PathFinder} The results from PathFinder.search
 */
function getCreepPath(creep, target, range) {
    let ret = PathFinder.search(
        creep.pos, { pos: target.pos, range: range }, {
        plainCost: 2,
        swampCost: 5,
        roomCallback: function (roomName) {
            let room = Game.rooms[roomName]
            if (!room) return;
            return PathFinder.CostMatrix.deserialize(creep.room.memory.costMatrix);
        },
    });
    return ret;
}

module.exports = moveCreep