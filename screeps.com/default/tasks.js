let creepTasks = {}
class Task {
    /**
     * 
     * @param {string} target The target ID.
     * @param {string} type "transfer" or "withdraw"
     * @param {ResourceConstant} resource 
     * @param {number} qty 
     */
    constructor(target, type, resource, qty) {
        this.target = target
        this.type = type
        this.resource = resource
        this.qty = qty
    }
}

/**
 * 
 * @param {Room} room 
 * @param {string[]} roomCreeps 
 */
function manageTasks(room, roomCreeps) {
    initialize(room.name, roomCreeps)
    clear(room.name)


}

/**
 * 
 * @param {string} roomName 
 */
function clear(roomName) {
    for (let name in creepTasks[roomName]) {
        if (!Game.creeps[name]) {
            //console.log('Clearing creep', name, 'from tasks heap.')
            delete creepTasks[roomName][name]
        }
    }
}

/**
 * 
 * @param {Creep} creep 
 */
function clearTask(creep) {

    creepTasks[creep.memory.home][creep.name].task = new Task(undefined, undefined, undefined, undefined)
    if (creepTasks[creep.memory.home][creep.name].taskQueue.length > 0) {
        creepTasks[creep.memory.home][creep.name].task = creepTasks[creep.memory.home][creep.name].taskQueue.shift()
    }
    //creep.memory.moving = false
}

/**
 * 
 * @param {string} roomName 
 * @param {Creep[]} creeps Creeps belonging to a room
 */
function initialize(roomName, creeps) {
    if (!creepTasks[roomName]) {
        creepTasks[roomName] = {}
    }

    for (let creep of creeps) {
        if (creep.name && (!creepTasks[roomName][creep.name] || !creepTasks[roomName][creep.name].task)) {
            creepTasks[roomName][creep.name] = {
                task: new Task(undefined, undefined, undefined, undefined),
                taskQueue: []
            }

        }

    }
}

module.exports = {
    manageTasks: manageTasks,
    clearTask: clearTask,
    initialize: initialize,
    creepTasks: creepTasks,
    Task: Task
}

