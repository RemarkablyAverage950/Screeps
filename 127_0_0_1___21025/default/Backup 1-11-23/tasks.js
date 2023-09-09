const { indexOf, findIndex } = require("lodash")

class Request {
    constructor(id) {
        this.id = id
        this.status = ['PENDING', 'INPROGRESS', 'COMPLETE']
        this.assignedCreeps = []
    }

}

class TransportRequest extends Request {
    constructor(id, resource, qty) {
        super(id)

        this.resource = resource
        this.quantity = qty

        this.taskType = 'transport'
        this.roles = ['transporter']
        this.sourceRequest = false
        this.priority = 1
    }
}

class BuildRequest extends Request {
    constructor(id) {
        super(id)
        this.taskType = 'build'
        this.sourceRequest = false
        this.resource = RESOURCE_ENERGY
        this.roles = ['worker']
        this.priority = 3
    }

}


class WithDrawRequest extends Request {
    constructor(id) {
        super(id)
        this.taskType = 'withdraw'
        this.store = undefined
        this.resource = RESOURCE_ENERGY
        this.forecast = []
        this.roles = ['worker', 'miner', 'upgrader']
        this.sourceRequest = true
        this.priority = 4
    }
}

class SourceRequest extends Request {
    constructor(id) {
        super(id)


        this.taskType = 'mine'
        this.roles = ['worker', 'miner', 'upgrader']
        this.sourceRequest = true
        this.resource = RESOURCE_ENERGY
        this.maxCreeps = this.getMaxCreeps
        this.priority = 5
        this.qty = undefined
    }


    get getMaxCreeps() {
        let source = Game.getObjectById(this.id);
        let emptyTiles = 0;
        for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
            for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
                let terrainAtCoords = source.room.lookForAt('terrain', x, y);
                if (terrainAtCoords != 'wall')
                    emptyTiles += 1
            }
        }
        return emptyTiles
    }
}

class RefillRequest extends Request {
    constructor(id, priority) {
        super(id)
        this.taskType = 'refill'
        this.roles = ['worker']
        this.sourceRequest = false
        this.resource = RESOURCE_ENERGY
        this.priority = priority
        this.quantity = Game.getObjectById(this.id).store.getFreeCapacity(this.resource)
        //this.forecast = this.quantity
    }


}

class ControllerRequest extends Request {
    constructor(id) {
        super(id)
        this.taskType = 'upgradeController'
        this.roles = ['worker', 'upgrader']
        this.sourceRequest = false
        this.priority = 5
    }
}

/**
 * Creates, removes, requests. Delegates requests and tasks to creeps
 * @param {Room} room The room to manage tasks from.
 * @param {Creep[]} creeps Creeps belonging to the room.
 */
function taskManager(room, creeps) {
    //for clearing out requests queue
    //room.memory.requests = []
    sandBox(room, creeps, 'A')
    manageState(creeps)
    // sandBox(room, creeps, 'B')
    updateRequestStatus(room)
    //sandBox(room, creeps, 'C')
    // get tasks for a room
    generateRequests(room)
    //sandBox(room, creeps, 'D')
    // assignTasks to best creep
    assignTasks(room, creeps)
    //sandBox(room, creeps, 'E')

}

function sandBox(room, creeps, flag) {
    //room.memory.requests = []
    //console.log(creeps.filter(c=> c.memory.needTask == true).length)
    //console.log(flag,JSON.stringify(room.memory.requests))
}
function updateRequestStatus(room) {
    if (!room.memory) {
        room.memory = {};
    }
    if (!room.memory.requests) {
        room.memory.requests = [];
    }

    let requests = room.memory.requests;
    for (let request of requests) {
        let assignedCreeps = request.assignedCreeps
        for (let i = assignedCreeps.length - 1; i >= 0; i--) {
            let creepName = assignedCreeps[i]
            let creep = Game.creeps[creepName]
            if (creep == undefined) {
                assignedCreeps.splice(i, 1)
            } else if (creep.memory.preReq != undefined && (creep.memory.preReq.target != request.id && creep.memory.target != request.id) || (creep.memory.preReq == undefined && creep.memory.target != request.id)) {
                assignedCreeps.splice(i, 1)
            }
        }
        request.assignedCreeps = assignedCreeps
        if (request.forecast) {
            let forecasts = request.forecast
            for (let i = forecasts.length - 1; i >= 0; i--) {
                let forecast = forecasts[i]
                if (!assignedCreeps.includes(forecast.creep)) {
                    forecasts.splice(i, 1)
                }
            }
            request.forecast = forecasts
        }
    }
    room.memory.requests = requests;
}

function manageState(creeps) {

    for (let creep of creeps) {
        if (creep.memory.role == 'transporter') continue;
        if (creep.memory.refill === false && creep.store.getUsedCapacity() === 0) {
            creep.memory.refill = true
            creep.memory.target = undefined
            creep.memory.task = undefined
            creep.memory.needTask = true
            creep.memory.clearPath = true
        } else if (creep.memory.refill === true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
            creep.memory.target = undefined
            creep.memory.task = undefined
            creep.memory.needTask = true
            creep.memory.clearPath = true
        }
    }
}

function assignTransportTask(creep, requests) {
    let transportRequests = requests.filter(r => r.taskType == 'transport' && r.quantity >= creep.store.getCapacity())
    if (transportRequests.length == 0) {
        return requests
    }
    let request = _.min(transportRequests, r => {
        return r.quantity
    })
    if (creep.store[request.resource] == 0) {
        let sourceRequest = _.max(requests.filter(r => r.taskType == 'withdraw' && creep.room.controller.pos.getRangeTo(Game.getObjectById(r.id).pos) > 3 && Game.getObjectById(r.id).structureType != STRUCTURE_STORAGE), r => r.store[request.resource])

        let qty = (-1) * creep.store.getFreeCapacity()
        sourceRequest.store[request.resource] += qty
        let withdrawl = {
            creep: creep.name,
            resource: request.resource,
            qty: qty
        }
        sourceRequest.assignedCreeps.push(creep.name)
        sourceRequest.forecast.push(withdrawl)
        sourceRequest.store[request.resource] += qty

        creep.memory.preReq.target = sourceRequest.id
        creep.memory.preReq.task = 'withdraw'
    }
    creep.memory.task = 'transfer'
    creep.memory.target = request.id
    creep.memory.needTask = false
    request.assignedCreeps.push(creep.name)
    request.status = 'INPROGRESS'
    return requests
}

function assignMinerTask(creep, requests) {
    let minerRequests = requests.filter(r => r.taskType == 'mine' && !r.assignedCreeps.some(c => Game.creeps[c].memory.role == 'miner'));
    let containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    minerRequests.forEach(r => {
        let source = Game.getObjectById(r.id)
        // check for a container near the source
        let container;
        containers.forEach(c => {
            if (source.pos.isNearTo(c)) {
                container = c
                return
            }
        })
        // If a source has a container, assign the creep to it
        if (container) {
            try {
                creep.memory.preReq.target = container.id
                creep.memory.preReq.task = 'move'
                creep.memory.moving = true
            } catch (e) { 'failed to assign preReq' }
            creep.memory.target = r.id;
            creep.memory.task = 'mine';
            creep.memory.needTask = false
            r.assignedCreeps.push(creep.name);
            r.status = 'INPROGRESS';
            return
        }
    });

    return requests

}

function assignTasks(room, creeps) {
    let requests = room.memory.requests
    let taskNeedingCreeps = creeps.filter(c => c.memory.needTask == true)
    for (let creep of taskNeedingCreeps) {
        if (creep.memory.role === 'miner') {
            requests = assignMinerTask(creep, requests)
            continue
        } else if (creep.memory.role == 'transporter') {
            requests = assignTransportTask(creep, requests)
            continue
        }
        let availableTasks;
        if (creep.memory.refill == true) {
            // assign a source task
            availableTasks = requests.filter(r => r.sourceRequest == true
                && (r.taskType == 'mine'
                    && r.maxCreeps > r.assignedCreeps.length)
                || (r.taskType == 'withdraw' && r.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity()))
        } else {
            //assign a non-source
            availableTasks = requests.filter(r => r.sourceRequest == false && r.roles.includes(creep.memory.role))
        }
        if (availableTasks.length == 0) {
            continue
        }
        let priority = _.min(availableTasks, t => t.priority).priority;
        // Filter the available tasks to only include tasks with the current priority and that the creep can find a path to
        availableTasks = availableTasks.filter(t => t.priority == priority);
        let target = creep.pos.findClosestByPath(availableTasks.filter(t => (t.taskType === 'withdraw'
            && t.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity())
            || (t.taskType === 'source' && t.qty > creep.store.getFreeCapacity())
            || true)
            .map(request => Game.getObjectById(request.id)));
        if (target == null) {
            return
        }
        let task = availableTasks.find(t => t.id == target.id)
        if (task) {
            if (task.taskType == 'withdraw') {
                let resource = task.resource
                let qty = (-1) * creep.store.getFreeCapacity()
                task.store[resource] += qty
                let withdrawl = {
                    creep: creep.name,
                    resource: resource,
                    qty: qty
                }
                task.forecast.push(withdrawl)
                task.store[resource] += qty
            }
            creep.memory.moving = true
            creep.memory.target = task.id;
            creep.memory.task = task.taskType;
            creep.memory.needTask = false
            task.assignedCreeps.push(creep.name);
            task.status = 'INPROGRESS';
        } else {
            creep.memory.moving = false
        }
    }
    room.memory.requests = requests
}

function generateRequests(room) {
    let structures = room.find(FIND_STRUCTURES)
    sourceRequests(room)
    withdrawRequests(room, structures)
    refillRequests(room, structures)
    buildRequests(room, structures)
    controllerRequest(room)
    transportRequest(room)
    if (room.memory.requests.length > 100) {
        console.log('requests length > 100, clearing requests for ' + room.name)
        room.memory.requests = []
    }
}

function transportRequest(room) {
    let requests = room.memory.requests

    let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    // Find the controller container for the room.

    let controllerContainer = containers.filter((structure) => {
        return (
            structure.structureType == STRUCTURE_CONTAINER &&
            structure.pos.inRangeTo(room.controller, 3)
        );
    })[0]
    if (!controllerContainer || controllerContainer.length === 0) {
        return
    }

    let storage = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)[0]
    let destinations = [controllerContainer]
    if(storage)
    destinations.push(storage)

    // Splice out controller container from containers.
    containers.splice(containers.findIndex(c => c.id == controllerContainer.id), 1)
    for (let destination of destinations) {

        // is the controller container full
        let full = destination.store.getFreeCapacity() === 0 ? true : false;

        if (full) {
            // check for existing transport request in memory and remove it
            let index = requests.findIndex(request => request.taskType === 'transport' && request.id === destination.id);
            if (index !== -1) {
                requests.splice(index, 1);
            }
        } else {

            let request = requests.find(request => request.taskType === 'transport' && request.id === destination.id);

            if (request) {
                // update request.qty with the quantity needed
                request.quantity = Math.min(500000 - destination.store.getUsedCapacity(), destination.store.getFreeCapacity());
            } else {
                // create a new transport request

                let newRequest = new TransportRequest(destination.id, RESOURCE_ENERGY, Math.min(500000 - destination.store.getUsedCapacity(), destination.store.getFreeCapacity()));
                requests.push(newRequest);
            }
        }
    }
    room.memory.requests = requests
}


function withdrawRequests(room, structures) {

    // Clear container requests for containers that no longer exist in the game.

    // Get a list of containers that there is not a request for and create a new request for each.

    // Push each new request into requests.

    // Update each container request's store with the container.store object.
    let requests = room.memory.requests;
    let withdrawRequests = requests.filter(r => r.taskType === 'withdraw');

    let newContainers = structures.filter(s => (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && !withdrawRequests.find(r => r.id === s.id));

    let completedContainers = withdrawRequests.filter(r => {

        let container = structures.find(s => s.id === r.id);
        if (!container) {

            return true;
        }

        return false;
    });
    // splice out any requests for containers that no longer exist
    requests = requests.filter(r => completedContainers.indexOf(r) === -1);

    // create a WithDrawRequest for each new container
    newContainers.forEach(c => {
        requests.push(new WithDrawRequest(c.id))
        requests[requests.length - 1].store = c.store
    });
    // update the store property for each WithDrawRequest with the container's store object
    withdrawRequests.forEach(r => {

        let containerStore = structures.find(s => s.id === r.id).store;
        r.forecast.forEach(f => {
            containerStore[f.resource] += f.qty
        })
        r.store = containerStore;

    });

    room.memory.requests = requests;

}

function buildRequests(room, structures) {
    let requests = room.memory.requests;
    let buildRequests = requests.filter(r => r.taskType === 'build')
    let completedSites = []
 
    buildRequests.forEach(r => {
        if (Game.getObjectById(r.id) === null) {
            completedSites.push(r)
        } 
    })
    // splice out any completed build requests
    requests = requests.filter(r => completedSites.indexOf(r) === -1);

    let newConstructionSites = room.find(FIND_CONSTRUCTION_SITES).filter(s => !requests.find(r => r.id === s.id));

    // create a BuildRequest for each new construction site
    newConstructionSites.forEach(s => {
        requests.push(new BuildRequest(s.id))
    });
    room.memory.requests = requests;
}

function controllerRequest(room) {
    let requests = room.memory.requests
    let controller = room.controller
    // check to see if a request exists for the controller
    let existingRequest = requests.find(r => r.id === controller.id);
    if (!existingRequest) {
        // if not, create a request
        requests.push(new ControllerRequest(controller.id));
    }
    room.memory.requests = requests;
}


/**
 * Updates room's source requests for harvesting
 * @param {Room} room The room to manage tasks from.
 */
function sourceRequests(room) {
    let requests = room.memory.requests
    // Find all the sources in the room
    let sources = room.find(FIND_SOURCES);
    // Filter out sources that already have a task
    sources = sources.filter(s => !requests.find(r => r.id === s.id));
    // Add a task for each remaining source
    for (let source of sources) {
        let request = new SourceRequest(source.id);
        requests.push(request);
    }

    // Store the tasks in memory
    room.memory.requests = requests;
}

function refillRequests(room, structures) {
    let requests = room.memory.requests;
    let fullCapacityRequests = requests.filter(r => {
        let structure = Game.getObjectById(r.id)
        return r.taskType == 'refill' &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) == 0
    });
    fullCapacityRequests.forEach(r => {
        let index = requests.findIndex(request => request.id === r.id);
        requests.splice(index, 1);
    });
    // Find all structures that need refilling
    let refillStructures = structures.filter(s =>
        (((s.structureType === STRUCTURE_SPAWN
            || s.structureType === STRUCTURE_EXTENSION)
            && s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            || (s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] < 950))
        && !requests.find(r => r.id === s.id));
    // Create refill requests for those structures with priority 1
    let refillRequests = refillStructures.map((s) => {
        let priority = 1
        if (s.structureType == STRUCTURE_TOWER) {
            priority = 2
        }
        return new RefillRequest(s.id, priority)
    });
    requests = requests.concat(refillRequests);
    room.memory.requests = requests;
}

module.exports = taskManager