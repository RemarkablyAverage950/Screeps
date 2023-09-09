const { drop } = require("lodash")

class Task {
    constructor(id, task, resource) {
        this.task = task
        this.id = id
        this.resource = resource
    }
}
/*
    tasks{
        room{
            storeStructures: [{
                id: #
                store: {energy: #},
                forecast: [{
                    creep: #,
                    resource: ResourceConstant,
                    qty: #
                },{}]
            },{}],
            constructionSites: []
        }
    }
*/


/**
 * Manages tasks by generating and assigning them to creeps needing tasks.
 * @param {Room} room 
 */
function taskManagerOld(room, roomCreeps) {
    setCreepStats(roomCreeps)

    let taskNeedingCreeps = roomCreeps.filter(c => c.memory.needTask == true && c.memory.role == 'worker')
    for (creep of taskNeedingCreeps) {
        if (creep.memory.pending) {
            assignPending(creep)
            continue
        }
        switch (creep.memory.role) {

            case 'worker':
                findWorkerTask(creep);
                if (creep.memory.task) {
                    break;
                };
            default:
                findUpgraderTask(creep)
        }
    }
}

function setCreepStats(roomCreeps) {
    for (let creep of roomCreeps) {
        if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
            creep.memory.needTask = true
            creep.memory.clearPath = true
        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
            creep.memory.needTask = true
            creep.memory.clearPath = true
        } else if (!creep.memory.target && !creep.memory.harvestTarget) {
            creep.memory.needTask = true
            creep.memory.clearPath = true
        }

    }
}

function assignPending(creep) {
    let pending = creep.memory.pending
    creep.memory.target = pending.id
    creep.memory.task = pending.task
    creep.memory.resource = pending.resource
    creep.memory.pending = undefined
    creep.memory.needTask = false
}

function findRemoteWorkerTask(creep) {
    if (!creep.memory.targetRoom) {

    }
}

function findMinerTask(creep) {
    const containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    const sources = creep.room.find(FIND_SOURCES)
    let availableSourceGroups = []
    for (let source of sources) {
        for (let container of containers) {
            if (container.pos.isNearTo(source)
                && !source.assignedCreeps().some(c => Game.creeps[c].memory.role == 'miner')) {
                availableSourceGroups.push([source.id, container.id])
            }
        }
    }
    if (availableSourceGroups.length > 0) {
        let group = availableSourceGroups[0]
        creep.memory.harvestTarget = group[0]
        creep.memory.moveTarget = group[1]
        creep.memory.resource = RESOURCE_ENERGY
        creep.memory.needTask = false
    }
}

/**
 * Finds best task for a worker creep
 * @param {Creep} creep 
 */
function findWorkerTask(creep) {
    let structures = creep.room.find(FIND_STRUCTURES)
    if (creep.memory.refill == true) {
        // Find energy source:

        // Look for container with enough energy forecasted. 
        const energyContainers = structures
            .filter(s => (s.structureType == STRUCTURE_CONTAINER
                || s.structureType == STRUCTURE_STORAGE)
                // *Adjust this to a forecasted store amount*
                && s.forecast(RESOURCE_ENERGY) >= creep.store.getCapacity())
        if (energyContainers.length > 0) {
            const target = creep.pos.findClosestByRange(energyContainers)
            creep.memory.task = 'withdraw'
            creep.memory.target = target.id
            creep.memory.resource = RESOURCE_ENERGY
            creep.memory.needTask = false
        } else {
            const sources = creep.room.find(FIND_SOURCES_ACTIVE).filter(s => s.assignedCreeps().length < s.maxCreeps())
            if (sources.length > 0) {
                const target = creep.pos.findClosestByRange(sources)
                creep.memory.task = 'harvest'
                creep.memory.target = target.id
                creep.memory.resource = RESOURCE_ENERGY
                creep.memory.needTask = false
            }
        }
    } else {

        let refillStructures = structures
            .filter(s => ((s.structureType == STRUCTURE_SPAWN
                || s.structureType == STRUCTURE_EXTENSION) && s.forecast(RESOURCE_ENERGY) < s.store.getCapacity(RESOURCE_ENERGY)
                || (s.structureType == STRUCTURE_TOWER && s.forecast(RESOURCE_ENERGY) < 500)))
        if (refillStructures.length == 0) {
            refillStructures = structures.filter(s => s.structureType == STRUCTURE_TOWER && s.forecast(RESOURCE_ENERGY) < 950)
        }

        if (refillStructures.length > 0) {
            const target = creep.pos.findClosestByRange(refillStructures)
            creep.memory.resource = RESOURCE_ENERGY
            creep.memory.task = 'transfer'
            creep.memory.target = target.id
            creep.memory.needTask = false
        } else {
            // find build tasks
            let sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
                .filter(s => s.forecast() < s.progressTotal)
            if (sites.length > 0) {
                const target = creep.pos.findClosestByRange(sites)
                creep.memory.resource = RESOURCE_ENERGY
                creep.memory.task = 'build'
                creep.memory.target = target.id
                creep.memory.needTask = false
            } else {

                let repairSites = structures.filter(s => s.structureType == STRUCTURE_RAMPART
                    && s.hits < getWallHitsTarget(creep.room)
                    && s.repairForecast() < getWallHitsTarget(creep.room))
                if (repairSites.length > 0) {
                    const target = _.min(repairSites, s => s.repairForecast())
                    creep.memory.resource = RESOURCE_ENERGY
                    creep.memory.task = 'repair'
                    creep.memory.target = target.id
                    creep.memory.needTask = false
                }
            }
        }

    }
}

function findTransporterTask(creep) {
    let structures = creep.room.find(FIND_STRUCTURES)
    if (creep.memory.refill) {
        let tombstones = creep.room.find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity() > 0)
        if (tombstones.length > 0) {
            let target = creep.pos.findClosestByRange(tombstones)
            creep.memory.target = target.id
            creep.memory.task = 'withdraw'
            creep.memory.resource = target.store[0]
            creep.memory.needTask = false
            return
        }
        let dropped = creep.room.find(FIND_DROPPED_RESOURCES).filter(r => r.amount > 10)
        if (dropped.length > 0) {
            let target = creep.pos.findClosestByRange(dropped)
            creep.memory.target = target.id
            creep.memory.task = 'pickup'
            creep.memory.resource = target.resource
            creep.memory.needTask = false
            return
        }

        let sources = structures.filter(s => s.structureType == STRUCTURE_CONTAINER)
        let target = _.max(sources, s => s.forecast(RESOURCE_ENERGY))
        creep.memory.target = target.id
        creep.memory.task = 'withdraw'
        creep.memory.resource = RESOURCE_ENERGY
        creep.memory.needTask = false
    } else {
        let destinations = structures.filter(s => s.structureType == STRUCTURE_STORAGE)
        let target = _.min(destinations, d => d.forecast(RESOURCE_ENERGY))
        creep.memory.target = target.id
        creep.memory.task = 'transfer'
        creep.memory.resource = RESOURCE_ENERGY
        creep.memory.needTask = false
    }
}

function findUpgraderTask(creep) {
    if (creep.memory.refill == true) {
        // Find energy source:

        // Look for container with enough energy forecasted. 
        const energyContainers = creep.room.find(FIND_STRUCTURES)
            .filter(s => (s.structureType == STRUCTURE_CONTAINER
                || s.structureType == STRUCTURE_STORAGE)
                // *Adjust this to a forecasted store amount*
                && s.forecast(RESOURCE_ENERGY) >= creep.store.getCapacity())
        if (energyContainers.length > 0) {
            const target = creep.pos.findClosestByRange(energyContainers)
            creep.memory.task = 'withdraw'
            creep.memory.target = target.id
            creep.memory.resource = RESOURCE_ENERGY
            creep.memory.needTask = false
        } else {
            const sources = creep.room.find(FIND_SOURCES_ACTIVE).filter(s => s.assignedCreeps().length < s.maxCreeps())
            if (sources.length > 0) {
                const target = creep.pos.findClosestByRange(sources)
                creep.memory.task = 'harvest'
                creep.memory.target = target.id
                creep.memory.resource = RESOURCE_ENERGY
                creep.memory.needTask = false
            }
        }
    } else {
        let controller = creep.room.controller
        creep.memory.task = 'upgradeController'
        creep.memory.target = controller.id
        creep.memory.resource = RESOURCE_ENERGY
        creep.memory.needTask = false
    }
}

function getWallHitsTarget(room) {
    switch (room.controller.level) {
        case 8:
            return 20000000
        case 7:
            return 10000000
        case 6:
            return 5000000
        case 5:
            return 2500000
        default:
            return 1000000
    }
}

module.exports = taskManagerOld