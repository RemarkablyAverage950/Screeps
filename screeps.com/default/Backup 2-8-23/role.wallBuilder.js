let { moveCreep, findParking } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks')

const roleWallBuilder = {
    run: function (creep) {
        const home = creep.memory.home
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0
            && creepTasks[home][creep.name].task.type == 'repair') {
            creepTasks[home][creep.name].task.target = undefined
        }

        if (!creepTasks[home][creep.name].task.target) {
            let allowWithdraw = true
            let allowRepair = true
            // If energy == 0 Only disable transfer
            if (creep.store[RESOURCE_ENERGY] == 0) {
                allowRepair = false
                // if energy == 100 disable withdraw
            } else if (creep.store.getFreeCapacity() == 0) {
                allowWithdraw = false
            }
            let availableTasks = []
            const structures = creep.room.find(FIND_STRUCTURES)
            if (allowWithdraw) {
                availableTasks = availableTasks.concat(getWithdrawTasks(creep, structures))
            }
            if (allowRepair) {
                availableTasks = availableTasks.concat(getRepairTasks(creep, structures))
            }

            // find closest by range
            let taskStructures = availableTasks.map(t => Game.getObjectById(t.target))
            let closest = creep.pos.findClosestByRange(taskStructures)
            if (closest) {
                let task = availableTasks.find(t => t.target == closest.id)
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
        if (!target) {
            clearTask(creep)
            return
        }

        if (task == 'withdraw') {
            if (target.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                clearTask(creep)
                return
            }
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                const ret = moveCreep(creep, target)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            } else {
                clearTask(creep)
                return
            }
        } else if (task == 'repair') {
            if (target.hits == target.hitsMax) {
                clearTask(creep)
                return
            }
            if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                ret = moveCreep(creep, target);
            } else {
                creep.memory.moving = false
                if (target.hits == target.hitsMax) {
                    clearTask(creep)
                }
                return
            }
        }
    }
}

module.exports = roleWallBuilder

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

function getRepairTasks(creep, structures) {
    let tasks = []
    let repairStructures = structures.filter(s => s.structureType == STRUCTURE_RAMPART && s.hits < s.hitsMax)
    let target = _.min(repairStructures, s => s.hits)
    tasks.push(new Task(target.id, 'repair', RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY)))
    return tasks
}