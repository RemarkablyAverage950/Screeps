let { moveCreep, findParking } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

mineralContainers = []

const roleHauler = {
    run: function (creep) {
        const home = creep.memory.home

        if (!creepTasks[home][creep.name].task.target) {
            let allowWithdraw = true
            let allowTransfer = true
            let allowLab = false
            const structures = creep.room.find(FIND_STRUCTURES)

            if (creep.store.getUsedCapacity() == 0) {
                allowTransfer = false
                allowLab = true
            } else if (creep.store.getFreeCapacity() == 0) {
                allowWithdraw = false
            }

            let availableTasks = []

            if (allowWithdraw) {
                // get lab tasks

                // if none, get tombstone tasks

                // if none, get pickup tasks

                // if none, get withdraw tasks
                availableTasks = availableTasks.concat(getWithdrawTasks(creep, structures))
            }
            if (allowTransfer) {
                availableTasks = availableTasks.concat(getTransferTasks(creep, structures))
            }

            // find closest by range
            let taskStructures = availableTasks.map(t => Game.getObjectById(t.target))
            let closest = creep.pos.findClosestByRange(taskStructures)
            if (closest) {
                let tasks = availableTasks.filter(t => t.target == closest.id)
                creepTasks[home][creep.name].task = tasks.shift()
                creepTasks[home][creep.name].taskQueue = tasks
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
        const resource = creepTasks[home][creep.name].task.resource
        const qty = creepTasks[home][creep.name].task.qty
        if (!target) {
            clearTask(creep)
            return
        }

        if (task == 'withdraw') {
            if (target.store.getUsedCapacity(resource) === 0) {
                clearTask(creep)
                return
            }
            if (creep.withdraw(target, resource) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                const ret = moveCreep(creep, target)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            } else {
                clearTask(creep)
                return
            }
        } else if (task == 'transfer') {
            if (creep.transfer(target, resource) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                ret = moveCreep(creep, target);
            } else {
                creep.memory.moving = false
                clearTask(creep)
                return
            }
        }
    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {Structure[]} structures
 * @returns {Task[]}
 */
function getWithdrawTasks(creep, structures) {
    let tasks = []
    let capacity = creep.store.getFreeCapacity()
    let withdrawStructures;
    let tombstones = creep.room.find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity() > 0)
    if (tombstones.length > 0) {
        withdrawStructures = tombstones
    } else {
        let spawns = structures.filter(s => s.structureType == STRUCTURE_SPAWN)
        withdrawStructures = structures
            .filter(s => {

                if (s.structureType == STRUCTURE_CONTAINER
                    && s.store.getUsedCapacity() > 50) {

                    for (let spawn of spawns) {
                        if (s.pos.getRangeTo(spawn) <= 2) { return false }
                    }
                    return true
                }
            })
    }
    let target = _.max(withdrawStructures, s => s.store.getUsedCapacity())

    for (const resource in target.store) {

        if (capacity <= 0) {
            break;
        };

        const qty = Math.min(creep.store.getFreeCapacity(resource), target.forecast(resource))
        capacity -= qty
        tasks.push(new Task(target.id, 'withdraw', resource, qty))
    }


    return tasks
}

function getTransferTasks(creep) {
    let tasks = []
    const storage = creep.room.storage
    if (!storage) {
        return tasks
    }

    for (const resource in creep.store) {
        const qty = creep.store.getUsedCapacity(resource)
        tasks.push(new Task(storage.id, 'transfer', resource, qty))
    }

    return tasks
}

module.exports = roleHauler