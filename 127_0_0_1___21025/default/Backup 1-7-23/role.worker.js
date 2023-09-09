
let roleWorker = {
    run: function (creep) {
        const target = Game.getObjectById(creep.memory.target);
        const taskFunction = TASK_FUNCTIONS[creep.memory.task];

        if (!taskFunction) {
            //console.log('Unrecognized task for worker creep: ' + creep.memory.task);
            return;
        }

        let ret = taskFunction(creep, target) == ERR_NO_PATH
        if(ret) {
            //console.log(creep.name+' cannot find a path to '+target.pos,ret)
            clearMemory(creep)
        }

    }
}

const TASK_FUNCTIONS = {
    mine: (creep, target) => {
        if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
            return creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    },
    refill: (creep, target) => {
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            return creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        if (target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.target = undefined;
            creep.memory.task = undefined;
            creep.memory.needTask = true;
        }
    },
    withdraw: (creep, target) => {
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            return creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        if (target.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.target = undefined;
            creep.memory.task = undefined;
            creep.memory.needTask = true;
        }
    },
    build: (creep, target) => {
        if (creep.build(target) == ERR_NOT_IN_RANGE) {
            return creep.moveTo(target, { visualizePathStyle: { stroke: '#00ffff' } });
        }
        if (!target) {
            creep.memory.target = undefined;
            creep.memory.task = undefined;
            creep.memory.needTask = true;
        }
    },
    upgradeController: (creep, target) => {
        if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
          return  creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
        }
    },
};

function clearMemory(creep) {
    creep.memory.target = undefined;
    creep.memory.task = undefined;
    creep.memory.needTask = true;
}




module.exports = roleWorker