const getAssignedCreeps = require('prototypes');
const helper = require('lib.helper');
let MEMORY = require('memory');

const DEBUG = 0;

class Task {
    /**
     * @constructor
     * @param {string} type 
     */
    constructor(type) {
        this.type = type;
    }
}

class AttackTask extends Task {
    constructor(id) {
        super('ATTACK');
        this.id = id;
    }
}

class AttackControllerTask extends Task {
    constructor(id) {
        super('ATTACK_CONTROLLER')
        this.id = id;
    }
}

class BuildTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('BUILD');
        this.id = id;
    }
}

class ClaimTask extends Task {
    /**
 * @constructor
 * @param {string} id 
 */
    constructor(id) {
        super('CLAIM');
        this.id = id;
    }
}

class DismantleTask extends Task {
    constructor(id) {
        super('DISMANTLE');
        this.id = id;
    }
}

class HarvestTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('HARVEST');
        this.id = id;
    }
}

class HarvestDepositTask extends Task {
    /**
 * @constructor
 * @param {string} id 
 */
    constructor(id) {
        super('HARVEST_DEPOSIT');
        this.id = id;
    }
}

class HealTask extends Task {
    constructor(id) {
        super('HEAL');
        this.id = id;
    }
}

class MoveTask extends Task {
    /**
     * @constructor
     * @param {RoomPosition} pos
     */
    constructor(pos) {
        super('MOVE');
        this.pos = pos;
    }
}

class MoveToRoomTask extends Task {
    /**
     * @constructor
     * @param {string} roomName 
     */
    constructor(roomName, targetPos = undefined) {
        super('MOVE_TO_ROOM');
        this.roomName = roomName
        this.targetPos = targetPos
    }
}

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
    }
}

class RangedAttackTask extends Task {
    constructor(id) {
        super('RANGED_ATTACK');
        this.id = id;
    }
}

class RepairTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('REPAIR');
        this.id = id;
    }
}

class ReserveTask extends Task {
    constructor(id) {
        super('RESERVE');
        this.id = id;
    }
}

class SignTask extends Task {
    constructor(id, text) {
        super('SIGN');
        this.id = id;
        this.text = text;
    }
}

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
    }
}

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
    }
}


/**
 * Assigns tasks based on role.
 * @param {Room} room 
 * @param {Creep} creep 
 * @param {Creep[]}
 * @returns 
 */
function assignTask(room, creep, creeps, roomHeap) {

    const role = creep.memory.role;

    let availableTasks = [];

    let tasks = [];



    tasks = getRoleTasks[role](room, creep, creeps, roomHeap)



    if (!tasks.length) {
        tasks.push(helper.parkTask(room, creep));
    }

    if (DEBUG) {
        console.log(creep.name, JSON.stringify(tasks));
    }


    MEMORY.creeps[creep.name].tasks = tasks;
    creep.say(tasks[0].type)

}

const getRoleTasks = {

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @param {Creep[]} creeps
     * @returns {Task[]}
     */
    filler: function (room, creep, creeps, roomHeap) {

        const freeCapacity = creep.store.getFreeCapacity()

        let availableTasks = [];
        let tasks = [];

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.fill(room, creep, roomHeap));

        }

        if (tasks.length === 0 && freeCapacity > 0) {

            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, freeCapacity))

            if (tasks.length === 0) {
                tasks.push(...getTasks.pickup(roomHeap, creep, RESOURCE_ENERGY, freeCapacity));
            }

        }

        return tasks;
    },

    /**
     * Function checks if there is an assigned source id to harvest in 'creep.memory.assignedSource'.
     * If there is not, finds best source and assigns it to creep and returns a harvest task array.
     * If there is an assigned source, it returns a harvest task array.
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @param {Creep[]} creeps
     * @returns {HarvestTask | undefined}
     */
    miner: function (room, creep, creeps, roomHeap) {

        if (!creep.memory.assignedSource) {
            const sources = Object.values(roomHeap.sources)

            let availableSources = [];
            for (let s of sources) {

                const assignedMinerCount = getAssignedCreeps(s.id, 'miner').length

                if (assignedMinerCount < s.maxCreeps) {
                    availableSources.push({
                        source: s.obj,
                        assignedMinerCount: assignedMinerCount,
                    })
                }
            }

            if (availableSources.length) {
                // Pick source with least amount of creeps assigned.
                let target = _.min(availableSources, so => so.assignedMinerCount);
                creep.memory.assignedSource = target.source.id
                return [new HarvestTask(target.source.id)]
            }
        } else {
            return [new HarvestTask(creep.memory.assignedSource)]
        }

        return [];

    },


}

const getTasks = {

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {TransferTask[]}
     */
    fill: function (room, creep, roomHeap) {

        let fillRequests = MEMORY.rooms[room.name].requests.fill // Request[{id,qty}]
        let tasks = [];

        if (roomHeap.energyAvailable !== room.energyAvailable) {
            fillRequests = lib.getFillRequests(room, roomHeap);
            MEMORY.rooms[room.name].requests.fill = fillRequests;
            roomHeap.energyAvailable = room.energyAvailable
        }

        if (DEBUG) {
            console.log('fillRequests:', JSON.stringify(fillRequests))
        }

        if (!fillRequests.length) {
            return tasks;
        }

        let fillStructures = fillRequests.map(r => Game.getObjectById(r.id)); // Structure[]
        let energy = creep.store[RESOURCE_ENERGY];
        let lastPos = creep.pos;
        let idx = undefined;


        while (energy > 0 && fillStructures.length) {

            const closest = _.min(fillStructures, t => t.pos.getRangeTo(lastPos));
            if (DEBUG) {
                console.log('closest:', JSON.stringify(closest))
            }
            const forecast = closest.forecast(RESOURCE_ENERGY); 300
            const qtyNeeded = closest.store.getCapacity(RESOURCE_ENERGY) - forecast;

            if (qtyNeeded <= 0) {
                idx = fillStructures.findIndex(s => s.id === closest.id)
                fillStructures.splice(idx, 1);
                continue;
            }

            const transferQty = Math.min(energy, qtyNeeded);

            tasks.push(new TransferTask(closest.id, RESOURCE_ENERGY, transferQty));
            lastPos = closest.pos;

            if (forecast + transferQty >= closest.store.getCapacity(RESOURCE_ENERGY)) {
                idx = fillStructures.findIndex(s => s.id === closest.id)
                fillStructures.splice(idx, 1);
            }
            energy -= transferQty;
        }

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
     * @param {Object} roomHeap 
     * @param {Creep} creep
     * @param {ResourceConstant} resourceType 
     * @returns {PickupTask[]}
     */
    pickup: function (roomHeap, creep, resourceType, targetQty, pickupCapacity) { // 

        const capacity = creep.store.getFreeCapacity()
        let dropped = roomHeap.droppedResources;
        let tasks = [];
        let scheduledQty = 0;

        // Check if any pickup locations can fill requested quantity.
        let bestTargets = dropped.filter(r => r.amount >= pickupCapacity)

        if (bestTargets.length) {
            const closest = _.min(bestTargets, r => r.pos.getRangeTo(creep))

            tasks.push(new PickupTask(closest.id, pickupCapacity))
            return tasks

        }


        // if none 

        // Traveling salesman problem.
        while (dropped.length && scheduledQty < targetQty) {






        }

        if (pickupCapacity) {
            for (let r of dropped) {
                const forecast = r.forecast();
                if (r.resourceType === resourceType && forecast > capacity) {

                    tasks.push(new PickupTask(r.id, capacity));

                };
            };
        } else {

            for (let r of dropped) {
                const forecast = r.forecast();
                if (r.resourceType === resourceType && forecast > 0) {

                    tasks.push(new PickupTask(r.id, capacity));

                };
            };

        }
        return tasks;

    },




    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep
     * @param {ResourceConstant} resourceType 
     * @param {number} withdrawQty
     * @returns {WithdrawTask[]}
     */
    withdraw: function (room, creep, resourceType, withdrawQty) {

        let structures = lib.getStructures(room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).filter(s => s.store[resourceType])

        let withdrawCapacityStructures = structures.filter(s => s.store[resourceType] >= withdrawQty)
            .sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));

        let tasks = [];
        let qty = 0;

        for (const s of withdrawCapacityStructures) {
            if (s.forecast(resourceType) >= withdrawQty) {
                return [new WithdrawTask(s.id, resourceType, withdrawQty)]
            }
        }

        structures = structures.sort((a, b) => b.pos.getRangeTo(creep) - a.pos.getRangeTo(creep));
        while (qty < withdrawQty && structures.length) {

            const s = structures.pop();
            const forecast = s.forecast(resourceType)
            if (forecast > 0) {
                let _qty = Math.min(forecast, withdrawQty - qty)
                tasks.push(new WithdrawTask(s.id, resourceType, _qty))
            }
        }

        return tasks;
    },


};

module.exports = assignTask;