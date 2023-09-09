let creepTasks = {}
class Task {
    /**
     * 
     * @param {string} target The target ID.
     * @param {string} task "transfer" or "withdraw"
     * @param {ResourceConstant} resource 
     * @param {number} qty 
     */
    constructor(target, task, resource, qty) {
        this.target = target
        this.task = task
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
            console.log('Clearing creep', name, 'from tasks heap.')
            delete creepTasks[roomName][name]
        }
    }
}

/**
 * 
 * @param {Creep} creep 
 */
function clearMemory(creep) {
    creepTasks[creep.memory.home][creep.name] = undefined
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
        if (creep.name && !creepTasks[roomName][creep.name]) {
            creepTasks[roomName][creep.name] = new Task(undefined, undefined, undefined, undefined)
        }
    }
}

module.exports = {
    manageTasks: manageTasks,
    clearMemory: clearMemory,
    initialize: initialize,
    creepTasks: creepTasks,
    Task: Task
}

