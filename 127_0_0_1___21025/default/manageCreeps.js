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

class AttackTask extends Task {
    constructor(id) {
        super('ATTACK');
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
    };
};

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
    };
};

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
        /*if(creep.name === 'W2N2_remoteHauler_0'){
            console.log('Task:',JSON.stringify(MEMORY.rooms[room.name].creeps[creep.name].task))
            console.log('Path:',MEMORY.rooms[room.name].creeps[creep.name].path)
        }*/

        if (creep.spawning) continue;

        const taskValid = validateTask(room, creep);

        if (!taskValid) {

            MEMORY.rooms[room.name].creeps[creep.name].task = undefined;
            MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
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


    if ((role === 'remoteHauler' || role === 'remoteMiner' || role === 'reserver' || role === 'remoteMaintainer' || role === 'remoteBuilder')) {
        let assignedRoom = creep.memory.assignedRoom;
        if (assignedRoom && MEMORY.rooms[room.name].outposts[assignedRoom] && MEMORY.rooms[room.name].outposts[assignedRoom].occupied) {

            if (creep.room.name != creep.memory.home) {
                MEMORY.rooms[room.name].creeps[creep.name].task = new MoveToRoomTask(room.name)
                creep.say('ESCAPE')
                return;
            } else {

                MEMORY.rooms[room.name].creeps[creep.name].task = parkTask(room, creep)
                return;

            }

        }

    }

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

        task = getRoleTasks.remoteMiner(room, creep)

    } else if (role === 'remoteBuilder') {
        let outpostNames = room.memory.outposts;

        if (!outpostNames) {
            task = parkTask(creep.room, creep);
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
            }
        } else {


            let targetRoom = creep.memory.assignedRoom;
            if (creep.room.name !== targetRoom) {
                task = new MoveToRoomTask(targetRoom)
            } else {
                let availableTasks = getRoleTasks.remoteHauler(creep.room, creep)
                let maxQty = 0;
                for (const t of availableTasks) {
                    if (t.qty > maxQty) {
                        maxQty = t.qty;
                        task = t;
                    };

                };
            }
        }

        if (!task) {
            task = parkTask(creep.room, creep)
        }

    } else if (role === 'remoteMaintainer') {

        if (!creep.memory.assignedRoom) {
            let outpostNames = room.memory.outposts
            let min = Infinity;
            let targetRoom = undefined;

            for (let outpostName of outpostNames) {
                let lastMaintained = 0
                if (MEMORY.rooms[room.name].outposts[outpostName])
                    lastMaintained = MEMORY.rooms[room.name].outposts[outpostName].lastMaintained
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
        } else {
            let availableTasks = getRoleTasks.remoteMaintainer(creep.room, creep);

            if (availableTasks.length === 0) {
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
    } else if (role === 'fastFiller') {

        task = getRoleTasks.fastFiller(room, creep)

    } else if (role === 'reserver') {
        task = getRoleTasks.reserver(room, creep)
    } else if (role === 'defender') {
        task = getRoleTasks.defender(room, creep)
    } else if (role === 'mineralMiner') {
        task = getRoleTasks.mineralMiner(room, creep)
    } else if (role === 'dismantler') {
        task = getRoleTasks.dismantler(creep)
    } else if (role === 'soldier') {
        task = getRoleTasks.soldier(creep)
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

        case 'ATTACK':

            let range = creep.pos.getRangeTo(target)
            let rangedAllowed = creep.body.some(p => p.type === RANGED_ATTACK)
            let meleeAllowed = creep.body.some(p => p.type === ATTACK)
            if (rangedAllowed && range > 1) {
                if (creep.rangedAttack(target) != 0) {

                    creep.moveTo(target)

                } else {

                    MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                    MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

                };
            } else if (meleeAllowed && range === 1) {
                creep.attack(target)
            } else { creep.moveTo(target) }
            break;



        case 'BUILD':

            if (creep.build(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;
        case 'DISMANTLE':
            let ret = creep.dismantle(target)

            if (ret === -9) {

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

        case 'HEAL':
            if (creep.heal(target) != 0) {

                creep.moveTo(target)

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
            moveCreepToRoom(creep, task.roomName)
            /*try {
               
            } catch (e) {
                console.log(creep.name, 'failed to move to room', task.roomName)
                console.log(JSON.stringify(task))
                console.log(e)
            }*/

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

        case 'RESERVE':
            if (creep.reserveController(target) != 0) {

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
            if (creep.withdraw(target, task.resourceType) !== 0) {
                if (creep.pos.getRangeTo(target) > 1) {
                    moveCreep(creep, target.pos, 1, 1);
                }

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

    let avoidPos = [];
    if (creep.memory.home === room.name) {
        let spawnLink = Game.getObjectById(MEMORY.rooms[room.name].links.spawn)
        if (spawnLink) {
            let pos = spawnLink.pos
            avoidPos.push([pos.x + 1, pos.y + 1])
            avoidPos.push([pos.x + 1, pos.y - 1])
            avoidPos.push([pos.x - 1, pos.y + 1])
            avoidPos.push([pos.x - 1, pos.y - 1])

        }
    }

    while (range < 40) {
        for (let x = xStart - range; x <= xStart + range; x++) {
            for (let y = yStart - range; y <= yStart + range; y++) {

                if (x < 1 || x > 48 || y < 1 || y > 48) {
                    continue;
                }
                let valid = true;
                if (avoidPos.length) {
                    for (let p of avoidPos) {
                        if (p.x === x && p.y === y) {
                            valid = false;
                            break;
                        }
                    }
                }
                if (!valid) {
                    continue;
                }

                const pos = new RoomPosition(x, y, room.name);

                const look = pos.look(pos);

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

    defender: function (room, creep) {
        const assignedRoom = creep.memory.assignedRoom

        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        } else {
            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)

            if (hostiles.length) {
                let closest = undefined;
                let min = Infinity;
                for (let h of hostiles) {
                    let range = h.pos.getRangeTo(creep)
                    if (range < min) {
                        min = range,
                            closest = h
                    }
                }
                return new AttackTask(closest.id)
            } else {

                let creeps = creep.room.find(FIND_MY_CREEPS)
                let closest = undefined;
                let min = Infinity;

                for (let c of creeps) {
                    if (c.hits < c.hitsMax) {
                        let range = c.pos.getRangeTo(creep)
                        if (range < min) {
                            min = range,
                                closest = c
                        }
                    }
                }

                if (closest) {
                    return new HealTask(closest.id)
                } else {
                    // console.log(JSON.stringify(MEMORY.rooms[creep.memory.home]))
                    if (MEMORY.rooms[creep.memory.home] && MEMORY.rooms[creep.memory.home].monitoredRooms) {
                        for (let rName of MEMORY.rooms[creep.memory.home].outposts) {
                            if (MEMORY.monitoredRooms[rName].occupied) {
                                creep.memory.assignedRoom = rName;
                                return new MoveToRoomTask(rName)
                            }
                        }
                    }


                    return parkTask(creep.room, creep)
                }

            }

        }


    },

    dismantler: function (creep) {
        let room = creep.room;
        if (room.name !== creep.memory.assignedRoom) {
            return new MoveToRoomTask(creep.memory.assignedRoom)
        } else {
            let targets = creep.room.find(FIND_HOSTILE_STRUCTURES)
            let target = _.min(targets, t => t.pos.getRangeTo(creep))
            return new DismantleTask(target.id)
        }


    },

    fastFiller: function (room, creep) {
        const creepName = creep.name;
        const fillerNumber = creepName[creepName.length - 1]
        let spawnLink = Game.getObjectById(MEMORY.rooms[room.name].links.spawn)


        let pos = undefined;
        switch (fillerNumber) {
            case '0':
                pos = new RoomPosition(spawnLink.pos.x - 1, spawnLink.pos.y - 1, room.name)
                break;
            case '1':
                pos = new RoomPosition(spawnLink.pos.x + 1, spawnLink.pos.y - 1, room.name)
                break;
            case '2':
                pos = new RoomPosition(spawnLink.pos.x - 1, spawnLink.pos.y + 1, room.name)
                break;
            case '3':
                pos = new RoomPosition(spawnLink.pos.x + 1, spawnLink.pos.y + 1, room.name)
                break;
        }

        if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {

            return new MoveTask(pos)
        } else {

            const structures = room.find(FIND_STRUCTURES).filter(s => s.pos.isNearTo(creep) && s.structureType !== STRUCTURE_ROAD)
            let containers = []
            for (let s of structures) {
                if (s.structureType === STRUCTURE_CONTAINER) {
                    containers.push(s);
                    continue;
                }
                if ((s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {

                    if (creep.store[RESOURCE_ENERGY] === 0) {
                        if (spawnLink.forecast(RESOURCE_ENERGY) >= 50) {
                            return new WithdrawTask(spawnLink.id, RESOURCE_ENERGY, 50)
                        }

                        for (let _s of structures) {
                            if ((_s.structureType === STRUCTURE_CONTAINER) && _s.forecast(RESOURCE_ENERGY) >= 50) {
                                return new WithdrawTask(_s.id, RESOURCE_ENERGY, 50)
                            }
                        }
                    } else {
                        return new TransferTask(s.id, RESOURCE_ENERGY, Math.min(s.store.getFreeCapacity(RESOURCE_ENERGY), creep.store[RESOURCE_ENERGY]))
                    }
                }
            }

            for (let c of containers) {

                if (c.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {

                    if (creep.store[RESOURCE_ENERGY] === 0) {

                        if (spawnLink.forecast(RESOURCE_ENERGY) >= 50) {

                            return new WithdrawTask(spawnLink.id, RESOURCE_ENERGY, 50)
                        }
                    } else {

                        return new TransferTask(c.id, RESOURCE_ENERGY, Math.min(c.store.getFreeCapacity(RESOURCE_ENERGY), creep.store[RESOURCE_ENERGY]))
                    }
                }

            }
            return undefined;

        }

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

            if (room.storage && room.storage.forecast(RESOURCE_ENERGY) > creep.store.getFreeCapacity()) {
                tasks.push(new WithdrawTask(room.storage.id, RESOURCE_ENERGY, creep.store.getFreeCapacity()))
            } else {
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
            }
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

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {Task}
     */
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

            if (creep.store.getUsedCapacity() > 0) {
                for (let r of Object.keys(creep.store)) {
                    if (r !== RESOURCE_ENERGY) {
                        return new TransferTask(storage.id, r, creep.store[r]);
                    }
                }
            }

            if (creep.store[RESOURCE_ENERGY] > 0) {
                return new TransferTask(hubLink.id, RESOURCE_ENERGY, Math.min(hubEnergyNeeded, creep.store[RESOURCE_ENERGY]))
            } else if (creep.store.getFreeCapacity() > 0 && storage.store[RESOURCE_ENERGY] > 0) {
                return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), storage.store[RESOURCE_ENERGY], hubEnergyNeeded))
            }


        }

        // Terminal managment
        // Goal, up to 100k energy, no more energy than storage has.
        // 2k of every other thing.
        let terminal = room.terminal
        if (terminal) {
            // Energy
            if (terminal.store[RESOURCE_ENERGY] > storage.store[RESOURCE_ENERGY]) {
                if (creep.store.getFreeCapacity() > 0) {
                    return new WithdrawTask(terminal.id, RESOURCE_ENERGY,
                        Math.min(creep.store.getFreeCapacity(), terminal.store[RESOURCE_ENERGY], terminal.store[RESOURCE_ENERGY] - storage.store[RESOURCE_ENERGY]))
                } else if (creep.store[RESOURCE_ENERGY] > 0) {
                    return new TransferTask(storage.id, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY])
                }
            } else if (terminal.store[RESOURCE_ENERGY] < 100000 && storage.store[RESOURCE_ENERGY] > 120000) {
                if (creep.store.getFreeCapacity() > 0) {
                    return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), 100000 - terminal.store[RESOURCE_ENERGY]))
                } else if (creep.store[RESOURCE_ENERGY] > 0) {
                    return new TransferTask(terminal.id, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY])
                }
            }

        }


        // Done at this point, return all resources to storage
        if (creep.store.getUsedCapacity() > 0) {
            for (let r of Object.keys(creep.store)) {
                return new TransferTask(storage.id, r, creep.store[r]);
            }
        }

    },

    maintainer: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > .5 * creep.store.getCapacity()) {

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

    mineralMiner: function (room, creep) {
        const mineral = room.find(FIND_MINERALS)[0]
        const structures = room.find(FIND_STRUCTURES)
        let targetPos
        for (let s of structures) {
            if (s.structureType === STRUCTURE_CONTAINER && s.pos.isNearTo(mineral)) {
                targetPos = s.pos;
                break;
            }
        }
        if (creep.pos.x !== targetPos.x || creep.pos.y !== targetPos.y) {
            return new MoveTask(targetPos)
        } else {
            return new HarvestTask(mineral.id)
        }


    },

    remoteBuilder: function (room, creep) {
        const assignedRoom = creep.memory.assignedRoom

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

    remoteMaintainer: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > .5 * creep.store.getCapacity()) {
            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {


            tasks.push(...getTasks.repairRoads(room, creep));

        };

        if (tasks.length === 0) {
            tasks.push(...getTasks.dismantle(room, creep));
        }

        return tasks;
    },

    remoteMiner: function (room, creep) {
        const assignedRoom = creep.memory.assignedRoom
        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        }


        let assignedSource = Game.getObjectById(creep.memory.assignedSource);


        const container = assignedSource.getContainer();
        if (container && (creep.pos.x !== container.pos.x || creep.pos.y !== container.pos.y)) {
            return new MoveTask(container.pos);

        }

        if (container
            && creep.store.getFreeCapacity() === 0
            && container.hits < container.hitsMax
            && Memory.rooms[creep.memory.home].plans[creep.room.name]
                .some(p => p.x === container.pos.x && p.y === container.pos.y)) {
            return new RepairTask(container.id)
        }

        return new HarvestTask(assignedSource.id)




    },

    reserver: function (room, creep) {

        const assignedRoom = creep.memory.assignedRoom
        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        }

        return new ReserveTask(creep.room.controller.id)


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

            for (let name of monitoredRooms) {

                let data = MEMORY.monitoredRooms[name]

                if (data) {
                    targetScanRooms.push(name)
                }

            }



            // Find closest room.
            let minScanTime = Infinity;
            let minDistance = Infinity;
            let targetRoom = undefined;

            for (let r of targetScanRooms) {
                const lastScan = MEMORY.monitoredRooms[r].lastScan

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

    soldier: function (creep,) {
        const assignedRoom = creep.memory.assignedRoom
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS).concat(creep.room.find(FIND_HOSTILE_STRUCTURES))
        if (hostiles.length) {
            let closest = undefined;
            let min = Infinity;
            for (let h of hostiles) {
                let range = h.pos.getRangeTo(creep)
                if (range < min) {
                    min = range,
                        closest = h
                }
            }
            return new AttackTask(closest.id)
        } else {

            let creeps = creep.room.find(FIND_MY_CREEPS)
            let closest = undefined;
            let min = Infinity;

            for (let c of creeps) {
                if (c.hits < c.hitsMax) {
                    let range = c.pos.getRangeTo(creep)
                    if (range < min) {
                        min = range,
                            closest = c
                    }
                }
            }

            if (closest) {
                return new HealTask(closest.id)
            }
        }
        if (creep.room.name !== assignedRoom) {
            return new MoveToRoomTask(assignedRoom)
        }

        MEMORY.monitoredRooms[creep.room.name].occupied = false;
        // console.log(JSON.stringify(MEMORY.rooms[creep.memory.home]))
        if (MEMORY.rooms[creep.memory.home] && MEMORY.rooms[creep.memory.home].monitoredRooms) {
            for (let rName of MEMORY.rooms[creep.memory.home].monitoredRooms) {
                if (MEMORY.monitoredRooms[rName].occupied) {
                    creep.memory.assignedRoom = rName;
                    return new MoveToRoomTask(rName)
                }
            }
        }


        return parkTask(creep.room, creep)





    },

    upgrader: function (room, creep) {

        let tasks = [];
        let controllerLink = Game.getObjectById(MEMORY.rooms[room.name].links.controller)

        if (creep.store.getUsedCapacity() === 0) {
            if (!controllerLink) {

                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY));
                if (tasks.length === 0) {
                    tasks.push(...getTasks.harvest(room));
                };
            } else {

                tasks.push(new WithdrawTask(controllerLink.id, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), controllerLink.store[RESOURCE_ENERGY])))
            }

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

    dismantle: function (room, creep) {
        let tasks = [];
        let plans = Memory.rooms[creep.memory.home].plans[creep.room.name]
        let structures = room.find(FIND_STRUCTURES)
        for (let s of structures) {
            if (s.structureType === STRUCTURE_CONTROLLER) {
                continue;
            }
            if (!plans.some(p => p.x === s.pos.x && p.y === s.pos.y)) {
                tasks.push(new DismantleTask(s.id))
            }
        }
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
        const mineral = room.find(FIND_MINERALS)[0];

        let tasks = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER) {

                for (let source of sources) {

                    if ((s.pos.isNearTo(source) || s.pos.isNearTo(mineral)) && s.store.getUsedCapacity() > 0) {

                        for (let r of Object.keys(s.store)) {
                            if (s.forecast(r) >= capacity)
                                tasks.push(new WithdrawTask(s.id, r, Math.min(capacity, s.store[r])));
                        };

                    };
                };
            };
        };



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

    repairRoads: function (room, creep) {

        const structures = room.find(FIND_STRUCTURES);
        let tasks = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax) {

                if (Memory.rooms[creep.memory.home].plans[room.name].some(p => p.x === s.pos.x && p.y === s.pos.y)) {
                    tasks.push(new RepairTask(s.id));
                }

            }

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
            if (s.hits < .5 * s.hitsMax) {
                return [new RepairTask(s.id)]
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

            if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {

                const forecast = s.forecast(resourceType);

                if (forecast >= capacity) {

                    tasks.push(new WithdrawTask(s.id, resourceType, Math.min(forecast, capacity)));

                };
            };

            if (s.structureType === STRUCTURE_LINK && (creep.memory.role === 'upgrader' && s.id === MEMORY.rooms[room.name].links.controller) || (creep.memory.role === 'fastFiller' && s.id === MEMORY.rooms[room.name].links.spawn)) {

                const forecast = s.forecast(resourceType);

                if (forecast >= capacity) {

                    tasks.push(new WithdrawTask(s.id, resourceType, Math.min(forecast, capacity)));

                };
            }

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

                if (forecast > 20) {

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

    let role = creep.memory.role;

    if (role === 'remoteHauler' || role === 'remoteMiner' || role === 'reserver' || role === 'remoteMaintainer' || role === 'remoteBuilder') {
        let assignedRoom = creep.memory.assignedRoom;
        if (assignedRoom && MEMORY.rooms[room.name].outposts[assignedRoom] && MEMORY.rooms[room.name].outposts[assignedRoom].occupied) {

            if (creep.room.name !== creep.memory.home && (task.type !== 'MOVE_TO_ROOM' && task.roomName !== creep.memory.home)) {
                MEMORY.rooms[room.name].creeps[creep.name].task = new MoveToRoomTask(creep.memory.home)

                return true;
            }

        }

    }

    let target = undefined;

    if (task.id) {
        target = Game.getObjectById(task.id)
    }

    switch (task.type) {

        case 'ATTACK':
            if (!target) {
                return false;
            }
            break;

        case 'BUILD':
            if (!target) {
                return false;
            };
            if (creep.store[RESOURCE_ENERGY] === 0) {
                return false;
            };

            break;

        case 'DISMANTLE':
            if (!target) {
                console.log(creep.name, 'no target')
                return false;
            }
            if (creep.memory.role === 'remoteMaintainer' && creep.store.getFreeCapacity() === 0) {
                console.log(creep.name, 'B')
                return false;
            }
            break;
        case 'HARVEST':

            if (!target) {
                return false;
            }
            if (Game.time % 20 === 0 && creep.memory.role === 'remoteMiner' && creep.store.getFreeCapacity() === 0) {

                return false;

            }

            if ((creep.memory.role !== 'miner' && creep.memory.role !== 'remoteMiner') && (target.energy === 0 || creep.store.getFreeCapacity() === 0)) {
                return false;
            }

            break;
        case 'HEAL':
            if (!target) return false;
            if (target.hits === target.hitsMax) return false;
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
            if (!MEMORY.rooms[creep.memory.home].creeps[creep.name].task.roomName) { return false; }

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