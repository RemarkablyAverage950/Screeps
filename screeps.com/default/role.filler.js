let { moveCreep, findParking } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks')

let fillerTaskQueue = {}

let roleFiller = {
    /**
     * 
     * @param {Creep} creep 
     * @returns {void}
     */
    run: function (creep) {

        if (!fillerTaskQueue[creep.room.name]) {
            //Initialize room queue
            fillerTaskQueue[creep.room.name] = []
        }
        const home = creep.memory.home
        if (creepTasks[home][creep.name].task.type == 'transfer' && creep.store[RESOURCE_ENERGY] == 0) {
            clearTask(creep)
        }


        let allowWithdraw = true
        let allowTransfer = true
        // If energy == 0 Only disable transfer
        if (creep.store[RESOURCE_ENERGY] == 0) {
            allowTransfer = false
            // if energy == 100 disable withdraw
        } else if (creep.store.getFreeCapacity() < .5 * creep.store.getCapacity()) {
            allowWithdraw = false
        }

        if (!creepTasks[home][creep.name].task.target) {
            let availableTasks = []
            const structures = creep.room.find(FIND_STRUCTURES)
            if (allowWithdraw) {
                availableTasks = availableTasks.concat(getPickupTasks(creep))
                availableTasks = availableTasks.concat(getWithdrawTasks(creep, structures))
            }
            if (allowTransfer) {
                if (fillerTaskQueue[creep.room.name].length == 0) {
                    // Add availableTasks to taskQueue
                    fillerTaskQueue[creep.room.name] = getTransferTasks(creep, structures)
                }
                availableTasks = availableTasks.concat(fillerTaskQueue[creep.room.name])
            }

            // find closest by range
            let taskStructures = availableTasks.map(t => Game.getObjectById(t.target))
            let closest = creep.pos.findClosestByRange(taskStructures)

            if (closest) {
                let task = availableTasks.find(t => t.target == closest.id)
                if (fillerTaskQueue[creep.room.name].some(t => t.target == task.target)) {
                    fillerTaskQueue[creep.room.name].splice(fillerTaskQueue[creep.room.name].findIndex(t => task.target == t.target), 1)
                }
                creepTasks[home][creep.name].task = task

            } else {
                if (creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y).length > 0) {
                    findParking(creep)

                    return
                }
                creep.memory.moving = false
                return
            }

        }

        const task = creepTasks[home][creep.name].task.type
        const target = Game.getObjectById(creepTasks[home][creep.name].task.target)

        if (task == 'withdraw') {
            if (target.store[RESOURCE_ENERGY] === 0) {
                clearTask(creep)
                creep.memory.moving = false
                return
            }
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                moveCreep(creep, target)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            } else {
                creep.memory.moving = false
                fillerTaskQueue[creep.room.name] = []
                clearTask(creep)
                return
            }
        } else if (task == 'transfer') {
            if (target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                clearTask(creep)
                return
            }
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                moveCreep(creep, target);
            } else {
                clearTask(creep)
                return
            }
        } else if (task == 'pickup') {
            if (!target) {
                clearTask(creep)
                return
            }
            if (creep.pickup(target) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                moveCreep(creep, target);
            } else {
                clearTask(creep)
            }

        }

    }
}

module.exports = { roleFiller }




/**
 * 
 * @param {Creep} creep
 * @param {Structure[]} structures
 * @returns {Task[]} 
 */
function getTransferTasks(creep, structures) {
    let tasks = []

    // Create refill tasks for spawns and extensions < 100% && towers < 50% E forecast

    let refillStructures = structures
        .filter(s => ((s.structureType == STRUCTURE_SPAWN
            || s.structureType == STRUCTURE_EXTENSION)
            && s.store.getUsedCapacity(RESOURCE_ENERGY) < s.store.getCapacity(RESOURCE_ENERGY))
            || (s.structureType == STRUCTURE_TOWER && s.store.getUsedCapacity(RESOURCE_ENERGY) <= 500))



    if (refillStructures.length == 0) {
        refillStructures = structures
            .filter(s => s.structureType == STRUCTURE_TOWER
                && s.store.getUsedCapacity(RESOURCE_ENERGY) <= 950)
    }

    if (refillStructures.length > 0) {
        for (let structure of refillStructures) {
            /*
                This line is costing too much CPU (2-4 CPU)

            if (structure.forecast(RESOURCE_ENERGY) >= structure.store.getCapacity(RESOURCE_ENERGY)){
                continue
            }*/
            const qty = Math.min(creep.store.getCapacity(RESOURCE_ENERGY), structure.forecast(RESOURCE_ENERGY))
            tasks.push(new Task(structure.id, 'transfer', RESOURCE_ENERGY, qty))
        }
    }

    return tasks
}

/**
 * 
 * @param {Creep} creep 
 * @param {Structure[]} structures
 * @returns {Task[]}
 */
function getWithdrawTasks(creep, structures) {
    let tasks = []

    let withdrawStructures = structures
        .filter(s => (s.structureType == STRUCTURE_STORAGE
            || s.structureType == STRUCTURE_CONTAINER)
            && s.forecast(RESOURCE_ENERGY) >= creep.store.getFreeCapacity())

    if (withdrawStructures.length == 0) {
        withdrawStructures = structures
            .filter(s => (s.structureType == STRUCTURE_STORAGE
                || s.structureType == STRUCTURE_CONTAINER
                || s.structureType == STRUCTURE_TERMINAL)
                && s.forecast(RESOURCE_ENERGY) > 0)
    }

    for (const structure of withdrawStructures) {
        const qty = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), structure.forecast(RESOURCE_ENERGY))
        tasks.push(new Task(structure.id, 'withdraw', RESOURCE_ENERGY, qty))
    }
    return tasks
}


/**
 * 
 * @param {Creep} creep 
 * @returns {Task[]}
 */
function getPickupTasks(creep) {
    let tasks = []

    const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType == RESOURCE_ENERGY)
    for (const e of droppedEnergy) {
        const qty = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), e.amount)
        tasks.push(new Task(e.id, 'pickup', RESOURCE_ENERGY, qty))
    }
    return tasks
}