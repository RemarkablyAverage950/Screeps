let { moveCreep, findParking } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks')

const roleUpgarder = {
    run: function (creep) {
        const home = creep.memory.home
        let task = creepTasks[home][creep.name].task
        if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && task.type == 'upgrade')
            || ((task.type == 'harvest' || task.type == 'withdraw') && creep.store.getFreeCapacity() == 0)) {
            clearTask(creep)
        }

        if (!creepTasks[home][creep.name].task.target) {
            let allowWithdraw = true
            let allowUpgrade = true
            // If energy == 0 Only disable transfer
            if (creep.store[RESOURCE_ENERGY] == 0) {
                allowUpgrade = false
                // if energy == 100 disable withdraw
            } else if (creep.store.getFreeCapacity() == 0) {
                allowWithdraw = false
            }
            let availableTasks = []
            const structures = creep.room.find(FIND_STRUCTURES)
            if (allowWithdraw) {
                availableTasks = availableTasks.concat(getWithdrawTasks(creep, structures))
            }
            if (allowUpgrade) {
                availableTasks = availableTasks.concat(getUpgradeTasks(creep, structures))
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

         task = creepTasks[home][creep.name].task.type
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
        } else if (task == 'harvest') {
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                moveCreep(creep, target)
            } else {
                creep.memory.moving = false
                return
            }
        } else if (task == 'upgrade') {
            if (creep.pos.getRangeTo(target) > 3) {
                creep.memory.moving = true
                return moveCreep(creep, target);
            } else {
                let look = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y)
                for (let lo of look) {
                    if (lo.structureType == STRUCTURE_ROAD) {
                        let pos = findOpenControllerPosition(creep, target)
                        if (!pos) {
                            creep.memory.moving = false
                            return
                        }
                        creep.moveTo(pos)
                        creep.memory.moving = true
                        return
                    }
                }
                creep.upgradeController(target)
                creep.memory.moving = false
            }
        }
    }
}

module.exports = roleUpgarder

/**
 * 
 * @param {Creep} creep 
 * @param {StructureController} controller 
 * @returns 
 */
function findOpenControllerPosition(creep, controller) {
    let positions = []
    for (let x = controller.pos.x - 3; x <= controller.pos.x + 3; x++) {
        for (let y = controller.pos.y - 3; y <= controller.pos.y + 3; y++) {
            let pos = new RoomPosition(x, y, creep.room.name)
            let look = pos.look()
            let bool = true
            for (let lo of look) {
                if (lo.type == LOOK_CREEPS || lo.type == LOOK_STRUCTURES || lo.type == LOOK_TERRAIN && lo.terrain == 'wall') {
                    bool = false
                    break
                }
            }

            if (bool) {
                positions.push(pos)
            }

        }
    }
    let movePos = creep.pos.findClosestByRange(positions)
    return movePos
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
            || s.structureType == STRUCTURE_CONTAINER
            || s.structureType == STRUCTURE_LINK)
            && s.forecast(RESOURCE_ENERGY) >= creep.store.getFreeCapacity())

    if (withdrawStructures.length == 0) {
        withdrawStructures = structures
            .filter(s => (s.structureType == STRUCTURE_STORAGE
                || s.structureType == STRUCTURE_CONTAINER
                || s.structureType == STRUCTURE_LINK)
                && s.forecast(RESOURCE_ENERGY) >= 0)
    }
    if (withdrawStructures.length == 0) {
        const sources = creep.room.find(FIND_SOURCES).filter(s => s.assignedCreeps().length < s.maxCreeps())
        for (let source of sources) {
            tasks.push(new Task(source.id, 'harvest', RESOURCE_ENERGY, creep.store.getFreeCapacity()))
        }
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
function getUpgradeTasks(creep) {
    let tasks = []
    let controller = creep.room.controller
    tasks.push(new Task(controller.id, 'upgrade', RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY)))
    return tasks
}