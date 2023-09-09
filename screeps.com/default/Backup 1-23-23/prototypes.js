
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
    return Object.values(Game.creeps).filter(c => c.memory.harvestTarget == this.id).map(c => c.name)
};

Structure.prototype.assignedCreeps = function () {
    return Object.values(Game.creeps).filter(c => c.memory.target == this.id).map(c => c.name)
};
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
        let creep = Game.creeps[creeps[i]];
        if (creep.memory.task == "transfer" && this.structureType != STRUCTURE_STORAGE) {
            let qty = Math.min(creep.store[resource], this.store.getCapacity(resource) - forecast)
            forecast += qty
        } else if (creep.memory.task == "withdraw") {
            let qty = Math.min(this.store[resource], creep.store.getFreeCapacity())
            forecast -= qty
            
        }
    }
    return forecast;
}

Structure.prototype.repairForecast = function () {
    let forecast = this.hits
    let creeps = this.assignedCreeps();
    for (let i in creeps) {
        let creep = Game.creeps[creeps[i]];
        if (creep.memory.task == 'wallRepair') {
            let qty = creep.store[RESOURCE_ENERGY]
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
