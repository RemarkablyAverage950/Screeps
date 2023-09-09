class Task {
    constructor(id, type, resource, qty) {
        this.id = id
        this.type = type
        this.resource = resource
        this.qty = qty
    }
}

class TaskEngine {
    constructor(room) {
        this.room = room
        this.structures = this.room.find(FIND_STRUCTURES)
        this.assignedTasks = this.room.find(FIND_MY_SPAWNS)[0].memory.assignedTasks
    }
    get workerTasks() {
        this.structures.filter(s => (s.structureType == STRUCTURE_SPAWN
            || s.structureType == STRUCTURE_EXTENSION)
            && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            && unassignedResource(s, RESOURCE_ENERGY, this.assignedTasks) > 0).forEach(s=>{
                
            })
    }
}

function unassignedResource(obj, resource, assignedTasks) {
    let qty = obj.store.getUsedCapacity(resource)
    assignedTasks.filter(t => t.id == obj.id && t.resource == obj.resource).forEach(t => {
        qty -= t.qty
    })
    return qty
}

export function getTasks(room, structures, assignedTasks) {
    let availableTasks = []
    structures.filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION)).forEach(s => {
        let qty = s.store.getFreeCapacity(RESOURCE_ENERGY)
        assignedTasks.filter(t => t.id == s.id).forEach(t => qty -= t.qty)
        if (qty > 0) {
            availableTasks.push(new Task(s.id, 'refill', RESOURCE_ENERGY, qty))
        }
    });
}

export function assignTasks(creep, availableTasks, structures) {
    let assignedTasks = []
    switch (creep.memory.role) {
        case 'worker':
            // look for worker tasks

            let workerTasks = availableTasks.filter(t => t.type == 'refill')

            if (workerTasks.length > 0) {

                // take first task
                let task = availableTasks[0]
                // check if we have enough resources to complete the task
                if (creep.store.getUsedCapacity(task.resource) < task.qty) {
                    // assign subtask (refill energy)
                    let subtask = getResource(creep, task.resource, structures)

                    if (subtask) {
                        assignedTasks.push(subtask)
                    } else {
                        return
                    }
                }




                // adjust/remove available task based on quantity







            }



            break
    }


    return assignedTasks
}


function getResource(creep, resource, structures) {
    let task = undefined;
    let freeCapacity = creep.store.getFreeCapacity()
    switch (resource) {
        case RESOURCE_ENERGY:
            let energyContainers = structures.filter(s => (s.structureType == STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store.getUsedCapacity(resource) >= freeCapacity)
            // subtract energy in containers with active tasks



            if (energyContainers.length > 0) {
                let arr = []
                energyContainers.forEach(e => {
                    let energy = e.store.getUsedCapacity(resource);

                    assignedTasks.filter(t => t.id == e.id && t.resource == resource).forEach(t => {
                        energy -= t.qty
                    })
                    if (energy > freeCapacity) {
                        arr.push(e)
                    }
                })
                if (arr.length > 0) {

                    let target = creep.pos.findClosestByPath(arr)
                    return new Task(target.id, 'withdraw', resource, creep.store.getCapacity())
                }
            }
            let sources = creep.room.find(FIND_SOURCES)


            break;
    }
}