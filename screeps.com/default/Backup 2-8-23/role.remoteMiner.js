let { moveCreep, findParking, moveToTargetRoom } = require('movecreep');
let { clearTask, creepTasks, Task } = require('tasks');

let roleRemoteMiner = {
    run: function (creep) {
        const home = creep.memory.home
        if (creepTasks[home][creep.name].task.type == 'moveToRoom' && creep.room.name == creepTasks[home][creep.name].task.target) {
            creepTasks[home][creep.name].task.target = undefined
        }
        if (!creepTasks[home][creep.name].task.target) {

            let availableTasks = []
            availableTasks = getMiningTasks(creep)
            if (availableTasks && availableTasks.length > 0) {
                creepTasks[home][creep.name].task = availableTasks.shift()
                creepTasks[home][creep.name].taskQueue = availableTasks

            } else
                if (creep.pos.x < 3 || creep.pos.x > 46 || creep.pos.y < 3 || creep.pos.y > 46) {
                    const pos = new RoomPosition(25, 25, creep.room.name)
                    moveCreep(creep, pos, 10, 1)
                    return
                }
                else if (creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y).length > 0) {
                    findParking(creep)
                    creep.memory.moving = false
                    return
                }
        }



        const task = creepTasks[home][creep.name].task.type
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

        if (task == 'move') {
            if (creep.pos.getRangeTo(target) > 0) {
                moveCreep(creep, target, 0, 5)
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

    //old below
    //roleMiner.run(creep)
}


module.exports = roleRemoteMiner

function getMiningTasks(creep) {
    const outposts = Memory.rooms[creep.memory.home].outposts
    let tasks = []
    if (Object.keys(outposts).includes(creep.room.name)) {
        const sources = creep.room.find(FIND_SOURCES).filter(s => !s.assignedCreeps().some(c => Game.creeps[c].memory.role == 'remoteMiner'))
        const source = creep.pos.findClosestByRange(sources)
        if (source) {
            const container = source.getContainer()
            if (container) {
                tasks.push(new Task(container.id, 'move', undefined, undefined))
                tasks.push(new Task(source.id, 'harvest', RESOURCE_ENERGY, undefined))
                return tasks
            }
        }
    }

    for (let outpost in outposts) {
        let room = Game.rooms[outpost]
        if (!room) {
            // create move task to outpost
            tasks.push(new Task(outpost, 'moveToRoom', undefined, undefined))
            return tasks
        }

        const sources = room.find(FIND_SOURCES).filter(s => !s.assignedCreeps().some(c => Game.creeps[c].memory.role == 'remoteMiner'))

        for (let source of sources) {

            const container = source.getContainer()

            if (container && !container.assignedCreeps().some(c => Game.creeps[c].memory.role == 'remoteMiner')) {
                tasks.push(new Task(container.id, 'move', undefined, undefined))
                tasks.push(new Task(source.id, 'harvest', RESOURCE_ENERGY, undefined))
                return tasks
            }
        }
    }
    return []
}


