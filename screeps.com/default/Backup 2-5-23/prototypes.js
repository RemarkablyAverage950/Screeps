
let { creepTasks } = require('tasks')

Source.prototype.maxCreeps = function () {
    const x = this.pos.x
    const y = this.pos.y
    const roomName = this.pos.roomName
    let terrain = new Room.Terrain(roomName)
    let count = 0
    for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
            if (terrain.get(i, j) != TERRAIN_MASK_WALL) {
                count++
            }
        }
    }
    return count
}
Source.prototype.assignedCreeps = function () {



    return Object.values(Game.creeps).filter(c => {
        try {
            if (creepTasks[c.memory.home][c.name].task.target == this.id) {
                return true
            } else {
                for (let task of creepTasks[c.memory.home][c.name].taskQueue) {
                    if (task.target == this.id) {
                        return true
                    }
                }
            }
        } catch (e) { }

        return false
    }).map(c => c.name)
};

Source.prototype.getContainer = function () {
    const containers = this.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.pos.isNearTo(this.pos))
    if (containers.length == 1) {
        return containers[0]
    } else if (containers.length == 2) {
        // find the container that only can access this source.
        const otherSource = this.room.find(FIND_SOURCES).filter(s => s.id != this.id)[0]
        for (let container of containers) {
            if(otherSource.pos.isNearTo(container)){
                continue
            }
            return container
        }
    }
}

Structure.prototype.assignedCreeps = function () {
    return Object.values(Game.creeps).filter(c => {
        if (!creepTasks[c.memory.home] || !creepTasks[c.memory.home][c.name] || !creepTasks[c.memory.home][c.name].task) {
            return false
        }
        if (creepTasks[c.memory.home][c.name].task.target == this.id) {
            return true
        } /*else {
                for (let task of creepTasks[c.memory.home][c.name].taskQueue) {
                    if (task.target == this.id) {
                        return true
                    }
                }
            }
        } catch (e) { console.log('prototype assigned creeps()',c.name,e)}*/
        return false
    }).map(c => c.name)
}

Structure.prototype.forecast = function (resource) {
    if (!this.store) {
        console.log('Cannot forecast for ' + this.structureType)
        return undefined
    }
    let forecast;
    if (!this.store[resource]) {
        forecast = 0
    } else {
        forecast = this.store[resource]
    }
    let creeps = this.assignedCreeps();
    for (let i in creeps) {

        const creep = Game.creeps[creeps[i]];
        const home = creep.memory.home
        const task = creepTasks[home][creep.name].task
        if (task.target == this.id) {
            if (task.type == 'transfer' && this.structureType != STRUCTURE_STORAGE) {
                let qty = Math.min(creep.store[resource], this.store.getCapacity(resource) - forecast)
                forecast += qty
            } else if (task.type == 'withdraw') {
                let qty = Math.min(this.store[resource], creep.store.getFreeCapacity())
                forecast -= qty
            }
        }

        /*if (creep.memory.task == "transfer" && this.structureType != STRUCTURE_STORAGE) {
            let qty = Math.min(creep.store[resource], this.store.getCapacity(resource) - forecast)
            forecast += qty
        } else if (creep.memory.task == "withdraw") {
            let qty = Math.min(this.store[resource], creep.store.getFreeCapacity())
            forecast -= qty

        }*/
    }
    return forecast;
}

Structure.prototype.repairForecast = function () {
    let forecast = this.hits
    let creeps = this.assignedCreeps();
    for (let i in creeps) {
        let creep = Game.creeps[creeps[i]];
        let task = creep.memory.task
        if (task == 'wallRepair' || task == 'repair') {
            let qty = creep.store[RESOURCE_ENERGY] * 5
            forecast += qty
        }
    }
    return Math.min(forecast, this.hitsMax)
}

ConstructionSite.prototype.assignedCreeps = function () {
    return Object.values(Game.creeps).filter(c => c.memory.target == this.id).map(c => c.name)
};

/**
 * 
 * @returns {number} Progress forecasted after assigned creeps complete their tasks.
 */
ConstructionSite.prototype.forecast = function () {
    let forecast = this.progress
    let creeps = this.assignedCreeps();
    for (let i in creeps) {
        let creep = Game.creeps[creeps[i]];
        let resource = RESOURCE_ENERGY
        let qty = Math.min(creep.store[resource], this.progressTotal - forecast)
        forecast += qty
    }
    return forecast
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
