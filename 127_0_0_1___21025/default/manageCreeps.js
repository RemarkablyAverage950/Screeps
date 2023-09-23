let MEMORY = require('memory');
const { moveCreep, moveCreepToRoom } = require('pathfinder');
const getAssignedCreeps = require('prototypes');

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

class BuildTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('BUILD');
        this.id = id;
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
    constructor(roomName) {
        super('MOVE_TO_ROOM');
        this.roomName = roomName
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
    };
};

class RepairTask extends Task {
    /**
     * @constructor
     * @param {string} id 
     */
    constructor(id) {
        super('REPAIR');
        this.id = id;
    };
};

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

const BUILD_PRIORITY = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER,
    STRUCTURE_ROAD,
    STRUCTURE_STORAGE,
    STRUCTURE_TOWER,
    STRUCTURE_WALL,
    STRUCTURE_RAMPART,
    STRUCTURE_LINK,
    STRUCTURE_TERMINAL,
    STRUCTURE_EXTRACTOR,
    STRUCTURE_LAB,
    STRUCTURE_FACTORY,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_NUKER,
    STRUCTURE_OBSERVER,
]
/**
 * Assigns, validates, and executes tasks to individual creeps.
 * @param {Room} room 
 * @param {Creep[]} creeps 
 */
function manageCreeps(room, creeps) {


    for (const creep of creeps) {

        if (creep.memory.role === 'remoteHauler') {
            console.log(JSON.stringify(MEMORY.rooms[room.name].creeps[creep.name].task))
        }

        if (creep.spawning) continue;

        const taskValid = validateTask(room, creep);

        if (!taskValid) {

            MEMORY.rooms[room.name].creeps[creep.name].task = undefined;
            assignTask(room, creep)

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

        if (task === undefined) {
            task = parkTask(room, creep);
        }
    } else if (role === 'upgrader') {

        availableTasks = getRoleTasks.upgrader(room, creep);

        // Best task is closest

        let minDistance = Infinity;

        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id);

            const distance = creep.pos.getRangeTo(object);
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            };

        };
    } else if (role === 'builder') {

        availableTasks = getRoleTasks.builder(room, creep);

        // Best task is closest

        let minDistance = Infinity;

        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id);

            const distance = creep.pos.getRangeTo(object);
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            };



        };
        if (task === undefined) {
            task = parkTask(room, creep);
        }
    } else if (role === 'maintainer') {

        availableTasks = getRoleTasks.maintainer(room, creep);

        // Best task is closest

        let minDistance = Infinity;

        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id);

            const distance = creep.pos.getRangeTo(object);
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            };

        };

        if (task === undefined) {
            task = parkTask(room, creep);
        }
    } else if (role === 'wallBuilder') {
        availableTasks = getRoleTasks.wallBuilder(room, creep);

        // Best task is closest

        let minDistance = Infinity;

        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id);

            const distance = creep.pos.getRangeTo(object);
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            };

        };

        if (task === undefined) {
            task = parkTask(room, creep);
        };
    } else if (role === 'hauler') {

        availableTasks = getRoleTasks.hauler(room, creep);
        let minDistance = Infinity;


        for (const t of availableTasks) {

            let object = Game.getObjectById(t.id);

            const distance = creep.pos.getRangeTo(object);
            if (distance < minDistance) {
                minDistance = distance;
                task = t;
            };

        };

        if (task === undefined) {
            task = parkTask(room, creep);
        };
    } else if (role === 'scout') {

        task = getRoleTasks.scout(room, creep)

    } else if (role === 'hub') {
        task = getRoleTasks.hub(room, creep)
    } else if (role === 'remoteMiner') {

        if (!creep.memory.assignedRoom) {

            let outpostNames = room.memory.outposts;

            if (!outpostNames) {
                task = parkTask(room, creep);
            } else {
                for (let roomName of outpostNames) {
                    if (!MEMORY.rooms[room.name].outposts[roomName]) {
                        MEMORY.rooms[room.name].outposts[roomName] = { minersReq: 1 }
                    }
                    MEMORY.rooms[room.name].outposts[roomName].minersAssigned = 0;


                }

                let creeps = Object.values(Game.creeps).filter(c => c.memory.home === room.name && c.memory.role === 'remoteMiner')

                for (let c of creeps) {
                    const assignedRoom = c.memory.assignedRoom
                    if (assignedRoom) {
                        MEMORY.rooms[room.name].outposts[assignedRoom].minersAssigned++;
                    }
                }
                for (let name of outpostNames) {
                    let outpost = MEMORY.rooms[room.name].outposts[name]

                    if (outpost.minersAssigned < outpost.minersReq) {
                        creep.memory.assignedRoom = name
                        break;
                    }
                }

            }
        }

        task = getRoleTasks.remoteMiner(room, creep)

    } else if (role === 'remoteBuilder') {
        let outpostNames = room.memory.outposts;

        if (!outpostNames) {
            task = parkTask(room, creep);
        } else {

            let assignedRoom = creep.memory.assignedRoom
            if (!assignedRoom) {
                for (let roomName of outpostNames) {
                    if (MEMORY.rooms[room.name].outposts[roomName] && MEMORY.rooms[room.name].outposts[roomName].constructionComplete === false) {
                        creep.memory.assignedRoom = roomName
                        assignedRoom = roomName
                        break;
                    }
                }
            }
            if (!assignedRoom) {
                task = parkTask(creep.room, creep);
            } else {
                task = getRoleTasks.remoteBuilder(creep.room, creep)
                if (!task) {
                    creep.memory.assignedRoom = undefined;

                }

            }
        }
    } else if (role === 'remoteHauler') {

        if (creep.store.getFreeCapacity() === 0) {
            if (creep.room.name !== creep.memory.home) {
                task = new MoveToRoomTask(creep.memory.home)
            } else {
                // Return to storage
                task = new TransferTask(room.storage.id, RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY))
                creep.memory.assignedRoom = undefined;
            }
        } else {

            if (!creep.memory.assignedRoom) {

                // find fullest room.
                let maxEnergy = 0;
                let targetRoomName = undefined;
                for (let outpostName of room.memory.outposts) {

                    let outpost = Game.rooms[outpostName];

                    if (!outpost) {
                        continue;
                    }
                    let energy = 0;
                    const structures = outpost.find(FIND_STRUCTURES);
                    const dropped = outpost.find(FIND_DROPPED_RESOURCES);
                    const tombstones = outpost.find(FIND_TOMBSTONES)
                    for (let s of structures) {
                        if (s.structureType === STRUCTURE_CONTAINER) {
                            energy += s.forecast(RESOURCE_ENERGY);
                        }
                    }

                    for (let d of dropped) {
                        energy += d.forecast(RESOURCE_ENERGY);
                    }

                    for (let t of tombstones) {
                        energy += t.forecast(RESOURCE_ENERGY);
                    }

                    if (energy > maxEnergy) {
                        maxEnergy = energy;
                        targetRoomName = outpostName;
                    }

                }

                creep.memory.assignedRoom = targetRoomName;


            }

            let targetRoom = creep.memory.assignedRoom;
            if (creep.room.name !== targetRoom) {
                task = new MoveToRoomTask(targetRoom)
            } else {
                let availableTasks = getRoleTasks.remoteHauler(creep.room, creep)
                if (availableTasks.length === 0) {
                    creep.memory.assignedRoom = undefined;
                }

                let maxQty = 0;


                for (const t of availableTasks) {

                    
                    if (t.qty > maxQty) {
                        maxQty = t.qty;
                        task = t;
                    };

                };
            }
            console.log('Assigned task', JSON.stringify(task))

        }

        if (!task) {
            task = parkTask(room, creep)
        }

    } else if (role === 'remoteMaintainer') {

        if (!creep.memory.assignedRoom) {
            let outpostNames = room.memory.outposts
            let min = Infinity;
            let targetRoom = undefined;

            for (let outpostName of outpostNames) {
                let lastMaintained = MEMORY.rooms[room.name].outposts[outpostName].lastMaintained
                if (lastMaintained < min) {
                    targetRoom = outpostName;
                    min = lastMaintained;
                }
            }
            creep.memory.assignedRoom = targetRoom
            MEMORY.rooms[room.name].outposts[targetRoom].lastMaintained = Game.time;
        }

        let assignedRoom = creep.memory.assignedRoom
        if (creep.room.name !== assignedRoom) {
            task = new MoveToRoomTask(assignedRoom)
        }else{
            let availableTasks = getRoleTasks.maintainer(creep.room,creep);

            if(availableTasks.length === 0){
                creep.memory.assignedRoom = undefined;
            }

            let minDistance = Infinity;

            for (const t of availableTasks) {
    
                let object = Game.getObjectById(t.id);
    
                const distance = creep.pos.getRangeTo(object);
                if (distance < minDistance) {
                    minDistance = distance;
                    task = t;
                };
    
            };
    
            if (task === undefined) {
                task = parkTask(creep.room, creep);

            }
        }



    }



    if (!task) {
        return;
    }

    MEMORY.rooms[room.name].creeps[creep.name].task = task;
    creep.say(task.type)

}

/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 */
function executeTask(room, creep) {
    const task = MEMORY.rooms[room.name].creeps[creep.name].task
    if (!task) {
        MEMORY.rooms[room.name].creeps[creep.name].moving = false;
        return false
    }

    let target = undefined;

    if (task.id) {
        target = Game.getObjectById(task.id)
    }

    switch (task.type) {

        case 'BUILD':

            if (creep.build(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

        case 'HARVEST':

            if (creep.harvest(target) != 0 && creep.pos.getRangeTo(target) > 1) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

        case 'MOVE':

            const x = task.pos.x;
            const y = task.pos.y;

            if (x != creep.pos.x || y != creep.pos.y) {

                moveCreep(creep, task.pos, 0, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;
        case 'MOVE_TO_ROOM':
            try{
            moveCreepToRoom(creep, task.roomName)
            } catch (e){
                console.log(creep.name,'failed to move to room',task.roomName)
            }

            break;
        case 'PICKUP':

            if (creep.pickup(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };
            break;

        case 'REPAIR':

            if (creep.repair(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;
        case 'SIGN':

            if (creep.signController(target, task.text) !== 0) {
                moveCreep(creep, target.pos, 1, 1);
            } else {

                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
            };

            break;

        case 'TRANSFER':

            if (creep.transfer(target, task.resourceType) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
                MEMORY.rooms[room.name].creeps[creep.name].task = undefined;

            };

            break;

        case 'UPGRADE':
            if (creep.upgradeController(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

        case 'WITHDRAW':
            if (creep.withdraw(target, task.resourceType) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

    };
};

/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 * @returns {MoveTask}
 */
function parkTask(room, creep) {

    let range = 0;
    let xStart = creep.pos.x;
    let yStart = creep.pos.y;

    while (range < 40) {
        for (let x = xStart - range; x <= xStart + range; x++) {
            for (let y = yStart - range; y <= yStart + range; y++) {

                if (x < 1 || x > 48 || y < 1 || y > 48) {
                    continue;
                }

                const pos = new RoomPosition(x, y, room.name);
                const look = pos.look(pos);
                let valid = true;
                for (let l of look) {

                    if (l.type === LOOK_STRUCTURES || l.type === LOOK_CONSTRUCTION_SITES) {
                        valid = false;
                        break;
                    } else if (l.type === LOOK_TERRAIN && l.terrain === 'wall') {
                        valid = false;
                        break;
                    } else if (l.type === LOOK_CREEPS && l.creep.name != creep.name) {
                        valid = false;
                    }

                }



                if (valid) {

                    if (range === 0) {
                        MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
                        return undefined;
                    }

                    return new MoveTask(pos);

                }

            }
        }
        range++;
    }

}

const getRoleTasks = {

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {Task[]}
     */
    builder: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room))
            }

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.build(room));

        };

        return tasks;
    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {Task[]}
     */
    filler: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.fill(room, creep));

        };

        return tasks;
    },

    hauler: function (room, creep) {

        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {
            tasks.push(...getTasks.haul(room, creep))
        }

        if (creep.store.getUsedCapacity() > 0) {
            tasks.push(...getTasks.deliver(room, creep))
        }

        return tasks;

    },

    hub: function (room, creep) {
        let storage = room.storage;
        if (!storage) {
            return undefined;
        }
        let pos = new RoomPosition(storage.pos.x - 1, storage.pos.y + 1, room.name);

        if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {
            return new MoveTask(pos);
        }

        const hubLink = Game.getObjectById(MEMORY.rooms[room.name].links.hub)
        let hubEnergyNeeded = 800 - hubLink.store[RESOURCE_ENERGY];
        if (hubEnergyNeeded > 0) {

            if (creep.store[RESOURCE_ENERGY] > 0) {
                return new TransferTask(hubLink.id, RESOURCE_ENERGY, Math.min(hubEnergyNeeded, creep.store[RESOURCE_ENERGY]))
            } else if (creep.store.getFreeCapacity() > 0 && storage.store[RESOURCE_ENERGY] > 0) {
                return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), storage.store[RESOURCE_ENERGY], hubEnergyNeeded))
            }


        }

        if (creep.store[RESOURCE_ENERGY] > 0) {
            return new TransferTask(storage.id, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY]);

        }

    },

    maintainer: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.repair(room));

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

                const container = s.getContainer();
                if (container && (creep.pos.x !== container.pos.x || creep.pos.y !== container.pos.y)) {
                    tasks.push(new MoveTask(container.pos));
                    return tasks;
                }
                tasks.push(new HarvestTask(s.id))
                break;
            }
        }
        return tasks;

    },

    remoteBuilder: function (room, creep) {
        const assignedRoom = creep.memory.assignedRoom

        console.log('RB', assignedRoom)

        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        } else {
            if (creep.pos.x === 0) {
                let pos = new RoomPosition(1, creep.pos.y, assignedRoom)

                return new MoveTask(pos)
            } else if (creep.pos.x === 49) {
                let pos = new RoomPosition(48, creep.pos.y, assignedRoom)
                return new MoveTask(pos)
            } else if (creep.pos.y === 0) {
                let pos = new RoomPosition(creep.pos.x, 1, assignedRoom)
                return new MoveTask(pos)
            } else if (creep.pos.y === 49) {
                let pos = new RoomPosition(creep.pos.x, 48, assignedRoom)
                return new MoveTask(pos)
            }

            let availableTasks = getRoleTasks.builder(creep.room, creep)
            console.log('rb2', JSON.stringify(availableTasks))

            let minDistance = Infinity;
            let task = undefined;
            for (const t of availableTasks) {

                let object = Game.getObjectById(t.id);

                const distance = creep.pos.getRangeTo(object);
                if (distance < minDistance) {
                    minDistance = distance;
                    task = t;
                };

            };
            console.log('rb3', JSON.stringify(task))
            return task;
        }

    },

    remoteHauler: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            
        }
        return tasks;
    },

    remoteMiner: function (room, creep) {
        const assignedRoom = creep.memory.assignedRoom
        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        }

        const sources = creep.room.find(FIND_SOURCES)
        for (let s of sources) {


            if (getAssignedCreeps(s.id).length > 0) {
                continue;
            }
            const container = s.getContainer();
            if (container && (creep.pos.x !== container.pos.x || creep.pos.y !== container.pos.y)) {
                return new MoveTask(container.pos);

            }
            console.log('Assigning HarvestTask to', creep.name, 'for', s.id)
            return new HarvestTask(s.id)

        }


    },

    scout: function (room, creep) {

        const controller = creep.room.controller;

        if (controller) {

            const sign = controller.sign;

            if (!sign || sign.username !== MEMORY.username) {
                return new SignTask(controller.id, 'RA was here.')
            }

        }

        // Find nearest room needing a scan update.

        let monitoredRooms = MEMORY.rooms[room.name].monitoredRooms
        if (monitoredRooms) {

            let targetScanRooms = [];

            for (let name of Object.keys(monitoredRooms)) {

                let data = monitoredRooms[name]

                if (data) {
                    targetScanRooms.push(name)
                }

            }



            // Find closest room.
            let minScanTime = Infinity;
            let minDistance = Infinity;
            let targetRoom = undefined;

            for (let r of targetScanRooms) {
                const lastScan = MEMORY.rooms[room.name].monitoredRooms[r].lastScan

                if (lastScan < minScanTime) {
                    targetRoom = r;
                    minScanTime = lastScan
                    minDistance = Game.map.getRoomLinearDistance(r, creep.room.name)
                    continue;
                }
                const distance = Game.map.getRoomLinearDistance(r, creep.room.name)
                if (lastScan === minScanTime && distance < minDistance) {
                    targetRoom = r;
                    minDistance = distance;
                }

            }


            if (targetRoom) {

                return new MoveToRoomTask(targetRoom)
            }


            return undefined;

        }

        return undefined;

    },

    upgrader: function (room, creep) {

        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.upgrade(room, creep));
        };

        return tasks;

    },

    wallBuilder: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room, creep, RESOURCE_ENERGY));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.wallBuild(room, creep));
        };

        return tasks;

    },

    worker: function (room, creep) {

        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
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


    build: function (room) {

        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        const structures = room.find(FIND_STRUCTURES);
        let tasks = [];
        for (let type of BUILD_PRIORITY) {
            if (tasks.length > 0) {
                return tasks;
            }
            for (let site of sites) {
                if (site.structureType === type) {
                    tasks.push(new BuildTask(site.id))
                }
            }
        };

        for (let s of structures) {
            if (s.structureType === STRUCTURE_RAMPART && s.hits < 5000) {
                tasks.push(new RepairTask(s.id))
            }
        }


        return tasks;

    },

    deliver: function (room, creep) {
        let tasks = [];
        if (room.storage) {
            for (let r of Object.keys(creep.store)) {
                tasks.push(new TransferTask(room.storage.id, r, creep.store[r]));
            };
        };
        return tasks;
    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {TransferTask[]}
     */
    fill: function (room, creep) {

        const structures = room.find(FIND_STRUCTURES);
        const heldEnergy = creep.store[RESOURCE_ENERGY];
        let tasks = [];
        let towers = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_TOWER) {
                towers.push(s)
            }

            if (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) {

                const forecast = s.forecast(RESOURCE_ENERGY);
                const capacity = s.store.getCapacity(RESOURCE_ENERGY);

                if (forecast < capacity) {

                    tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, Math.min(capacity - forecast, heldEnergy)));

                };

            };

        };

        if (tasks.length === 0) {
            for (let s of towers) {
                const forecast = s.forecast(RESOURCE_ENERGY);
                const capacity = s.store.getCapacity(RESOURCE_ENERGY);

                if (forecast < capacity - 40) {

                    tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, Math.min(capacity - forecast, heldEnergy)));

                };
            }
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
     * @param {Room} room 
     * @param {Creep} creep 
     */
    haul: function (room, creep) {

        const sources = room.find(FIND_SOURCES);
        const structures = room.find(FIND_STRUCTURES);
        const capacity = creep.store.getFreeCapacity();

        let tasks = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER) {

                for (let source of sources) {

                    if (s.pos.isNearTo(source) && s.store.getUsedCapacity() > 0) {

                        for (let r of Object.keys(s.store)) {
                            if (s.forecast(r) >= capacity)
                                tasks.push(new WithdrawTask(s.id, r, Math.min(capacity, s.store[r])));
                        };

                    };
                };
            };
        };


        if (tasks.length === 0) {
            const dropped = room.find(FIND_DROPPED_RESOURCES);
            const tombstones = room.find(FIND_TOMBSTONES);
            const ruins = room.find(FIND_RUINS);

            for (let r of dropped) {
                tasks.push(new PickupTask(r.id, Math.min(capacity, r.forecast(r.resourceType))))
            }

            for (let t of tombstones) {
                for (let r of Object.keys(t.store)) {
                    tasks.push(new WithdrawTask(t.id, r, Math.min(t.forecast(r), capacity)))
                }
            }
            for (let ruin of ruins) {
                for (let r of Object.keys(ruin.store)) {
                    tasks.push(new WithdrawTask(ruin.id, r, Math.min(ruin.forecast(r), capacity)))
                }
            }
        }

        return tasks;

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
            if (r.resourceType === resourceType && forecast > capacity) {

                tasks.push(new PickupTask(r.id, Math.min(forecast, capacity)));

            };
        };

        if (tasks.length === 0) {
            for (let r of dropped) {
                const forecast = r.forecast();
                if (r.resourceType === resourceType && forecast > 0) {

                    tasks.push(new PickupTask(r.id, Math.min(forecast, capacity)));

                };
            };
        }

        return tasks;

    },

    repair: function (room) {

        const structures = room.find(FIND_STRUCTURES);
        let tasks = [];


        for (let s of structures) {
            if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) {
                continue;
            }

            if (s.hits < s.hitsMax) {
                tasks.push(new RepairTask(s.id));
            }

        }

        return tasks;

    },

    upgrade: function (room) {

        const controller = room.controller;
        let tasks = [];

        tasks.push(new UpgradeTask(controller.id));

        return tasks;

    },

    wallBuild: function (room) {
        const structures = room.find(FIND_STRUCTURES)

        let task = undefined;
        let min = Infinity;

        for (let s of structures) {
            if ((s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) && s.hits < Math.min(s.hitsMax, min)) {

                task = new RepairTask(s.id);
                min = s.hits
            }
        }

        if (task) {
            let tasks = [task];

            return tasks;
        }

        return [];

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
        const ruins = room.find(FIND_RUINS)
        let tasks = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK) {

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

        for (let r of ruins) {
            const forecast = r.forecast(resourceType);
            if (forecast >= capacity) {
                tasks.push(new WithdrawTask(r.id, resourceType, Math.min(forecast, capacity)));
            }
        }

        if (tasks.length > 0) return tasks;

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {

                const forecast = s.forecast(resourceType);

                if (forecast > 0) {

                    tasks.push(new WithdrawTask(s.id, resourceType, forecast));

                };
            };

        };

        for (let t of tombstones) {

            const forecast = t.forecast(resourceType);
            if (forecast > 0) {
                tasks.push(new WithdrawTask(t.id, resourceType, forecast));
            };
        };

        return tasks;

    },

};



/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 * @returns {boolean}
 */
function validateTask(room, creep) {
    const task = MEMORY.rooms[room.name].creeps[creep.name].task

    if (!task) {

        return false
    }

    let target = undefined;

    if (task.id) {
        target = Game.getObjectById(task.id)
    }

    switch (task.type) {

        case 'BUILD':
            if (!target) {
                return false;
            };
            if (creep.store[RESOURCE_ENERGY] === 0) {
                return false;
            };

            break;

        case 'HARVEST':

            if (!target) {
                return false;
            }
            if ((creep.memory.role !== 'miner' && creep.memory.role !== 'remoteMiner') && (target.energy === 0 || creep.store.getFreeCapacity() === 0)) {
                return false;
            }

            break;

        case 'MOVE':
            const pos = new RoomPosition(task.pos.x, task.pos.y, creep.room.name)
            const x = pos.x;
            const y = pos.y;

            if (x === creep.pos.x && y === creep.pos.y) {
                return false;
            }

            let look = pos.lookFor(LOOK_CREEPS)

            if (look.length > 0) {
                return false
            }


            break;
        case 'MOVE_TO_ROOM':
            if(!MEMORY.rooms[creep.memory.home].creeps[creep.name].task.roomName){ return false;}
        
        if (MEMORY.rooms[creep.memory.home].creeps[creep.name].nextroom === creep.room.name
                && creep.pos.x != 0
                && creep.pos.x != 49
                && creep.pos.y != 0
                && creep.pos.y != 49) {

                MEMORY.rooms[creep.memory.home].creeps[creep.name].nextroom = undefined;
            }
            if (creep.room.name === task.roomName
                && creep.pos.x != 0
                && creep.pos.x != 49
                && creep.pos.y != 0
                && creep.pos.y != 49) {
                return false;
            }
            break;
        case 'PICKUP':
            if (!target) return false;
            if (creep.store.getFreeCapacity() === 0) {
                return false;
            }
            break;

        case 'REPAIR':
            if (!target) {
                return false;
            };
            if (target.hits === target.hitsMax || creep.store[RESOURCE_ENERGY] === 0) {
                return false;
            }
            break;
        case 'SIGN':
            if (!target) {
                return false;
            }
            if (target.sign && target.sign.username === MEMORY.username) {
                return false;
            }
            break;
        case 'TRANSFER':

            if (!target) {
                return false;
            }
            if (target.store.getFreeCapacity(task.resourceType) === 0 || creep.store[task.resourceType] === 0) {
                return false;
            }

            break;

        case 'UPGRADE':
            if (creep.store[RESOURCE_ENERGY] === 0) {
                return false
            }

            break;

        case 'WITHDRAW':
            if (!target) {
                return false;
            };

            if (creep.store.getFreeCapacity() === 0 || target.store[task.resourceType] < task.qty) {

                return false;
            };
            break;
    };

    return true;
}




module.exports = {
    manageCreeps,
    Task,
};