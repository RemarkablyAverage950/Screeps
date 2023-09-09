let { moveCreep, findParking } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

const roleMiner = {
    run: function (creep) {
        const home = creep.memory.home

        if (!creepTasks[home][creep.name].task.target) {

            let availableTasks = []
            const structures = creep.room.find(FIND_STRUCTURES)

            availableTasks = getMiningTasks(creep, structures)

            if (availableTasks.length > 0) {
                creepTasks[home][creep.name].task = availableTasks.shift()
                creepTasks[home][creep.name].taskQueue = availableTasks

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

        if (task == 'move') {
            if (creep.pos.getRangeTo(target) > 0) {
                moveCreep(creep, target, 0, 1)
            }
            else {
                clearTask(creep)
                return
            }
        } else if (task == 'harvest') {
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                clearTask(creep)
            } else {
                creep.memory.moving = false
                return
            }
        }
    }
}


function getMiningTasks(creep, structures) {
    let tasks = []


    const sources = creep.room.find(FIND_SOURCES).filter(s => !s.assignedCreeps().some(c => Game.creeps[c].memory.role == 'miner'))
    const containers = structures.filter(s => s.structureType == STRUCTURE_CONTAINER && !s.assignedCreeps().some(c => Game.creeps[c].memory.role == 'miner'))
    const extractors = structures.filter(s => s.structureType == STRUCTURE_EXTRACTOR)

    
    let sourceGroups = []
    for (let source of sources) {
        const sourceContainers = source.pos.findInRange(containers, 1)
        if (sourceContainers.length != 1) {
            continue
        }
        sourceGroups.push([source, sourceContainers[0]])
    }
    const mineral = creep.room.find(FIND_MINERALS)[0]
    if (extractors.length > 0 && mineral.mineralAmount > 0&& !mineral.assignedCreeps().some(c => Game.creeps[c].memory.role == 'miner')) {
        const mineral = creep.room.find(FIND_MINERALS)[0]
        const container = mineral.pos.findInRange(containers, 1)[0]
        if (container) {
            sourceGroups.push([mineral, container])

        }
    }

    if (sourceGroups.length > 0) {
        const availableSources = sourceGroups.map(s => s[0])
        const closest = creep.pos.findClosestByRange(availableSources)
        tasks.push(new Task(closest.getContainer().id, 'move', undefined, undefined))
        tasks.push(new Task(closest.id, 'harvest', RESOURCE_ENERGY, undefined))
        return tasks
    }


    return tasks
}






/*

Legacy:

let roleMiner = {
    run: function (creep) {
        let moveTarget = Game.getObjectById(creep.memory.moveTarget);
        let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
        if (!moveTarget || !harvestTarget) {
            creep.memory.harvestTarget = undefined
            creep.memory.moveTarget = undefined
            creep.memory.needTask = true
            creep.memory.targetRoom = undefined
            creep.memory.clearPath = true
        }
        if (creep.pos.getRangeTo(moveTarget) > 0) {
            let ret = moveCreep(creep, moveTarget, 0, 5)
            if (ret == 0) {
                creep.memory.moving = true
            } else {
                creep.memory.moving = false
            }
        } else {
            creep.harvest(harvestTarget);
            creep.memory.moving = false
        }
    }
}

*/

module.exports = roleMiner