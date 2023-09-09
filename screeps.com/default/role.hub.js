const { moveCreep } = require("./movecreep")
// hub keeps track of each rooms hub information. More will be added to this later.
let hub = {}

class Task {
    constructor(type, target, resource, qty) {
        this.type = type
        this.target = target
        this.resource = resource
        this.qty = qty
    }
}

const roleHub = {
    /**
     * 
     * @param {Creep} creep 
     * @returns  {void}
     */
    run: function (creep) {
        if (!hub[creep.room.name]) {

            initializeHub(creep)
        }

        let roomHub = hub[creep.room.name]
        let hubPosition = roomHub.position
        const storage = creep.room.storage

        if (!storage) {
            return
        }

        if (!roomHub.linkId) {
            initializeHubLink(creep, roomHub)
        }

        if (creep.pos.x != hubPosition.x || creep.pos.y != hubPosition.y) {
            moveCreep(creep, hubPosition, 0, 1)
        } else {
            creep.memory.moving = false
            let tasks = roomHub.tasks

            if (tasks.length == 0) {
                assignTasks(creep, storage)
            }

            if (hub[creep.room.name].tasks.length > 0) {

                hubTask(creep, storage)
            }
        }
    }
}

module.exports = { roleHub: roleHub, hub: hub }

/**
 * 
 * @param {Creep} creep 
 */
function initializeHub(creep) {
    hub[creep.room.name] = {
        storageId: creep.room.storage ? creep.room.storage.id : undefined,
        tasks: [],
        position: new RoomPosition(creep.room.storage.pos.x - 1, creep.room.storage.pos.y + 1, creep.room.name),
        linkId: undefined
    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {Object} roomHub 
 */
function initializeHubLink(creep) {
    const hubLink = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK && s.pos.isNearTo(creep.room.storage))[0]
    if (hubLink) {
        hub[creep.room.name].linkId = hubLink.id
    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {StructureStorage} storage 
 * @returns 
 */
function assignTasks(creep, storage) {
    let tasks = []
    let hubLink = Game.getObjectById(hub[creep.room.name].linkId)


    if (hubLink && hubLink.energy <= 400) {
        const qty = Math.min(creep.store.getFreeCapacity(), 400 - hubLink.store.getUsedCapacity(RESOURCE_ENERGY))
        let withdrawTask = new Task('withdraw', storage.id, RESOURCE_ENERGY, qty)
        let transferTask = new Task('transfer', hubLink.id, RESOURCE_ENERGY, qty)
        tasks.push(withdrawTask)
        tasks.push(transferTask)
        hub[creep.room.name].tasks = tasks
        return
    }

    const terminal = creep.room.terminal
    if (storage && terminal) {
        for (const resource of RESOURCES_ALL) {
            if (resource == RESOURCE_ENERGY) {
                if (terminal.store[resource] < 100000 && storage.store[resource] > 100000) {

                    const qty = Math.min(creep.store.getFreeCapacity(), 100000 - terminal.store[resource])
                    let withdrawTask = new Task('withdraw', storage.id, RESOURCE_ENERGY, qty)
                    let transferTask = new Task('transfer', terminal.id, RESOURCE_ENERGY, qty)
                    tasks.push(withdrawTask)
                    tasks.push(transferTask)
                    hub[creep.room.name].tasks = tasks
                    return

                } else if (terminal.store[resource] > 101000) {

                    const qty = Math.min(creep.store.getFreeCapacity(), terminal.store[resource] - 100000)
                    let withdrawTask = new Task('withdraw', terminal.id, RESOURCE_ENERGY, qty)
                    let transferTask = new Task('transfer', storage.id, RESOURCE_ENERGY, qty)
                    tasks.push(withdrawTask)
                    tasks.push(transferTask)
                    hub[creep.room.name].tasks = tasks
                    return

                }
            } else if (terminal.store[resource] < 3000 && storage.store[resource] > 10000) {

                const qty = Math.min(creep.store.getFreeCapacity(), 3000 - terminal.store[resource])
                let withdrawTask = new Task('withdraw', storage.id, resource, qty)
                let transferTask = new Task('transfer', terminal.id, resource, qty)
                tasks.push(withdrawTask)
                tasks.push(transferTask)
                hub[creep.room.name].tasks = tasks
                return
            } else if (terminal.store[resource] > 3100) {

                const qty = Math.min(creep.store.getFreeCapacity(), terminal.store[resource] - 3000)
                let withdrawTask = new Task('withdraw', terminal.id, resource, qty)
                let transferTask = new Task('transfer', storage.id, resource, qty)
                tasks.push(withdrawTask)
                tasks.push(transferTask)
                hub[creep.room.name].tasks = tasks
                return
            }

        }
    }



}

/**
 * 
 * @param {Creep} creep 
 */
function hubTask(creep) {
    let task = hub[creep.room.name].tasks.shift()
    const target = Game.getObjectById(task.target)
    switch (task.type) {
        case 'withdraw':
            creep.withdraw(target, task.resource, task.qty)
            break

        case 'transfer':
            creep.transfer(target, task.resource, task.qty)
            break
    }
}