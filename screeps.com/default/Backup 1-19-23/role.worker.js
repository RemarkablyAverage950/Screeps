let moveCreep = require('movecreep');

let roleWorker = {
    run: function (creep) {
        const target = Game.getObjectById(creep.memory.target);
        const taskFunction = TASK_FUNCTIONS[creep.memory.task];
        
        if (!taskFunction || !target) {
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
    harvest: (creep, target) => {

        if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target);
        } else {
            creep.memory.moving = false
        }
    },
    transfer: (creep, target) => {
        if (target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            clearMemory(creep)
            return
        }
        let ret = creep.transfer(target, RESOURCE_ENERGY)
        if (ret == -9) {
            return moveCreep(creep, target);
        } else {
            clearMemory(creep)
            return
        }
    },
    withdraw: (creep, target) => {
        if (target.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            clearMemory(creep)
            return
        }
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }

    },
    build: (creep, target) => {
        if (!target) {
            clearMemory(creep)
            return
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
    wallRepair: (creep, target) => {
        if (!target || target.hits >= getWallHitsTarget(creep.room)) {
            clearMemory(creep)
            return
        }
        if (creep.repair(target) == ERR_NOT_IN_RANGE) {
            return moveCreep(creep, target);
        } else {
            creep.memory.moving = false
        }
    }
};

function clearMemory(creep) {
    creep.memory.target = undefined;
    creep.memory.task = undefined;
    creep.memory.needTask = true;
    creep.memory.clearPath = true;
}

function getWallHitsTarget(room) {
    switch (room.controller.level) {
        case 8:
            return 20000000
        case 7:
            return 10000000
        case 6:
            return 5000000
        case 5:
            return 2500000
        default:
            return 1000000
    }
}


module.exports = roleWorker