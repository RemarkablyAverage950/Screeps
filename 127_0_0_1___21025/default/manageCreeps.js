let MEMORY = require('memory');
require('prototypes');

class Task {
    /**
     * @constructor
     * @param {string} type 
     */
    constructor(type) {
        this.type = type;
    };
};

class HarvestTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('HARVEST');
        this.id = id;
    };
};

class PickupTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     * @param {number} qty
     */
    constructor(id, qty) {
        super('PICKUP');
        this.id = id;
        this.qty = qty;
    };
};

class TransferTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     * @param {ResourceConstant} resourceType
     * @param {number} qty
     */
    constructor(id, resourceType, qty) {
        super('TRANSFER');
        this.id = id;
        this.resourceType = resourceType;
        this.qty = qty;
    }
}

class UpgradeTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('UPGRADE');
        this.id = id;
    };
};

class WithdrawTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     * @param {ResourceConstant} resourceType
     * @param {number} qty
     */
    constructor(id, resourceType, qty) {
        super('WITHDRAW');
        this.id = id;
        this.resourceType = resourceType;
        this.qty = qty;
    };
};

/**
 * Assigns, validates, and executes tasks to individual creeps.
 * @param {Room} room 
 * @param {Creep[]} creeps 
 */
function manageCreeps(room, creeps) {

    for (const creep of creeps) {

        // initialize creep memory if nescessary.
        if (!MEMORY.rooms[room.name].creeps[creep.name]) {
            MEMORY.rooms[room.name].creeps[creep.name] = {
                moving: true,
                task: undefined,
            }
        }

        if (creep.spawning) continue;

        const taskValid = validateTask(room, creep);

        if (!taskValid) {
            assignTask(room, creep)
            console.log('Assigned task', JSON.stringify(MEMORY.rooms[room.name].creeps[creep.name].task), 'to', creep.name)
        }

        executeTask(room, creep);

    }

}

/**
 * Assigns best task based on role.
 * @param {Room} room 
 * @param {Creep} creep 
 * @returns 
 */
function assignTask(room, creep) {

    const role = creep.memory.role;
    let availableTasks = []
    let task = undefined;

    if (role === 'worker') {

        availableTasks = getRoleTasks.worker(room, creep)

        // Best task is closest

        let minDistance = Infinity;

        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id)

            const distance = creep.pos.getRangeTo(object)
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            }

        }

    } else if (role === 'miner') {

        availableTasks = getRoleTasks.miner(room, creep);
        task = availableTasks[0];

    } else if (role === 'filler') {

        availableTasks = getRoleTasks.filler(room, creep)

        // Best task is closest

        let minDistance = Infinity;
        task = undefined;
        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id);

            const distance = creep.pos.getRangeTo(object)
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            };

        };
    }else if (role === 'upgrader'){
        availableTasks = getRoleTasks.upgrader(room, creep)

        // Best task is closest

        let minDistance = Infinity;

        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id)

            const distance = creep.pos.getRangeTo(object)
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            }

        }
    }

    if (!task) {
        return;
    }

    MEMORY.rooms[room.name].creeps[creep.name].task = task;
    creep.say('Assigned ' + task.type + ' from ' + task.id)

}

/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 */
function executeTask(room, creep) {
    const task = MEMORY.rooms[room.name].creeps[creep.name].task
    if (!task) {
        return false
    }

    let target = undefined;

    if (task.id) {
        target = Game.getObjectById(task.id)
    }

    switch (task.type) {

        case 'HARVEST':

            if (creep.harvest(target) != 0) {
                creep.moveTo(target, {
                    visualizePathStyle: {
                        fill: 'transparent',
                        stroke: '#fff',
                        lineStyle: 'dashed',
                        strokeWidth: .15,
                        opacity: .1
                    }
                })
            }

            break;
        case 'PICKUP':
            if (creep.pickup(target) != 0) {
                creep.moveTo(target, {
                    visualizePathStyle: {
                        fill: 'transparent',
                        stroke: '#fff',
                        lineStyle: 'dashed',
                        strokeWidth: .15,
                        opacity: .1
                    }
                })
            }
            break;
        case 'TRANSFER':

            if (creep.transfer(target, task.resourceType) != 0) {
                creep.moveTo(target, {
                    visualizePathStyle: {
                        fill: 'transparent',
                        stroke: '#fff',
                        lineStyle: 'dashed',
                        strokeWidth: .15,
                        opacity: .1
                    }
                })
            }
            break;

        case 'UPGRADE':
            if (creep.upgradeController(target) != 0) {
                creep.moveTo(target, {
                    visualizePathStyle: {
                        fill: 'transparent',
                        stroke: '#fff',
                        lineStyle: 'dashed',
                        strokeWidth: .15,
                        opacity: .1
                    }
                })
            }
            break;

    };
};

const getRoleTasks = {

    filler: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.fill(room, creep));

            if (tasks.length === 0) {
                console.log('Implement park task')
                //tasks.push(...getTasks.park(room, creep));
            };

        };

        return tasks;
    },

    miner: function (room, creep) {
        const creepName = creep.name;
        const minerNumber = creepName[creepName.length - 1]
        const sources = room.find(FIND_SOURCES);
        let tasks = [];

        for (let s of sources) {
            if (MEMORY.rooms[room.name].sources[s.id].minerNumber == minerNumber) {
                tasks.push(new HarvestTask(s.id))
                break;
            }
        }
        return tasks;

    },

    upgrader: function (room, creep) {

        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.upgrade(room, creep));
        };

        return tasks;

    },

    worker: function (room, creep) {

        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room, creep, RESOURCE_ENERGY));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.fill(room, creep));

            if (tasks.length === 0) {
                tasks.push(...getTasks.upgrade(room, creep));
            };

        };

        return tasks;

    },




};

const getTasks = {

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {TransferTask[]}
     */
    fill: function (room, creep) {
        console.log('Looing for fill tasks for ', creep.name)
        const structures = room.find(FIND_STRUCTURES);
        const heldEnergy = creep.store[RESOURCE_ENERGY];
        let tasks = [];

        for (let s of structures) {

            if (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) {

                const forecast = s.forecast(RESOURCE_ENERGY);
                const capacity = s.store.getCapacity(RESOURCE_ENERGY);
                console.log('forecast:', forecast, 'capacity', capacity)

                if (forecast < capacity) {

                    tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, Math.min(capacity - forecast, heldEnergy)));

                };

            };

        };

        return tasks;

    },

    /**
     * 
     * @param {Room} room 
     * @returns {HarvestTask[]}
     */
    harvest: function (room) {

        const sources = room.find(FIND_SOURCES);
        let tasks = [];

        for (let s of sources) {
            if (s.energy > 0 && s.available()) {
                tasks.push(new HarvestTask(s.id))
            }
        }

        return tasks

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep
     * @param {ResourceConstant} resourceType 
     * @returns {PickupTask[]}
     */
    pickup: function (room, creep, resourceType) {

        const capacity = creep.store.getFreeCapacity()
        const dropped = room.find(FIND_DROPPED_RESOURCES);
        let tasks = [];

        for (let r of dropped) {
            const forecast = r.forecast();
            if (r.resourceType === resourceType && forecast > 0) {

                tasks.push(new PickupTask(r.id, Math.min(forecast, capacity)));

            };
        };

        return tasks;

    },

    upgrade: function (room) {

        const controller = room.controller;
        let tasks = [];

        tasks.push(new UpgradeTask(controller.id));

        return tasks;

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep
     * @param {ResourceConstant} resourceType 
     * @returns {WithdrawTask[]}
     */
    withdraw: function (room, creep, resourceType) {

        const capacity = creep.store.getFreeCapacity();
        const structures = room.find(FIND_STRUCTURES);
        const tombstones = room.find(FIND_TOMBSTONES);
        let tasks = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {

                const forecast = s.forecast(resourceType);

                if (forecast >= capacity) {

                    tasks.push(new WithdrawTask(s.id, resourceType, Math.min(forecast, capacity)));

                };
            };

        };

        for (let t of tombstones) {

            const forecast = t.forecast(resourceType);
            if (forecast >= capacity) {
                tasks.push(new WithdrawTask(t.id, resourceType, Math.min(forecast, capacity)));
            }
        }

        if (tasks.length > 0) return tasks;

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {

                const forecast = s.forecast(resourceType);

                if (forecast >= 0) {

                    tasks.push(new WithdrawTask(s.id, resourceType, forecast));

                };
            };

        };

        for (let t of tombstones) {

            const forecast = t.forecast(resourceType);
            if (forecast >= 0) {
                tasks.push(new WithdrawTask(t.id, resourceType, forecast));
            };
        };

        return tasks;

    },

};

function validateTask(room, creep) {
    const task = MEMORY.rooms[room.name].creeps[creep.name].task

    if (!task) {
        //console.log('Task for',creep.name,'is undefined.')
        return false
    }

    //console.log('Checking if',creep.name,task.type,'is valid.')

    let target = undefined;

    if (task.id) {
        target = Game.getObjectById(task.id)
    }

    switch (task.type) {

        case 'HARVEST':

            if (!target) {
                return false;
            }
            if (creep.memory.role != 'miner' && (target.energy === 0 || creep.store.getFreeCapacity() === 0)) {
                return false;
            }

            break;
        case 'PICKUP':
            if (!target) return false;
            if (creep.store.getFreeCapacity() === 0) {
                return false;
            }
            break;
        case 'TRANSFER':

            if (!target) {
                return false;
            }
            if (target.store.getFreeCapacity(task.resourceType) === 0 || creep.store[RESOURCE_ENERGY] === 0) {
                return false;
            }

            break;

        case 'UPGRADE':
            if (creep.store[RESOURCE_ENERGY] === 0) {
                return false
            }
    };

    //console.log(creep.name,'task',task.type,'is valid.')
    return true;
}




module.exports = manageCreeps;