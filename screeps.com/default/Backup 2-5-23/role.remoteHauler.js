let { moveCreep, findParking, moveToTargetRoom } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

const remoteHauler = {
    run: function (creep) {
        const home = creep.memory.home

        let allowWithdraw = true
        let allowTransfer = true

        if (!creepTasks[home][creep.name].task.target) {
            if (creep.store[RESOURCE_ENERGY] == 0) {
                allowTransfer = false
            } else if (creep.store.getUsedCapacity() > 0) {
                allowWithdraw = false
            }

            let availableTasks = []

            if (allowWithdraw) {

                // if none, get tombstone tasks

                // if none, get pickup tasks

                // if none, get withdraw tasks
                availableTasks = availableTasks.concat(getWithdrawTasks(creep))
            }
            if (availableTasks.length == 0 && allowTransfer) {
                availableTasks = availableTasks.concat(getTransferTasks(creep))
            }

            // find closest by range
            if (availableTasks.length > 0) {
                creepTasks[home][creep.name].task = availableTasks[0]
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
            if (target.store.getUsedCapacity() === 0) {
                clearTask(creep)
                return
            }
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                const ret = moveCreep(creep, target, 1, 5)// creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            } else {
                clearTask(creep)
                return
            }
        } else if (task == 'transfer') {
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                ret = moveCreep(creep, target, 1, 5);
            } else {
                creep.memory.moving = false
                clearTask(creep)
                return
            }
        }
    }
}
module.exports = remoteHauler

function getWithdrawTasks(creep) {
    const outposts = Memory.rooms[creep.memory.home].outposts
    let tasks = []
    let containers = [];
    for (let outpost in outposts) {
        let room = Game.rooms[outpost]
        if (!room) {
            continue
        }
        containers = containers.concat(room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER))
    }

    if (containers.length > 0) {
        const target = _.max(containers, c => c.forecast(RESOURCE_ENERGY))
        if (target.store[RESOURCE_ENERGY] > 0) {
            const qty = Math.min(creep.store.getFreeCapacity(), target.store[RESOURCE_ENERGY])
            tasks.push(new Task(target.id, 'withdraw', RESOURCE_ENERGY, qty))
        }
    }
    return tasks
}

function getTransferTasks(creep) {
    let room = Game.rooms[creep.memory.home]

    let tasks = []

    tasks.push(new Task(room.storage.id, 'transfer', RESOURCE_ENERGY), creep.store.getUsedCapacity(RESOURCE_ENERGY))
    return tasks
}