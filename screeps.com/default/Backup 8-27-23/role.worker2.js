let { moveCreep, findParking, moveToTargetRoom } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

const roleWorker = {
    run: function (creep) {
        const home = creep.memory.home
        let task = creepTasks[home][creep.name].task
        if ((task.type == 'repair' && (creep.store.getUsedCapacity() == 0 || Game.getObjectById(task.target).hits == Game.getObjectById(task.target).hitsMax))
            || ((task.type == 'harvest' || task.type == 'withdraw') && creep.store.getFreeCapacity() == 0)
            || (task.type == 'build' && (creep.store.getUsedCapacity() == 0 || !Game.getObjectById(task.target) || Game.getObjectById(task.target).progress == Game.getObjectById(task.target).progressTotal))
            || (task.type == 'dismantle' && !Game.getObjectById(task.target))
            || (task.type == 'pickup' && (creep.store.getFreeCapacity() == 0 || !Game.getObjectById(task.target)))
            || (task.type == 'transfer' && Game.getObjectById(task.target).store.getFreeCapacity(RESOURCE_ENERGY) == 0)
            || (task.type == 'upgradeController' && creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0)) {
            clearTask(creep)
        }
        if (!creepTasks[home][creep.name].task || !creepTasks[home][creep.name].task.target) {
            let allowWork = true
            let allowRestock = true
            let availableTasks = []

            if (creep.store[RESOURCE_ENERGY] == 0) {
                allowWork = false
            }
            if (creep.store.getFreeCapacity() < .5 * creep.store.getCapacity()) {
                allowRestock = false
            }

            if (allowWork) {
                availableTasks = availableTasks.concat(getWorkTasks(creep))

            }
            if (allowRestock) {
                availableTasks = availableTasks.concat(getRestockTasks(creep))
            }




            let taskStructures = availableTasks.map(t => Game.getObjectById(t.target))
            let closest = creep.pos.findClosestByRange(taskStructures)
            if (closest) {
                let task = availableTasks.find(t => t.target == closest.id)
                creepTasks[home][creep.name].task = task
            }else{
                creep.memory.moving = false
            }
        }


        task = creepTasks[home][creep.name].task.type
        let target = creepTasks[home][creep.name].task.target

        if (task == 'moveToRoom') {
            moveToTargetRoom(creep, target)
            return
        }

        target = Game.getObjectById(target)
        if (!target) {
            clearTask(creep)
            return
        }

        if (task == 'withdraw') {
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                moveCreep(creep, target)
            }
            else {
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
        } else if (task == 'build') {
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                moveCreep(creep, target)
            } else {
                creep.memory.moving = false
                return
            }
        } else if (task == 'dismantle') {
            if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
                moveCreep(creep, target)
            } else {
                creep.memory.moving = false
                return
            }
        } else if (task == 'pickup') {
            if (creep.pickup(target) == ERR_NOT_IN_RANGE) {
                moveCreep(creep, target)
            } else {
                creep.memory.moving = false
                return
            }
        } else if (task == 'upgradeController') {

            if (creep.pos.getRangeTo(target) > 3) {
                creep.memory.moving = true
                moveCreep(creep, target);
                return
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
        } else if (task == 'transfer') {
            if (target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                clearTask(creep)
                return
            }
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.memory.moving = true
                ret = moveCreep(creep, target);
            } else {
                clearTask(creep)
                return
            }
        } else if (task == 'repair') {
            if (creep.pos.getRangeTo(target.pos) >= 3) {
                moveCreep(creep, target)
                return
            } else
                if (creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y).length > 0) {
                    let pos = findOpenRepairPosition(creep, target)
                    if (pos) {
                        moveCreep(creep, pos, 0)
                    }
                    return
                }
            creep.memory.moving = false
            creep.repair(target)
        }
    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {StructureController} controller 
 * @returns 
 */
function findOpenRepairPosition(creep, target) {
    let positions = []
    for (let x = target.pos.x - 1; x <= target.pos.x + 1; x++) {
        for (let y = target.pos.y - 1; y <= target.pos.y + 1; y++) {
            let pos = new RoomPosition(x, y, creep.room.name)
            let look = pos.look()
            let bool = true
            for (let lo of look) {
                if (lo.type == LOOK_CREEPS || lo.type == LOOK_STRUCTURES || (lo.type == LOOK_TERRAIN && lo.terrain == 'wall')) {
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


function getRestockTasks(creep) {
    let tasks = []
    const containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.forecast(RESOURCE_ENERGY) >= creep.store.getFreeCapacity())
    if (containers.length > 0) {
        for (const container of containers) {
            const qty = Math.min(creep.store.getFreeCapacity(), container.store[RESOURCE_ENERGY])
            tasks.push(new Task(container.id, 'withdraw', RESOURCE_ENERGY, qty))
        }
    } else {
        const sources = creep.room.find(FIND_SOURCES).filter(s => s.energy > 0 && s.assignedCreeps().length < s.maxCreeps())
        for (const source of sources) {
            tasks.push(new Task(source.id, 'harvest', RESOURCE_ENERGY, creep.store.getFreeCapacity()))
        }
    }
    const dropped = creep.room.find(FIND_DROPPED_RESOURCES)
    for (let resource of dropped) {
        if (resource.resourceType == RESOURCE_ENERGY) {
            const qty = Math.min(creep.store.getFreeCapacity(), resource.amount)
            tasks.push(new Task(resource.id, 'pickup', RESOURCE_ENERGY, qty))
        }
    }

    return tasks
}

function getWorkTasks(creep) {
    let tasks = []
    // check for build sites
    let refillStructures = creep.room.find(FIND_STRUCTURES)
        .filter(s => ((s.structureType == STRUCTURE_SPAWN
            || s.structureType == STRUCTURE_EXTENSION)
            && s.store.getUsedCapacity(RESOURCE_ENERGY) < s.store.getCapacity(RESOURCE_ENERGY))
            || (s.structureType == STRUCTURE_TOWER && s.store.getUsedCapacity(RESOURCE_ENERGY) <= 500))



    if (refillStructures.length == 0) {
        refillStructures = creep.room.find(FIND_STRUCTURES)
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
    if (tasks.length > 0) {
        return tasks
    }

    // build
    const sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
    for (const site of sites) {
        const qty = Math.min(creep.store[RESOURCE_ENERGY], site.progressTotal - site.progress)
        tasks.push(new Task(site.id, 'build', RESOURCE_ENERGY, qty))
    }

    // repair
    if (tasks.length == 0 && creep.room.find(FIND_MY_CREEPS).filter(c=> c.memory.role == 'maintainer').length == 0) {
        const structures = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax)
        for (const structure of structures) {
            tasks.push(new Task(structure.id, 'repair', RESOURCE_ENERGY, undefined))
        }
    }

    if (tasks.length == 0) {
        // return tasks
        tasks.push(new Task(creep.room.controller.id, 'upgradeController', RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY)))
    }

    return tasks
}

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



module.exports = roleWorker