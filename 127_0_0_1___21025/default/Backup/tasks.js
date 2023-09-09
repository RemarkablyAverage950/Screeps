class TaskAction {
    constructor(creepId, id, taskType, targetType, resource, qty) {
        this.creepId = creepId
        this.id = id
        this.taskType = taskType
        this.resource = resource
        this.qty = qty
        this.status = 'PENDING'
    }

}




class TaskRequest {
    constructor(home, priority) {
        this.assignedCreeps = []
        this.assignedTasks = []
        this.home = home
        this.priority = priority
        this.status = 'PENDING' | 'IP' | 'COMPLETE'
    }

    get unassignedCreeps() {
        return Game.creeps.filter(c => c.memory.home == this.home && c.memory.assigned == false)
    }

    get findResource() {


        if (this.resource == RESOURCE_ENERGY) {
            //include sources
        }
    }
    assign(creep, refill) {

        let qty = refill ? creep.store.capacity : creep.store[this.resource];
        let task = new TaskAction(creep.id, this.targetId, this.taskType, this.resource, qty)
        creep.memory.taskQueue.push(task)
        this.assignedCreeps.push(creep.id)
        this.assignedTasks.push(task)
    }

}

class restockRequest extends TaskRequest {

    constructor(home, priority, structure) {
        super(home)
        this.targetId = structure.id
        this.taskType = 'restock'
        this.structure = structure
        this.resource = RESOURCE_ENERGY
    }

    get qtyRequired() {
        let qty = this.structure.store.getUsedCapacity(this.resource)
        this.assignedTasks.forEach(t => {
            qty -= t.qty
        })
        return qty
    }

    get updateStatus() {
        if (this.structure.store.getUsedCapacity(this.resource) == 0) {
            this.status = 'COMPLETE'
        } else if (this.creepsAssigned.length > 0) {
            this.status = 'IP'
        }
    }

    validateAssignment(creep) {
        let role = creep.memory.role
        if (role === 'worker' || role === 'transport' || role === 'builder') {
            return true
        }
        return false
    }


}

/**
 * Assigns tasks to creeps without any tasks in queue.
 * 
 * @param {Room} room Room object.
 * @param {Creep[]} roomCreeps All creeps belonging to a room.
 * @param {Structure[]} structures All structures in room.
 */
function taskManager(room, roomCreeps, structures, globalRequests) {

    // Fetch standing requests from last tick. 
    // Check for new requests and add them to the list.

    let requests = getRequests(room, structures)

    assignTasks(requests, roomCreeps)


}

// to be renamed/replace getRequests
function getRequests(room, structures) {
    // pull requests from memory
    if (!room.memory) {//If this room has no sources memory yet
        room.memory = { requests: [] }
    }
    if (!room.memory.requests) {
        room.memory.requests = []
    }

    let requests = getExistingRequests(room)


    // generate new requests. For each, check to see if the 
    // request exists and update it as needed

    // 1. restock requests

    requests = generateRestockRequests(room, requests, structures)

    // 2. transport requests 
    // energy
    // lab
    // trade

    // 3. build requests

    // 4. repair requests

    // 5. long distance harvest requests

    // controller tasks get generated on demand 
    // if a creep cannot find any requests (or role is upgrader)
    // in a later function, not here.

    // mining tasks get generated on demand, 
    // similar to controller but for class miner

    // store requests in memory
    room.memory.requests = requests

    return requests
}




/**
 * Checks for new restock requests and returns array of all restock requests.
 * @param {Room} room Room object.
 * @param {TaskRequest[]} requests Array of TaskRequest objects.
 * @param {Structure[]} structures Array of Structure objects.
 * @returns {TaskRequest[]} Updated array of TaskRequest objects.
 */
function generateRestockRequests(room, requests, structures) {
    let resource = RESOURCE_ENERGY

    // create a hash map to store existing restock requests keyed by target structure ID
    let restockRequests = {}
    requests.forEach(r => {
        if (r.home == room.name && r.taskType == 'restock') {
            restockRequests[r.targetId] = r
        }
    })


    let validStructures = structures.filter(s => (s.structureType == STRUCTURE_SPAWN
        || s.structureType == STRUCTURE_EXTENSION
        || s.structureType == STRUCTURE_TOWER) && s.store.resource < s.store.capacity)

    for (let s of validStructures) {
        let priority = s.structureType == STRUCTURE_TOWER ? 2 : 1;
        if (restockRequests[s.id]) {
            // if we need more than 500 energy assigned, set priority 1
            if (s.structureType == STRUCTURE_TOWER) {
                if (restockRequests[s.id].qtyRequired > 500) {
                    restockRequests[s.id].priority = 1;
                } else {
                    restockRequests[s.id].priority = 2;
                }
            }
        } else {
            requests.push(new restockRequest(room.name, s, priority));
        }
    }

    return requests
}

function getExistingRequests(room) {
    let requests = room.memory.requests

    requests.forEach(r => {
        r.updateStatus
    })

    // splice out complete requests
    for (let i = requests.length - 1; i >= 0; i--) {
        if (requests[i].status == 'COMPLETE') {
            requests.splice(i, 1)
        }
    }


    return requests
}

/**
 * Delegates best tasks to each unassigned creeps
 * @param {TaskRequest[]} requests 
 * @param {creep[]} roomCreeps 
 */
function assignTasks(requests, roomCreeps) {

    let unassignedCreeps = creeps.filter(c => c.memory.assigned == false)
    unassignedCreeps.forEach(c => {
        // assign best valid task from requests
        let validTasks = requests.filter(r => r.validateAssignment(c))
        if (validTasks.length > 0) {
            let [request, refill] = getBestTask(c, validTasks)

            request.assign(c, refill)
        }

        // check for any pre-requisites

        // assign pre-requisite

        // assign follow-up tasks in chain for any left over resource



    })

}
/**
 * 
 * @param {Creep} creep 
 * @param {TaskRequest[]} validTasks
 * @param {Structure[]} structures
 * @returns {[TaskRequest,boolean]}
 */
function getBestTask(creep, validTasks, structures) {
    let best = undefined
    let bestDistance = Infinity
    let refill = false

    let sources = structures.filter(s => s.structureType == STRUCTURE_CONTAINER
        || s.structureType == STRUCTURE_STORAGE && s.store[r.resource] > creep.store.capacity)
    if (r.resource == RESOURCE_ENERGY && sources.length > 0 && creep.memory.role != 'transporter') {
        sources = room.find(FIND_SOURCES)
    }

    for (let r of validTasks) {
        let _refill = false
        let minDistanceToSource = Infinity
        let bestSource;
        let distance = creep.pos.getRangeTo(t.structure)
        let qtyReq = Math.min(creep.store.capacity, r.qtyRequired)

        // get distance to each task
        let sources = structures.filter(s => s.structureType == STRUCTURE_CONTAINER
            || s.structureType == STRUCTURE_STORAGE && s.store[r.resource] > creep.store.capacity)
        if (r.resource == RESOURCE_ENERGY && sources.length > 0 && creep.memory.role != 'transporter') {
            sources = room.find(FIND_SOURCES)
        }
        // if we have some resource in stock,
        // see if it is closer to the target or closer to a source
        if (creep.store[t.resource] == 0) {
            _refill = true


            let sources = structures.filter(s => (s.structureType == STRUCTURE_CONTAINER
                || s.structureType == STRUCTURE_STORAGE)
                && s.store[t.resource] > qtyReq)
            if (sources.length > 0 && creep.memory.role != 'transporter') {
                sources = room.find(FIND_SOURCES)
            }
            for (let s of sources) {
                let distanceToSource = creep.pos.getRangeTo(s)
                if (distanceToSource < minDistance) {
                    minDistance = distanceToSource
                    bestSource = s
                }
            }

        } else if (creep.store.getFreeCapacity() > 0 && creep.store[t.resource] > 0 && creep.store[t.resource] < qtyReq) {


            let sources = structures.filter(s => (s.structureType == STRUCTURE_CONTAINER
                || s.structureType == STRUCTURE_STORAGE)
                && s.store[t.resource] > qtyReq)
            if (sources.length > 0 && creep.memory.role != 'transporter') {
                sources = room.find(FIND_SOURCES)
            }
            for (let s of sources) {
                let distanceToSource = creep.pos.getRangeTo(s)
                if (distanceToSource < minDistance) {
                    minDistance = distanceToSource
                    bestSource = s
                }
            }
            if (distance > minDistance) {
                _refill = true
            }
        }

        if (distance < bestDistance) {
            bestDistance = distance
            best = t
            refill = _refill
        }
    }

    return [best, refill]

}



/**
 * Returns the assigned tasks held in spawn memory.
 * @param {StructureSpawn} spawn The spawn holding the assigned tasks.
 * @returns {TaskAction[]} Array of assigned tasks objects.
 */
function getAssignedTasks(spawn) {
    let at = spawn.memory.assignedTasks
    if (!at || at.length == 0) {
        return []
    }
    let assigned = clearAssignedTasks(spawn)
    return assigned
}

/* 
   Clear completed tasks:
   1. for each assigned task, check creeps queue and see if the task is found
   2. if the task is not found, add index for splicing
   3. splice each index
   4. return the spliced array
   */

/**
 * Clears completed assigned tasks
 * @param {StructureSpawn} spawn The spawn holding the assigned tasks.
 * @returns 
 */
function clearAssignedTasks(spawn) {
    let assignedTasks = spawn.memory.assignedTasks
    let arr = []
    for (let i = 0; i < assignedTasks.length; i++) {
        let t = assignedTasks[i]
        let creep = Game.getObjectById(t.creepId)
        if (creep == null) {
            arr.push(i)
            continue
        }
        let found = findAssignedTask(t, creep)
        if (!found) {
            arr.push(i)
        }
    }
    //splice from assignedTasks
    arr.sort((a, b) => (b - a))
    arr.forEach(i => {
        assignedTasks.splice(i, 1)
    })
    return assignedTasks
}

/**
 * 
 * @param {TaskAction} task The task to search for.
 * @param {Creep} creep The creep expected to have task.
 * @returns {boolean} If the task is found in creeps assigned tasks
 */
function findAssignedTask(task, creep) {
    let found = false
    let queue = creep.memory.taskQueue
    if (queue && queue.length > 0) {
        queue.forEach(t => {
            if (task.id == t.id && task.taskType == t.taskType) {

                found = true
            }
        })
    }
    return found
}

/**
 * Gets all available requests for unassigned creep roles.
 * 
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @param {Creep[]} creeps Creeps with empty task queue.
 * @param {Structure[]} structures All structures in room.
 * @returns {TaskRequest[]} Array of available task request objects.
 */
function getRequestsOld(assignedTasks, creeps, structures, room) {
    let roles = []
    let requests = []
    let requestTypes = []
    creeps.forEach(c => {
        let role = c.memory.role
        if (!roles.includes(role)) {
            roles.push(role)
        }
    })
    roles.forEach(r => {

        switch (r) {
            case 'worker':
                if (!requestTypes.includes('restock'))
                    requestTypes.push('restock')
                if (!requestTypes.includes('build'))
                    requestTypes.push('build')
                break

            case 'builder':
                if (!requestTypes.includes('restock'))
                    requestTypes.push('restock')
                if (!requestTypes.includes('build'))
                    requestTypes.push('build')
                if (!requestTypes.includes('repair'))
                    requestTypes.push('repair')
                break
            case 'miner':
                if (!requestTypes.includes('mine'))
                    requestTypes.push('mine')
                break
            case 'transporter':
                if (!requestTypes.includes('transport'))
                    requestTypes.push('transport')
                break
        }
    })

    requestTypes.forEach(r => {
        let req = undefined
        switch (r) {
            case 'restock':
                req = getRestockRequests(structures, assignedTasks)
                break
            case 'build':
                req = getBuildRequests(room, assignedTasks)
                break
            case 'repair':
                //req = getRepairRequests(structures,assignedTasks)
                break
            case 'mine':
                req = getMineRequests(room, assignedTasks, structures)
                break
            case 'transport':
                req = getTransportRequests(room, assignedTasks, structures)
                break
        }
        if (req) {
            req.forEach(r => requests.push(r))
        }
    })

    return requests
}

function getTransportRequests(room, assignedTasks, structures) {
    let tasks = []
    let task;
    let qty;

    let controllerContainer = room.find(FIND_STRUCTURES).filter(c => {
        if (c.structureType != STRUCTURE_CONTAINER) {
            return false
        }
        if (room.controller.pos.inRangeTo(c, 4)) {
            return true
        }
    })[0]

    if (controllerContainer != undefined) {
        qty = controllerContainer.store.getFreeCapacity()
        task = new TaskRequest(controllerContainer.id, 'transport', controllerContainer.structureType, RESOURCE_ENERGY, qty, 1)
        tasks.push(task)
    }

    if (tasks.length == 0) {
        task = new TaskRequest(undefined, 'park', 'plain', undefined, 0, 5)
        tasks.push(task)
        return tasks
    }
    let sources = []
    let containers = structures.filter(s => s.structureType == STRUCTURE_CONTAINER && s.id != controllerContainer.id)

    containers.forEach(c => {
        sources.push(c)
    })

    // marry each deliver task to pickup task
    tasks.forEach(d => {
        let resource = d.resource
        let source = _.max(sources.filter(s => s.store.getUsedCapacity(resource) > 0), s => { return getResourceQty(s, resource, assignedTasks) })
        if (source != undefined) {
            d.sourceId = source.id
        }
    })
    return tasks

}

/**
 * 
 * @param {Room} room Room object.
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @param {Structure[]} structures All structures in room. 
 * @returns {TaskRequest[]} Array of unassigned restock taskRequest objects.
 */
function getMineRequests(room, assignedTasks, structures) {
    tasks = []
    let resource = RESOURCE_ENERGY
    let sources = room.find(FIND_SOURCES)
    let containers = structures.filter(s => s.structureType == STRUCTURE_CONTAINER)

    sources.forEach(s => {
        let push = true
        assignedTasks.forEach(t => {
            if (s.id == t.id && t.taskType == 'mine') {
                push = false
            }
        })
        if (push) {
            containers.forEach(c => {
                if (c.pos.isNearTo(s)) {
                    // create mine request
                    tasks.push(new TaskRequest(s.id, 'mine', 'source', resource, Infinity, 1))
                }
            })
        }
    })
    return tasks
}

function getBuildRequests(room, assignedTasks) {
    let tasks = []
    let resource = RESOURCE_ENERGY

    let sites = room.find(FIND_CONSTRUCTION_SITES)//.filter(s => {getBuildQty(s, assignedTasks) > 0})
    sites.forEach(s => {


        let qty = getBuildQty(s, assignedTasks)
        tasks.push(new TaskRequest(s.id, 'build', s.structureType, resource, qty, 3))


    })
    return tasks
}

/**
 * Forecasts the future build progress required
 * @param {ConstructionSite} site 
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.{*} assignedTasks 
 * @returns {number}
 */
function getBuildQty(site, assignedTasks) {
    let qty = site.progressTotal - site.progress
    let tasks = assignedTasks.filter(t => t.id == site.id)
    tasks.forEach(t => qty -= t.qty)
    return qty
}

/**
 * Finds all unassigned restock task requests for room structures.
 * 
 * @param {Structure} structures All structures in room.
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @returns {TaskRequest[]} Array of unassigned restock taskRequest objects.
 */
function getRestockRequests(structures, assignedTasks) {
    let tasks = []
    let resource = RESOURCE_ENERGY
    structures.filter(s => (s.structureType == STRUCTURE_SPAWN
        || s.structureType == STRUCTURE_EXTENSION)
        && s.store.getFreeCapacity(resource) > 0
        && getResourceQty(s, resource, assignedTasks) < s.store.getCapacity(resource)
        || (s.structureType == STRUCTURE_TOWER
            && s.store.getFreeCapacity(resource) > .5 * s.store.getCapacity(resource)
            && getResourceQty(s, resource, assignedTasks) < .5 * s.store.getCapacity(resource))
    ).forEach(s => {
        let qty = s.store.getCapacity(resource) - getResourceQty(s, resource, assignedTasks)
        tasks.push(new TaskRequest(s.id, 'restock', s.structureType, resource, qty, 1))
    })

    structures.filter(s => s.structureType == STRUCTURE_TOWER
        && s.store.getFreeCapacity(resource) > 0
        && s.store.getUsedCapacity(resource) > 500
        && getResourceQty(s, resource, assignedTasks) < s.store.getCapacity(resource) - 50).forEach(s => {
            let qty = s.store.getCapacity(resource) - getResourceQty(s, resource, assignedTasks)
            tasks.push(new TaskRequest(s.id, 'restock', s.structureType, resource, qty, 2))
        })
    console.log(JSON.stringify(tasks))
    return tasks
}

/**
 * Forecasts resource quantity after assigned tasks are completed.
 * 
 * @param {Structure} obj Object with store.
 * @param {ResourceConstant} resource Type of resource to quantify.
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects. 
 * @returns {number} The forecasted quantity of resources.
 */
function getResourceQty(obj, resource, assignedTasks) {
    let qty = obj.store.getUsedCapacity(resource)
    if (assignedTasks != undefined && assignedTasks.length > 0) {
        assignedTasks.filter(t => t.id == obj.id && t.resource == obj.resource).forEach(t => {
            qty += t.qty
        })
    }
    return qty
}

/**
 * Assigns tasks for each available creep.
 * @param {Creep[]} creeps Creeps with empty task queue.
 * @param {TaskRequest[]} requests Array of available task request objects.
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @returns {TaskAction[]} Updated assigned tasks array.
 */
function assignTasksOld(creeps, requests, assignedTasks) {
    let req = requests


    creeps.forEach(c => {
        let role = c.memory.role
        let newTasks = undefined
        switch (role) {
            case 'worker':
                newTasks = assignCreepTasks(c, req.filter(r => r.taskType == 'restock' || r.taskType == 'build' || r.taskType == 'repair'), assignedTasks)
                break

            case 'upgrader':

                newTasks = assignCreepTasks(c, [])
                break
            case 'builder':
                let builderTasks = req.filter(r => r.taskType == 'restock' || r.taskType == 'build' || r.taskType == 'repair')
                builderTasks.forEach(t => {
                    if (t.taskType == 'restock') {
                        t.priority = 3
                    } else if (t.taskType == 'build') {
                        t.priority = 1
                    } else if (t.taskType == 'repair') {
                        t.priority = 2
                    }
                })
                newTasks = assignCreepTasks(c, builderTasks)
                break
            case 'miner':
                newTasks = assignCreepMineTask(c, req.filter(r => r.taskType == 'mine'))
                break
            case 'transporter':
                newTasks = assignTransportTasks(c, req.filter(r => r.taskType == 'transport'))
                break
        }

        // remove assigned tasks from requests
        if (newTasks != undefined) {

            newTasks.forEach(t => {
                req.splice(req.findIndex(r => { r.id == t.id && r.taskType == t.taskType }), 1)
                assignedTasks.push(t)
                c.memory.task = newTasks[0].taskType
                c.memory.target = newTasks[0].id
                newTasks[0].status = 'UNDERWAY'
                c.memory.taskQueue = newTasks
            })
        }
    })
    return assignedTasks
}

function assignTransportTasks(creep, requests) {
    let task;

    if (requests[0] == undefined || requests[0].taskType == 'park') {
        // find closest plain position
        let x = creep.pos.x
        let y = creep.pos.y
        for (let range = 0; range < 10; range++) {
            for (let i = -range; i <= range; i++) {
                for (let j = -range; j <= range; j++) {
                    let checkX = x + i
                    let checkY = x + j
                    let structures = creep.room.lookForAt(LOOK_STRUCTURES, checkX, checkY)

                    if (structures == undefined || structures.length == 0) {
                        let terrain = creep.room.lookForAt(LOOK_TERRAIN, checkX, checkY)
                        if (terrain.terrain == 'plain') {
                            task = new TaskAction(creep.id, undefined, move, 'move', undefined, undefined)
                            task.x = checkX
                            task.y = checkY

                            return [task]
                        }
                    }
                }
            }
        }
        // create move task to position
        return
    }
    let tasks = []
    let request = requests[0]
    // create pickup task
    let qty = Math.min(creep.store.getFreeCapacity(), request.qty)
    task = new TaskAction(creep.id, request.sourceId, 'withdraw', 'structure', request.resource, qty)
    tasks.push(task)
    // create dropoff task
    task = new TaskAction(creep.id, request.id, 'restock', request.targetType, request.resource, qty)
    tasks.push(task)
    return tasks
}

/**
 * Assigns a mining task to a creep.
 * @param {Creep} creep 
 * @param {TaskRequest[]} requests Array of available task request objects. 
 * @returns {TaskAction[]} Assigned tasks array for creep.
 */
function assignCreepMineTask(creep, requests) {
    let creepTasks = []
    let request = requests[0]
    let task = new TaskAction(creep.id, request.id, request.taskType, request.targetType, request.resource, Infinity)
    creepTasks.push(task)
    return creepTasks
}

/**
 * Assigns indivudial tasks to creep task queue, using up to capacity.
 * @param {Creep} creep Creep we are assigning tasks to.
 * @param {TaskRequest[]} requests Array of available task request objects.
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @returns {TaskAction[]} Assigned tasks array for creep.
 */
function assignCreepTasks(creep, requests, assignedTasks) {
    let center = new RoomPosition(25, 25, creep.room.name)
    let capacity;
    let energyOnly = false
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        capacity = creep.store.getUsedCapacity(RESOURCE_ENERGY)
        energyOnly = true
    } else {
        capacity = creep.store.getCapacity()
    }
    let creepTasks = []
    if (requests != undefined) {
        for (let i = 1; i <= 5; i++) {
            let objArr = []
            let reqArr = []
            let request;
            if (energyOnly) {
                requests.filter(r => r.priority == i && r.resource == RESOURCE_ENERGY).forEach(r => {
                    objArr.push(Game.getObjectById(r.id))
                    reqArr.push(r)
                })
            } else {
                requests.filter(r => r.priority == i).forEach(r => {
                    objArr.push(Game.getObjectById(r.id))
                    reqArr.push(r)
                })
            }

            while (capacity > 0 && reqArr.length > 0) {

                let closest;

                if (creepTasks.length == 0) {
                    closest = center.findClosestByPath(objArr)
                } else {
                    closest = Game.getObjectById(creepTasks[creepTasks.length - 1].id).pos.findClosestByPath(objArr)
                }


                let idx = reqArr.findIndex(r => r.id == closest.id)


                request = reqArr[idx]

                reqArr.splice(idx, 1)
                objArr.splice(idx, 1)


                let qty = Math.min(request.qty, capacity)
                capacity -= qty
                let task = new TaskAction(creep.id, request.id, request.taskType, request.targetType, request.resource, qty)
                creepTasks.push(task)
            }

            if (capacity <= 0) {
                break
            }

        }
    }

    // generic assign controller task
    if (capacity > 0 && creep.memory.role != 'transport' && creep.memory.role != 'miner') {
        creepTasks.push(new TaskAction(creep.id, creep.room.controller.id, 'controller', STRUCTURE_CONTROLLER, RESOURCE_ENERGY, capacity))
    }
    // get required resources
    let preReqs = []

    creepTasks.forEach(t => {

        let preReq = preReqs.find(p => p.resource == t.resource)
        // if we dont have a prereq with t.resource, create new PreReq and place in array
        if (preReq == undefined) {
            preReqs.push(new PreReq(t.resource, t.qty))
            // otherwise adjust quantity
        } else {
            preReq.qty += t.qty
        }
    })

    preReqs.forEach(p => {
        if (creep.store.getUsedCapacity(p.resource) < p.qty) {
            // create new task to fill the difference
            let qty = p.qty - creep.store.getUsedCapacity(p.resource)
            creepTasks.unshift(gatherResource(creep, assignedTasks, p.resource, qty))
        }
    })

    creep.memory.taskQueue = creepTasks
    return creepTasks
}

class PreReq {
    /**
     * Prerequisite object
     * 
     * @param {ResourceConstant} resource
     * @param {number} qty Resource quantity.
     */
    constructor(resource, qty) {
        this.resource = resource
        this.qty = qty
    }
}

/**
 * Creates and returns task for a creep to gather the required resource.
 * @param {Creep} creep 
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @param {ResourceConstant} resource Type of resource.
 * @param {number} qty Quantity of resource. 
 * @returns {taskAction} Task to gather required resource.
 */
function gatherResource(creep, assignedTasks, resource, qty) {
    let task;
    // check containers and storages for resource qty needed after assigned tasks
    let resourceStructures = creep.room.find(FIND_STRUCTURES).filter(s => (s.structureType == STRUCTURE_CONTAINER
        || s.structureType == STRUCTURE_STORAGE)
        && getResourceQty(s, resource, assignedTasks) >= qty)

    if (resourceStructures && resourceStructures.length > 0) {
        // task to restock from structure ( qty is negative )
        target = creep.pos.findClosestByPath(resourceStructures)
        task = new TaskAction(creep.id, target.id, 'withdraw', target.structureType, resource, -qty)
        return task

    }
    if (!task && resource == RESOURCE_ENERGY) {
        let sources = creep.room.find(FIND_SOURCES)
        let target = _.max(sources, s => { return getSourceQty(s, assignedTasks) })
        task = new TaskAction(creep.id, target.id, 'harvest', 'source', resource, -qty)
        return task
    }


}

/**
 * Forecasts source quantity after assigned tasks are completed.
 * @param {Source} source Source object
 * @param {TaskAction[]} assignedTasks Array of assigned TaskAction objects.
 * @returns {number} Forecasted source quantity
 */
function getSourceQty(source, assignedTasks) {
    let qty = source.energy
    if (assignedTasks) {
        assignedTasks.filter(t => t.id == source.id).forEach(t => {
            qty += t.qty
        })
    }
    return qty
}

module.exports = taskManager;