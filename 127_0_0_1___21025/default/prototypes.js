let MEMORY = require('memory');

/**
 * Returns true if there is space available to harvest.
 * @returns {boolean} 
 */
Source.prototype.available = function () {
    if(!MEMORY.rooms[this.room.name] || !MEMORY.rooms[this.room.name].sources[this.id].maxCreeps) return false;
    const maxCreeps = MEMORY.rooms[this.room.name].sources[this.id].maxCreeps
    const assigned = getAssignedCreeps(this.id)

    if (assigned.length >= maxCreeps) {
        return false;
    } else {
        return true;
    };
};

/**
 * Returns the container belonging to a source.
 * @returns {StructureContainer}
 */
Source.prototype.getContainer = function () {
    const containers = this.room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_CONTAINER && s.pos.isNearTo(this.pos))
    if (containers.length === 1) {
        return containers[0]
    } else if (containers.length == 2) {
        // find the container that only can access this source.
        const otherSource = this.room.find(FIND_SOURCES).filter(s => s.id != this.id)[0]
        for (let container of containers) {
            if (otherSource.pos.isNearTo(container)) {
                continue
            }
            return container
        }
    }
}

/**
 * Returns the maximum number of creeps that can harvest a source at one time.
 * @returns {number}
 */
Source.prototype.maxCreeps = function () {
    const x = this.pos.x;
    const y = this.pos.y;
    const roomName = this.pos.roomName;
    let terrain = new Room.Terrain(roomName);
    let count = 0;
    for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
            if (terrain.get(i, j) != TERRAIN_MASK_WALL) {
                count++;
            };
        };
    };
    return count;
};




/**
 * Forecasts the amount after assigned tasks are complete.
 * @returns {number}
 */
Resource.prototype.forecast = function () {

    const assigned = getAssignedCreeps(this.id);

    let forecast = this.amount;

    for (let creep of assigned) {

        const task = MEMORY.rooms[creep.memory.home].creeps[creep.name].task;

        forecast -= task.qty;

    }

    return forecast;

};

/**
 * Forecasts the quantity of a resource after assigned tasks are complete.
 * @param {ResourceConstant} resourceType 
 * @returns {number}
 */
Ruin.prototype.forecast = function (resourceType) {

    if (this.store === undefined) {
        return 0;
    }

    const assigned = getAssignedCreeps(this.id)

    let forecast = this.store[resourceType]

    for (let creep of assigned) {
        const task = MEMORY.rooms[creep.memory.home].creeps[creep.name].task;
        const type = task.type;
        if (task.resourceType != resourceType) {
            continue;
        }

        if (type === 'WITHDRAW') {
            forecast -= task.qty;
        } else if (type === 'TRANSFER') {
            forecast += task.qty;
        };

    }

    return forecast;

}

/**
 * Forecasts the quantity of a resource after assigned tasks are complete.
 * @param {ResourceConstant} resourceType 
 * @returns {number}
 */
Structure.prototype.forecast = function (resourceType) {

    if (this.store === undefined) {
        return 0;
    }

    const assigned = getAssignedCreeps(this.id)

    let forecast = this.store[resourceType]

    for (let creep of assigned) {

        const task = MEMORY.rooms[creep.memory.home].creeps[creep.name].task;
        const type = task.type;
        if (task.resourceType != resourceType) {
            continue;
        }

        if (type === 'WITHDRAW') {
            forecast -= task.qty;
        } else if (type === 'TRANSFER') {
            forecast += task.qty;
        };

    }

    return forecast;

};

/**
 * Forecasts the quantity of a resource after assigned tasks are complete.
 * @param {ResourceConstant} resourceType 
 * @returns {number}
 */
Tombstone.prototype.forecast = function (resourceType) {

    if (this.store === undefined) {
        return 0;
    }

    const assigned = getAssignedCreeps(this.id)

    let forecast = this.store[resourceType]

    for (let creep of assigned) {
        const task = MEMORY.rooms[creep.memory.home].creeps[creep.name].task;
        const type = task.type;
        if (task.resourceType != resourceType) {
            continue;
        }

        if (type === 'WITHDRAW') {
            forecast -= task.qty;
        } else if (type === 'TRANSFER') {
            forecast += task.qty;
        };

    }

    return forecast;

}

/**
 * Returns all creeps currently assigned tasks for a target id.
 * @param {string} target_id 
 * @returns {Creep[]}
 */
function getAssignedCreeps(target_id) {
    let assigned = [];

    for (let creep of Object.values(Game.creeps)) {

        if (!MEMORY.rooms || !MEMORY.rooms[creep.memory.home] || !MEMORY.rooms[creep.memory.home].creeps[creep.name]) {
            continue;
        }
        let task = MEMORY.rooms[creep.memory.home].creeps[creep.name].task;

        if (task && task.id && task.id === target_id) {
            assigned.push(creep);
        };
    }

    return assigned;
};

module.exports = getAssignedCreeps;