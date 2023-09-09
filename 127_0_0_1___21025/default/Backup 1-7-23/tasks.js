const { indexOf, findIndex } = require("lodash")

class Request {
    constructor(id) {
        this.id = id
        this.status = ['PENDING', 'INPROGRESS', 'COMPLETE']
        this.assignedCreeps = []
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
        this.priority = priority
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
    manageState(creeps)
    updateRequestStatus(room)

    // get tasks for a room
    generateRequests(room)
    // assignTasks to best creep
    assignTasks(room, creeps)
    sandBox(room, creeps)
}

function sandBox(room, creeps) {

}

function updateRequestStatus(room) {
    let requests = room.memory.requests;

    requests.forEach(request => {
        // Remove any assigned creeps that no longer have this request as their target
        request.assignedCreeps = request.assignedCreeps.filter(creepName => {
            let creep = Game.creeps[creepName];
            return creep && creep.memory.target === request.id;
        });
        if (request.assignedCreeps.length === 0) {
            request.status = 'PENDING';
        }
    });
    room.memory.requests = requests;
}

function manageState(creeps) {

    for (let creep of creeps) {
        if (creep.memory.refill === false && creep.store.getUsedCapacity() === 0) {
            creep.memory.refill = true
            creep.memory.target = undefined
            creep.memory.task = undefined
            creep.memory.needTask = true
        } else if (creep.memory.refill === true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
            creep.memory.target = undefined
            creep.memory.task = undefined
            creep.memory.needTask = true
        }
    }
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
            } catch (e) { 'failed to assign preReq' }
            creep.memory.target = r.id;
            creep.memory.task = 'mine';
            creep.memory.needTask = false
            r.assignedCreeps.push(creep.name);
            r.status = 'INPROGRESS';
            return
        }
    });

}

function assignTasks(room, creeps) {
    let requests = room.memory.requests
    let taskNeedingCreeps = creeps.filter(c => c.memory.needTask == true)
    for (let creep of taskNeedingCreeps) {
        if (creep.memory.role === 'miner') {
            assignMinerTask(creep, requests)
            continue
        }
        let availableTasks;
        if (creep.memory.refill == true) {
            // assign a source task
            availableTasks = requests.filter(r => r.sourceRequest == true
                && (r.taskType == 'mine'
                    && r.maxCreeps > r.assignedCreeps.length)
                || (r.taskType == 'withdraw' && r.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity()))
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
        let objects = availableTasks.map(request => Game.getObjectById(request.id));
        let target;
        if (creep.memory.refill == true) {
            // find target with most of the request.resource 
            target = _.max(objects, o => {
                if (o.energy) {
                    return o.energy
                } else {
                    try {
                        return o.store.getUsedCapacity(RESOURCE_ENERGY)
                    } catch (e) {
                        console.log(o.id, 'Error A')
                    }
                }
            })
        } else {
            target = creep.pos.findClosestByRange(objects);
        }
        if (target == null) {
            console.log('Did not find target for ' + creep.name)
            return
        }
        let task = availableTasks.find(t => t.id == target.id)
        if (task) {
            creep.memory.target = task.id;
            creep.memory.task = task.taskType;
            creep.memory.needTask = false
            task.assignedCreeps.push(creep.name);
            task.status = 'INPROGRESS';
        }
    }
}

function generateRequests(room) {
    //room.memory.requests = []
    if (room.memory === undefined) {
        room.memory = {}
    }
    if (room.memory.requests === undefined) {
        room.memory.requests = []
    }
    let structures = room.find(FIND_STRUCTURES)
    sourceRequests(room)
    withdrawRequests(room, structures)
    refillRequests(room, structures)
    buildRequests(room, structures)
    controllerRequest(room)
    if (room.memory.requests.length > 50) {
        console.log('Requests length > 50, clearing requests')
        room.memory.requests = []
    }
}

function withdrawRequests(room, structures) {

    // Clear container requests for containers that no longer exist in the game.

    // Get a list of containers that there is not a request for and create a new request for each.

    // Push each new request into requests.

    // Update each container request's store with the container.store object.
    let requests = room.memory.requests;
    let withdrawRequests = requests.filter(r => r.taskType === 'withdraw');
    let newContainers = structures.filter(s => s.structureType === STRUCTURE_CONTAINER && !withdrawRequests.find(r => r.id === s.id));
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
    newContainers.forEach(c => requests.push(new WithDrawRequest(c.id)));

    // update the store property for each WithDrawRequest with the container's store object
    withdrawRequests.forEach(r => {

        let container = structures.find(s => s.id === r.id);
        r.store = container.store;

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
    newConstructionSites.forEach(s => requests.push(new BuildRequest(s.id)));
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
        (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
        s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        && !requests.find(r => r.id === s.id)
    );
    // Create refill requests for those structures with priority 1
    let refillRequests = refillStructures.map(s => new RefillRequest(s.id, 1));
    requests = requests.concat(refillRequests);
    room.memory.requests = requests;
}

module.exports = taskManager