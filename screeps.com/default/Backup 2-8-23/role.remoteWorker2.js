let { moveCreep, findParking, moveToTargetRoom } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

const remoteWorker = {
    run: function (creep) {
        const home = creep.memory.home
        let task = creepTasks[home][creep.name].task
        if ((task.type == 'moveToRoom' && creep.room.name == task.target)
            || (task.type == 'repair' && (creep.store.getUsedCapacity() == 0 || Game.getObjectById(task.target).hits == Game.getObjectById(task.target).hitsMax))
            || ((task.type == 'harvest' || task.type == 'withdraw') && creep.store.getFreeCapacity() == 0)
            || (task.type == 'build' && (creep.store.getUsedCapacity() == 0 || !Game.getObjectById(task.target) || Game.getObjectById(task.target).progress == Game.getObjectById(task.target).progressTotal))
            || (task.type == 'dismantle' && !Game.getObjectById(task.target))
            || (task.type == 'pickup' && (creep.store.getFreeCapacity() == 0 || !Game.getObjectById(task.target)))) {
            clearTask(creep)
        }
        if (!creepTasks[home][creep.name].task || !creepTasks[home][creep.name].task.target) {
            let allowWork = true
            let allowRestock = true
            let availableTasks = []
            let moveTask;



            // check if we need to move to an outpost
            const outposts = Memory.rooms[home].outposts
            const claimRoom = Memory.rooms[home].claimRoom
            const targetRooms = Object.keys(outposts).concat(claimRoom)
            if (!targetRooms.includes(creep.room.name)) {
                moveTask = getTargetRoom(creep, outposts)
            } else {

                const workTasks = getWorkTasks(creep)
                if (workTasks.length == 0) {
                    moveTask = getTargetRoom(creep, outposts)
                } else {
                    if (creep.store[RESOURCE_ENERGY] == 0) {
                        allowWork = false
                    }
                    if (creep.store.getFreeCapacity() < .5 * creep.store.getCapacity()) {
                        allowRestock = false
                    }

                    if (allowWork) {
                        availableTasks = availableTasks.concat(workTasks)

                    }
                    if (allowRestock) {
                        availableTasks = availableTasks.concat(getRestockTasks(creep))
                    }
                }
            }

            if (moveTask) {

                // set task to movetask
                creepTasks[home][creep.name].task = moveTask
            } else {
                let taskStructures = availableTasks.map(t => Game.getObjectById(t.target))
                let closest = creep.pos.findClosestByRange(taskStructures)
                if (closest) {
                    let task = availableTasks.find(t => t.target == closest.id)
                    creepTasks[home][creep.name].task = task
                }
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
        } else if (task == 'repair') {
            if (creep.pos.getRangeTo(target.pos) >= 3) {
                moveCreep(creep, target)
                return
            } else
                if (creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y).length > 0) {
                    let pos = findOpenRepairPosition(creep, target)
                    moveCreep(creep, pos, 0)
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

function getTargetRoom(creep, outposts) {
    const claimRoom = Game.rooms[creep.memory.home].memory.claimRoom
    if (claimRoom && Game.rooms[claimRoom].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
        return new Task(claimRoom, 'moveToRoom', undefined, undefined)
    }
    const target = _.min(outposts, o => o.workAssignedOnTick).roomName
    Memory.rooms[creep.memory.home].outposts[target].workAssignedOnTick = Game.time
    return new Task(target, 'moveToRoom', undefined, undefined)
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
    let buildMap;
    if (Object.keys(Memory.rooms[creep.memory.home].outposts).includes(creep.room.name)) {
        buildMap = Memory.rooms[creep.memory.home].outposts[creep.room.name].buildMap
        for (const tile of buildMap) {
            if (tile.placed == false) {
                creep.room.createConstructionSite(tile.x, tile.y, tile.structure)
            }
        }
    }

    // build
    const sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
    for (const site of sites) {
        const qty = Math.min(creep.store[RESOURCE_ENERGY], site.progressTotal - site.progress)
        tasks.push(new Task(site.id, 'build', RESOURCE_ENERGY, qty))
    }
    // repair
    if (creep.room.name != Memory.rooms[creep.memory.home].claimRoom) {
        if (tasks.length == 0) {

            const structures = creep.room.find(FIND_STRUCTURES).filter(s => buildMap.some(t => t.x == s.pos.x && t.y == s.pos.y && t.structure == s.structureType) && s.hits < s.hitsMax)
            for (const structure of structures) {
                tasks.push(new Task(structure.id, 'repair', RESOURCE_ENERGY, undefined))
            }
        }
        if (tasks.length == 0) {
            const dismantleStructures = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER && !buildMap.some(t => t.x == s.pos.x && t.y == s.pos.y && t.structure == s.structureType))
            for (const structure of dismantleStructures) {
                tasks.push(new Task(structure.id, 'dismantle', RESOURCE_ENERGY, undefined))
            }

        }
    }
    return tasks
}

module.exports = remoteWorker