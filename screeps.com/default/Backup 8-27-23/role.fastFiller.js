const { linkData } = require('links')
const { moveCreep } = require("movecreep")
let { clearTask, creepTasks, Task } = require('tasks')

let fastFill = {}

let roleFastFiller = {
    run: function (creep) {
        let link = Game.getObjectById(linkData[creep.room.name].spawn)
        if(!link){
            return
        }

        if (!fastFill[creep.room.name]) {

            initializeFastFill(creep, link)
        }
        const home = creep.memory.home
        if ((creepTasks[home][creep.name].task.type == 'transfer' && creep.store[RESOURCE_ENERGY] == 0)
            || creepTasks[home][creep.name].task.type == 'move' && creep.pos.getRangeTo(link) == 1) {
            clearTask(creep)
        }


        if (creep.pos.getRangeTo(link) > 1) {
            creepTasks[home][creep.name].task = findOpenPosition(creep)

        } else {
            creep.memory.moving = false
            creepTasks[home][creep.name].task = findTask(creep)
        }
        if (!creepTasks[home][creep.name].task) {
            return
        }
        let target = creepTasks[home][creep.name].task.target
        const task = creepTasks[home][creep.name].task.type
        if (task == 'move') {
            target = new RoomPosition(target.x, target.y, creep.room.name)

            if (creep.pos.getRangeTo(target) > 0) {
                moveCreep(creep, target, 0, 1)
                return
            }
            else {
                creep.memory.moving = false
                clearTask(creep)
                return
            }
        }
        target = Game.getObjectById(target)
        if (task == 'withdraw') {
            if (target.store[RESOURCE_ENERGY] === 0) {
                clearTask(creep)
                creep.memory.moving = false
                return
            }
            creep.withdraw(target, RESOURCE_ENERGY)
            clearTask(creep)
            return

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
        }


    }
}

/**
 * 
 * @param {Creep} creep
 * @param {StructureLink} link 
 */
function initializeFastFill(creep, link) {

    fastFill[creep.room.name] = {
        position0: new RoomPosition(link.pos.x - 1, link.pos.y - 1, creep.room.name),
        position1: new RoomPosition(link.pos.x + 1, link.pos.y - 1, creep.room.name),
        position2: new RoomPosition(link.pos.x - 1, link.pos.y + 1, creep.room.name),
        position3: new RoomPosition(link.pos.x + 1, link.pos.y + 1, creep.room.name),
    }
}

/**
 * 
 * @param {Creep} creep 
 */
function findOpenPosition(creep) {
    const positions = fastFill[creep.room.name];
    for (let i = 0; i < 4; i++) {
        const position = positions['position' + i];
        const look = creep.room.lookForAt(LOOK_CREEPS, position);
        if (look.length === 0) {
            return new Task(position, 'move', undefined, undefined);
        }
    }
}





function findTask(creep) {
    let structures = creep.room.find(FIND_STRUCTURES).filter(s => creep.pos.getRangeTo(s) == 1)

    if (creep.store[RESOURCE_ENERGY] == 0) {

        let withdrawStructures = structures.filter(s => s.structureType == STRUCTURE_LINK
            && s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity())

        if (withdrawStructures.length == 0) {
            withdrawStructures = structures.filter(s => s.structureType == STRUCTURE_CONTAINER
                && s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity())
        }

        if (withdrawStructures.length > 0) {
            return new Task(withdrawStructures[0].id, 'withdraw', undefined, undefined)
        }
    } else {
        let transferStructures = structures.filter(s => (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        if (transferStructures.length > 0) {
            return new Task(transferStructures[0].id, 'transfer', undefined, undefined)
        }
        transferStructures = structures.filter(s => (s.structureType == STRUCTURE_CONTAINER) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        if (transferStructures.length > 0) {
            return new Task(transferStructures[0].id, 'transfer', undefined, undefined)
        }
    }



}

module.exports = roleFastFiller