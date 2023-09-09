const { moveCreep } = require("./movecreep")
let hub = {}

class Task {
    constructor(type, target, resource, qty) {
        this.type = type
        this.target = target
        this.resource = resource
        this.qty = qty
    }
}

let roleHub = {
    run: function (creep) {
        if (!hub[creep.room.name]) {
            hub[creep.room.name] = {
                storageId: creep.room.storage.id,
                tasks: []
            }
        }

        const storage = creep.room.storage
        if (!storage) {
            return
        }

        let hubPosition = hub[creep.room.name].position
        if (!hubPosition) {
            hubPosition = findHubPosition(creep, storage)
        }

        if (creep.pos.x != hubPosition.x || creep.pos.y != hubPosition.y) {
            moveCreep(creep, new RoomPosition(hubPosition.x, hubPosition.y, hubPosition.roomName), 0, 1)
        } else {
            creep.memory.moving = false
            //if we dont have a hub link return - clean this up.
            if (creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK).length < 2) {
                return
            }
            let tasks = hub[creep.room.name].tasks
            if (tasks.length == 0) {
                assignTasks(creep, storage)
            }

            if (tasks.length > 0) {
                hubTask(creep, storage)
            }

        }
    }

}

module.exports = { roleHub: roleHub, hub: hub }



function findHubPosition(creep, storage) {
    let x = storage.pos.x - 1
    let y = storage.pos.y + 1
    let position = new RoomPosition(x, y, creep.room.name)
    hub[creep.room.name].position = position
    return position
}

function assignTasks(creep, storage) {
    let tasks = hub[creep.room.name].tasks || []

    if (hub[creep.room.name].linkId == undefined) {
        hub[creep.room.name].linkId = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK && s.pos.getRangeTo(storage.pos) == 1)[0].id
    }
    let hubLink = Game.getObjectById(hub[creep.room.name].linkId)
    if (hubLink && hubLink.store[RESOURCE_ENERGY] <= 400) {
        // tasks[]
        const qty = Math.min(creep.store.getFreeCapacity(), hubLink.store.getFreeCapacity(RESOURCE_ENERGY))
        let withdrawTask = new Task('withdraw', storage.id, RESOURCE_ENERGY, qty)
        let transferTask = new Task('transfer', hubLink.id, RESOURCE_ENERGY, qty)
        tasks.push(withdrawTask)
        tasks.push(transferTask)
        return
    }
}

function hubTask(creep, storage) {
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