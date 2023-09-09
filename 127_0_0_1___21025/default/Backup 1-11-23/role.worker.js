let pathfinding = require('pathfinding');

let roleWorker = {
    run: function (creep) {
        const target = Game.getObjectById(creep.memory.target);
        const taskFunction = TASK_FUNCTIONS[creep.memory.task];

        if (!taskFunction) {
            //console.log('Unrecognized task for worker creep: ' + creep.memory.task);
            return;
        }

        let ret = taskFunction(creep, target) == ERR_NO_PATH
        if (ret) {
            //console.log(creep.name+' cannot find a path to '+target.pos,ret)
            clearMemory(creep)
        }

    }
}

const TASK_FUNCTIONS = {
    mine: (creep, target) => {
        if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target);
        } else {
            creep.memory.moving = false
        }
    },
    refill: (creep, target) => {
        if (target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            clearMemory(creep)
        }
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target);
        } else {
            if (target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                clearMemory(creep)
            }
        }

    },
    withdraw: (creep, target) => {
        if (target.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            clearMemory(creep)
        }
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }

    },
    build: (creep, target) => {
        if (!target) {
            clearMemory(creep)
        }
        if (creep.build(target) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target);
        } else {
            creep.memory.moving = false
        }
    },
    upgradeController: (creep, target) => {
        if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target);
        } else {
            creep.memory.moving = false
        }
    },
};

function clearMemory(creep) {
    creep.memory.target = undefined;
    creep.memory.task = undefined;
    creep.memory.needTask = true;
    creep.memory.clearPath = true
}

function moveCreep(creep, target) {
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
        if (nextCreep && !nextCreep.memory.moving) {
            // Clear the creep's path from memory.
            storedPath = []
        }
    }

    // if we do not have a path, or the next path is blocked by creep with cree.memory.moving == false, get a new path.
    if (storedPath.length === 0) {
        storedPath = getCreepPath(creep, target).path
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






function getCreepPath(creep, target) {
    let ret = PathFinder.search(
        creep.pos, { pos: target.pos, range: 1 }, {
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





module.exports = roleWorker