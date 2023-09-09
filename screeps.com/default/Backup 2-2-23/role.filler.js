let { moveCreep, findParking } = require('movecreep');
let { clearMemory, initialize, creepTasks, Task } = require('tasks')




let roleFiller = {


    /**
     * 
     * @param {Creep} creep 
     * @returns {void}
     */
    run: function (creep) {


        const home = creep.memory.home
        initialize(creep, home)
        let allowWithdraw = true
        let allowTransfer = true
        // If energy == 0 Only disable transfer
        if (creep.store[RESOURCE_ENERGY] == 0) {
            allowTransfer = false
            // if energy == 100 disable withdraw
        } else if (creep.store.getFreeCapacity() == 0) {
            allowWithdraw = false
        }

        if (!creepTasks[home][creep.name].target) {
            let availableTasks = []
            const structures = creep.room.find(FIND_STRUCTURES)
            if (allowWithdraw) {
                availableTasks = availableTasks.concat(getWithdrawTasks(creep, structures))
            }
            if (allowTransfer) {
                availableTasks = availableTasks.concat(getTransferTasks(creep, structures))
            }

            // find closest by range
            let taskStructures = availableTasks.map(t => Game.getObjectById(t.target))
            let closest = creep.pos.findClosestByRange(taskStructures)
            if (closest) {
                let task = availableTasks.find(t => t.target == closest.id)
                creepTasks[home][creep.name] = task
            } else {
                if (creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y).length > 0) {
                    findParking(creep)
                    return
                }
                creep.memory.moving = false
                return
            }

        }

        const task = creepTasks[home][creep.name].task
        const target = Game.getObjectById(creepTasks[home][creep.name].target)

        if (task == 'withdraw') {
            if (target.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                clearMemory(creep)
                return
            }
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                const ret = moveCreep(creep, target)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            } else {
                clearMemory(creep)
                return
            }
        } else if (task == 'transfer') {
            if (target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                clearMemory(creep)
                return
            }
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                ret = moveCreep(creep, target);
            } else {
                clearMemory(creep)
                return
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
            && s.forecast(RESOURCE_ENERGY) < s.store.getCapacity(RESOURCE_ENERGY))
            || (s.structureType == STRUCTURE_TOWER && s.forecast(RESOURCE_ENERGY) <= 500))

    // If there are none, check for towers > 100

    if (refillStructures.length == 0) {
        refillStructures = structures
            .filter(s => s.structureType == STRUCTURE_TOWER
                && s.forecast(RESOURCE_ENERGY) <= 950)
    }

    if (refillStructures.length > 0) {
        for (let structure of refillStructures) {
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
                || s.structureType == STRUCTURE_CONTAINER)
                && s.forecast(RESOURCE_ENERGY) >= 0)
    }

    for (const structure of withdrawStructures) {
        const qty = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), structure.forecast(RESOURCE_ENERGY))
        tasks.push(new Task(structure.id, 'withdraw', RESOURCE_ENERGY, qty))
    }
    return tasks
}

