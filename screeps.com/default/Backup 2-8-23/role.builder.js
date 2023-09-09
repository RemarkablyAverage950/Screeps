let { moveCreep, findParking } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

const roleBuilder = {
    run: function (creep) {

        const home = creep.memory.home
        if(creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0
        &&creepTasks[home][creep.name].task.type == 'build'){
            creepTasks[home][creep.name].task.target = undefined
        }

        if (!creepTasks[home][creep.name].task.target) {
            let allowWithdraw = true
            let allowBuild = true
            // If energy == 0 Only disable transfer
            if (creep.store[RESOURCE_ENERGY] == 0) {
                allowBuild = false
                // if energy == 100 disable withdraw
            } else if (creep.store.getFreeCapacity() == 0) {
                allowWithdraw = false
            }
            let availableTasks = []
            const structures = creep.room.find(FIND_STRUCTURES)
            if (allowWithdraw) {
                availableTasks = availableTasks.concat(getWithdrawTasks(creep, structures))
            }
            if (allowBuild) {
                availableTasks = availableTasks.concat(getBuildTasks(creep, structures))
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
        if(!target){
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
        } else if (task == 'build') {
            if (target.progress == target.progressTotal) {
                clearTask(creep)
                return
            }
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                ret = moveCreep(creep, target);
            } else {
                creep.memory.moving = false
                if(target.progress == target.progressTotal){
                    clearTask(creep)
                }
                return
            }
        }
    }

}

/**
 * 
 * @param {Creep} creep 
 * @returns {Task[]}
 */
function getBuildTasks(creep) {
    let tasks = []

    let constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
    for (let site of constructionSites) {
        const qty = Math.min(creep.store.getUsedCapacity(RESOURCE_ENERGY), site.progressTotal - site.progress)
        tasks.push(new Task(site.id, 'build', RESOURCE_ENERGY, qty))
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

module.exports = roleBuilder