let MEMORY = require('memory');
const { moveCreep, moveCreepToRoom, getPath } = require('pathfinder');
const getAssignedCreeps = require('prototypes');
const helper = require('lib.helper');

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
    };
};

class ClaimTask extends Task {
    /**
 * @constructor
 * @param {string} id 
 */
    constructor(id) {
        super('CLAIM');
        this.id = id;
    };
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
    };
};

class HarvestDepositTask extends Task {
    /**
 * @constructor
 * @param {string} id 
 */
    constructor(id) {
        super('HARVEST_DEPOSIT');
        this.id = id;
    };
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
    };
};

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
    STRUCTURE_ROAD,
    STRUCTURE_CONTAINER,
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
];
/**
 * Assigns, validates, and executes tasks to individual creeps.
 * @param {Room} room 
 * @param {Creep[]} creeps 
 */
function manageCreeps(room, creeps) {
    let CPU_DEBUG = false;
    let mostCpuCreep = undefined;
    let mostCpu = 0;
    if (CPU_DEBUG) {
        console.log('Entering manageCreeps for', room.name)
    }


    for (const creep of creeps) {
        let startCpu = Game.cpu.getUsed()

        if (creep.room.name === 'W48S29') {
            console.log(creep.name, 'in room W48S29 with tasks')
            if (MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks) {
                console.log(JSON.stringify(MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks))
            } else {
                console.log('undefined')
            }
        }

        if (Game.cpu.bucket < 20) { return }
        if (creep.spawning) continue;
        let taskValid = false;

        while (!taskValid && MEMORY.rooms[room.name].creeps[creep.name] &&
            MEMORY.rooms[room.name].creeps[creep.name].tasks.length) {
            taskValid = validateTask(room, creep);
            if (!taskValid) {
                MEMORY.rooms[room.name].creeps[creep.name].tasks.shift();
            }
        }

        if (!taskValid) {
            MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
            assignTask(room, creep, creeps)

        }

        executeTask(room, creep);
        if (CPU_DEBUG) {
            let usedCpu = Game.cpu.getUsed() - startCpu
            if (usedCpu > mostCpu) {
                mostCpu = usedCpu
                mostCpuCreep = creep.name
            }
        }
    }
    if (CPU_DEBUG) {
        console.log(mostCpuCreep, 'used', mostCpu, 'CPU')
    }
}

/**
 * Assigns best task based on role.
 * @param {Room} room 
 * @param {Creep} creep 
 * @param {Creep[]}
 * @returns 
 */
function assignTask(room, creep, creeps) {

    const role = creep.memory.role;
    let availableTasks = []
    let task = undefined;


    if ((role === 'remoteHauler' || role === 'remoteMiner' || role === 'reserver' || role === 'remoteMaintainer' || role === 'remoteBuilder' || role === 'longHauler')) {
        let assignedRoom = creep.memory.assignedRoom;
        if (assignedRoom && MEMORY.rooms[room.name].outposts[assignedRoom] && MEMORY.rooms[room.name].outposts[assignedRoom].hostileOccupied) {

            if (creep.room.name != creep.memory.home) {
                MEMORY.rooms[room.name].creeps[creep.name].tasks.push(new MoveToRoomTask(room.name))
                creep.say('ESCAPE')
                return;
            } else {

                MEMORY.rooms[room.name].creeps[creep.name].tasks.push(helper.parkTask(room, creep))
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

        availableTasks = getRoleTasks.filler(room, creep, creeps)

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
            task = helper.parkTask(room, creep);
        }

    } else if (role === 'upgrader') {

        availableTasks = getRoleTasks.upgrader(room, creep);
        if (availableTasks.length === 1) {
            task = availableTasks[0]
        }
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
            task = helper.parkTask(room, creep);
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
            task = helper.parkTask(room, creep);
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
            task = helper.parkTask(room, creep);
        };
    } else if (role === 'hauler') {

        availableTasks = getRoleTasks.hauler(room, creep, creeps);
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
            task = helper.parkTask(room, creep);
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
            task = helper.parkTask(creep.room, creep);
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
                task = helper.parkTask(creep.room, creep);
            } else {
                task = getRoleTasks.remoteBuilder(creep.room, creep, creeps)


            }
        }
    } else if (role === 'remoteHauler') {
        task = getRoleTasks.remoteHauler(room, creep, creeps)
        /*if (creep.store.getUsedCapacity() === 0) {
            if (creep.room.name !== creep.memory.home) {
                task = new MoveToRoomTask(creep.memory.home)
            } else {
                // Return to storage
                if (room.storage) {
                    task = new TransferTask(room.storage.id, RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY))
                } else {
                    task = getTasks.fill(creep.room, creep)[0]
                }
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
        */
        if (!task) {
            task = helper.parkTask(creep.room, creep)
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
            if (!targetRoom) {
                return
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
                task = helper.parkTask(creep.room, creep);

            }
        }
    } else if (role === 'fastFiller') {

        task = getRoleTasks.fastFiller(room, creep)

    } else if (role === 'reserver') {
        task = getRoleTasks.reserver(room, creep)
    } else if (role === 'defender') {
        task = getRoleTasks.defender(room, creep)
    } else if (role === 'mineralMiner') {
        task = getRoleTasks.mineralMiner(room, creep);
    } else if (role === 'dismantler') {
        task = getRoleTasks.dismantler(creep);
    } else if (role === 'soldier') {
        task = getRoleTasks.soldier(creep);
    } else if (role === 'claimer') {
        task = getRoleTasks.claimer(creep);
    } else if (role === 'longHauler') {
        task = getRoleTasks.longHauler(creep.room, creep);
    } else if (role === 'depositMiner') {
        task = getRoleTasks.depositMiner(creep.room, creep);
    } else if (role === 'unclaimer') {
        task = getRoleTasks.unclaimer(room, creep);
    } else if (role === 'healer') {
        task = getRoleTasks.healer(room, creep);
    }



    if (!task) {
        return;
    }

    MEMORY.rooms[room.name].creeps[creep.name].tasks.push(task);
    creep.say(task.type)

}

/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 */
function executeTask(room, creep) {
    const task = MEMORY.rooms[room.name].creeps[creep.name].tasks[0]
    let range;
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

            if (creep.room.name !== target.pos.roomName) {
                moveCreep(creep, target.pos, 1, 16);
            }
            range = creep.pos.getRangeTo(target)


            if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL)) {
                creep.heal(creep)
            }
            if (creep.getActiveBodyparts(RANGED_ATTACK)) {
                creep.rangedAttack(target)


            }
            if (range > 1) {
                if (getPath(creep, creep.pos, target.pos, 1, 1, true, false, false, true)) {

                    MEMORY.rooms[room.name].creeps[creep.name].tasks[0].type = 'RANGED_ATTACK'
                    MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                } else {

                    creep.moveTo(target)
                    MEMORY.rooms[room.name].creeps[creep.name].moving = true;
                }
            }
            if (range === 1 && creep.getActiveBodyparts(ATTACK)) {
                creep.attack(target)
                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
            }

            break;

        case 'ATTACK_CONTROLLER':


            if (target.pos.getRangeTo(creep) > 1) {
                moveCreep(creep, target.pos, 1, 1)
            } else {
                creep.attackController(target)
                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
            }

            break;

        case 'BUILD':

            if (creep.build(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

        case 'CLAIM':
            if (creep.claimController(target) !== 0) {

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

        case 'HARVEST_DEPOSIT':
            if (creep.pos.getRangeTo(target) > 1) {
                moveCreep(creep, target.pos, 1, 1);
            } else if (!target.coolDown) {

                creep.harvest(target)
                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            }

            if (target.lastCooldown >= 125) {
                MEMORY.rooms[room.name].creeps[creep.name].renew = false;
            } else {
                MEMORY.rooms[room.name].creeps[creep.name].renew = true
            }

            break;

        case 'HEAL':
            if (creep.room.name !== target.pos.roomName) {
                moveCreep(creep, target.pos, 1, 16);
            }
            range = creep.pos.getRangeTo(target);

            if (range < 2) {
                creep.heal(target)
                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
            } else {
                creep.rangedHeal(target)
                creep.moveTo(target)
            }



            break;

        case 'MOVE':

            const x = task.pos.x;
            const y = task.pos.y;

            if (x != creep.pos.x || y != creep.pos.y) {

                moveCreep(creep, task.pos, 0, 1);

            } else {


                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;
        case 'MOVE_TO_ROOM':
            //try {
            moveCreepToRoom(creep, task.roomName, task.targetPos)
            //} catch (e) { console.log(creep.name, 'failed moveCreepToRoom', JSON.stringify(task)) }

            break;
        case 'PICKUP':

            if (creep.pickup(target) != 0) {

                moveCreep(creep, target.pos, 1, 16);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };
            break;

        case 'RANGED_ATTACK':
            let raRet = creep.rangedAttack(target)

            if (raRet !== 0) {
                moveCreep(creep, target.pos, 3, 1)
            } else {
                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
            }

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

                moveCreep(creep, target.pos, 1, 24);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
                MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks.shift();

            };

            break;

        case 'UPGRADE':
            if (creep.pos.getRangeTo(target) > 3) {
                moveCreep(creep, target.pos, 1, 1);
            } /*else if (creep.pos.lookFor(LOOK_STRUCTURES).length > 0) {
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;
                let range = 0;
                let xStart = creep.pos.x;
                let yStart = creep.pos.y;

                if (MEMORY.links && MEMORY.links.controllerLink) {
                    let cLink = Game.getObjectById(MEMORY.links.controllerLink)
                    xStart = cLink.pos.x;
                    yStart = cLink.pos.y;

                }

                let avoidPos = [];
                if (creep.memory.home === room.name && MEMORY.rooms[room.name].links) {
                    let spawnLink = Game.getObjectById(MEMORY.rooms[room.name].links.spawn)
                    if (spawnLink) {
                        let pos = spawnLink.pos
                        avoidPos.push([pos.x + 1, pos.y + 1])
                        avoidPos.push([pos.x + 1, pos.y - 1])
                        avoidPos.push([pos.x - 1, pos.y + 1])
                        avoidPos.push([pos.x - 1, pos.y - 1])

                    }
                }

                while (range < 7) {
                    for (let x = xStart - range; x <= xStart + range; x++) {
                        for (let y = yStart - range; y <= yStart + range; y++) {

                            if (x < 1 || x > 48 || y < 1 || y > 48) {
                                continue;
                            }
                            const pos = new RoomPosition(x, y, room.name);
                            if (target.pos.getRangeTo(pos) > 3) {
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

                                moveCreep(creep, pos, 0, 1);
                                return

                            }

                        }
                    }
                    range++;
                }
            }*/

            if (creep.upgradeController(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].moving = false;
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

        case 'WITHDRAW':
            let wRet = creep.withdraw(target, task.resourceType, Math.min(creep.store.getFreeCapacity(), target.store[task.resourceType], task.qty))
            
            if (wRet !== 0) {
                if (creep.pos.getRangeTo(target) > 1) {
                    moveCreep(creep, target.pos, 1, 16);
                }

            } else {

                MEMORY.rooms[room.name].creeps[creep.name].tasks.shift();
                MEMORY.rooms[room.name].creeps[creep.name].path = undefined;

            };

            break;

    };
};




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

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

            if (tasks.length === 0) {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));

            }
            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room))
            }

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.build(room, creep));

            if (tasks.length === 0) {
                if (creep.room.controller.my) {
                    tasks.push(...getTasks.upgrade(room))
                } else {
                    creep.memory.assignedRoom = undefined;
                }
            }

        };



        return tasks;
    },

    claimer: function (creep) {
        if (creep.room.name !== creep.memory.assignedRoom) {
            return new MoveToRoomTask(creep.memory.assignedRoom)
        }

        let controller = Game.rooms[creep.memory.assignedRoom].controller
        if (!controller) {
            return undefined;
        }

        if (!controller.my && controller.reservation && controller.reservation.username !== MEMORY.username) {
            return new AttackControllerTask(controller.id)
        }

        if (!controller.my) {
            return new ClaimTask(controller.id)
        }

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns 
     */
    defender: function (room, creep) {
        const assignedRoom = creep.memory.assignedRoom

        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        } else {
            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            let hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES)


            if (!hostiles.some(c => c.body.some(b => b.type === ATTACK || b.type === RANGED_ATTACK)) && creep.hits < creep.hitsMax) {
                return new HealTask(creep.id)
            }

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
                } else if (hostileStructures.length) {
                    let closest = _.min(hostileStructures, s => s.pos.getRangeTo(creep))
                    return new AttackTask(closest.id)
                } else {

                    if (MEMORY.rooms[creep.memory.home] && MEMORY.rooms[creep.memory.home].monitoredRooms && MEMORY.rooms[creep.memory.home].outposts.length) {
                        for (let rName of MEMORY.rooms[creep.memory.home].outposts) {
                            if (MEMORY.monitoredRooms[rName].occupied) {
                                creep.memory.assignedRoom = rName;
                                return new MoveToRoomTask(rName)
                            }
                        }
                    }


                    return helper.parkTask(creep.room, creep)
                }

            }

        }


    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {Task}
     */
    depositMiner: function (room, creep) {

        const homeRoomName = creep.memory.home
        const homeRoom = Game.rooms[homeRoomName]

        if (creep.room.name === homeRoomName) {

            if (creep.store.getUsedCapacity() > 0) {

                if (homeRoom.storage) {

                    for (let resource in creep.store) {
                        return new TransferTask(homeRoom.storage.id, resource, creep.store[resource])
                    }
                }
            } else if (creep.ticksToLive > 250) {
                return new MoveToRoomTask(creep.memory.assignedRoom)
            } else {

                if (creep.ticksToLive <= 250 && MEMORY.rooms[creep.memory.home].creeps[creep.name].renew) {
                    // Create a renew task and add it here
                } else {
                    MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
                }

            }
        } else {

            if (creep.store.getFreeCapacity() === 0 || creep.ticksToLive <= 250) {
                return new MoveToRoomTask(homeRoomName)

            } else if (creep.ticksToLive > 250 && creep.room.name !== creep.memory.assignedRoom) {
                return new MoveToRoomTask(creep.memory.assignedRoom)
            } else {
                deposit = room.find(FIND_DEPOSITS)[0]

                if (deposit) {
                    return new HarvestDepositTask(deposit.id)
                } else {
                    return new MoveToRoomTask(homeRoomName)
                }
            }

        }


        if (creep.ticksToLive <= 250 && MEMORY.rooms[creep.memory.home].creeps[creep.name].renew) {
            // Create a renew task and add it here
        } else {
            MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
        }



    },

    /**
     * 
     * @param {Creep} creep 
     * @returns {Task}
     */
    dismantler: function (creep) {
        let room = creep.room;

        if (room.name !== creep.memory.assignedRoom) {
            return new MoveToRoomTask(creep.memory.assignedRoom)
        } else {
            if (creep.room.controller && creep.room.controller.my) {
                creep.suicide()
            }
            let structures = creep.room.find(FIND_STRUCTURES)


            let ret;
            let path;
            let controller = creep.room.controller

            let spawn = creep.room.find(FIND_HOSTILE_SPAWNS)[0]

            if (spawn) {
                if (getPath(creep, creep.pos, spawn.pos, 1, 1, true, false, false, true)) {
                    ret = PathFinder.search(
                        spawn.pos, { pos: creep.pos, range: 1 },
                        {
                            // We need to set the defaults costs higher so that we
                            // can set the road cost lower in `roomCallback`
                            plainCost: 1,
                            swampCost: 1,
                            ignoreCreeps: true,

                            roomCallback: function (roomName) {

                                let room = Game.rooms[roomName];
                                // In this example `room` will always exist, but since 
                                // PathFinder supports searches which span multiple rooms 
                                // you should be careful!
                                if (!room) return;
                                let costs = new PathFinder.CostMatrix;
                                room.find(FIND_CREEPS).forEach(c => costs.set(c.pos.x, c.pos.y, 0xff))

                                room.find(FIND_STRUCTURES).forEach(function (struct) {
                                    if (struct.structureType === STRUCTURE_CONTROLLER) {
                                        costs.set(struct.pos.x, struct.pos.y, 0xff)

                                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                        struct.structureType !== STRUCTURE_ROAD) {
                                        // Can't walk through non-walkable buildings
                                        if (struct.structureType === STRUCTURE_WALL) {
                                            costs.set(struct.pos.x, struct.pos.y, 10)
                                        } else {
                                            costs.set(struct.pos.x, struct.pos.y, 5);
                                        }
                                    }
                                });

                                return costs;
                            },
                        }
                    );

                    if (!ret.incomplete) {

                        path = ret.path;
                        for (let i = 0; i < path.length; i++) {

                            if (!getPath(creep, creep.pos, path[i], 1, 1, true, false, false, true)) {

                                let targetPos = path[i];


                                let target = creep.room.lookForAt(LOOK_STRUCTURES, targetPos)[0]
                                if (target)

                                    return new DismantleTask(target.id)
                            }
                        }

                    }
                }
            }

            // getPath(creep = undefined, origin, destination, range, maxRooms, incomplete = false, avoidCreeps = false, allowedRooms = false, avoidAllCreeps = false)

            if (controller && getPath(creep, creep.pos, controller.pos, 1, 1, true, false, false, true)) {
                ret = PathFinder.search(
                    controller.pos, { pos: creep.pos, range: 1 },
                    {
                        // We need to set the defaults costs higher so that we
                        // can set the road cost lower in `roomCallback`
                        plainCost: 1,
                        swampCost: 1,
                        ignoreCreeps: true,

                        roomCallback: function (roomName) {

                            let room = Game.rooms[roomName];
                            // In this example `room` will always exist, but since 
                            // PathFinder supports searches which span multiple rooms 
                            // you should be careful!
                            if (!room) return;
                            let costs = new PathFinder.CostMatrix;
                            room.find(FIND_CREEPS).forEach(c => costs.set(c.pos.x, c.pos.y, 0xff))

                            room.find(FIND_STRUCTURES).forEach(function (struct) {
                                if (struct.structureType === STRUCTURE_CONTROLLER) {
                                    costs.set(struct.pos.x, struct.pos.y, 0xff)

                                } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                    struct.structureType !== STRUCTURE_ROAD) {
                                    // Can't walk through non-walkable buildings
                                    if (struct.structureType === STRUCTURE_WALL) {
                                        costs.set(struct.pos.x, struct.pos.y, 10)
                                    } else {
                                        costs.set(struct.pos.x, struct.pos.y, 5);
                                    }
                                }
                            });

                            return costs;
                        },
                    }
                );

                if (!ret.incomplete) {

                    path = ret.path;
                    for (let i = 0; i < path.length; i++) {

                        if (!getPath(creep, creep.pos, path[i], 1, 1, true, false, false, true)) {

                            let targetPos = path[i];


                            let target = creep.room.lookForAt(LOOK_STRUCTURES, targetPos)[0]
                            if (target)

                                return new DismantleTask(target.id)
                        }
                    }

                }
            }
            let storage = creep.room.storage


            if (storage && getPath(creep, creep.pos, storage.pos, 1, 1, true, false, false, true)) {
                ret = PathFinder.search(
                    storage.pos, { pos: creep.pos, range: 1 },
                    {
                        // We need to set the defaults costs higher so that we
                        // can set the road cost lower in `roomCallback`

                        plainCost: 2,
                        swampCost: 2,
                        ignoreCreeps: false,

                        roomCallback: function (roomName) {

                            let room = Game.rooms[roomName];
                            // In this example `room` will always exist, but since 
                            // PathFinder supports searches which span multiple rooms 
                            // you should be careful!
                            if (!room) return;
                            let costs = new PathFinder.CostMatrix;
                            room.find(FIND_CREEPS).forEach(c => costs.set(c.pos.x, c.pos.y, 0xff))
                            room.find(FIND_STRUCTURES).forEach(function (struct) {
                                if (struct.structureType === STRUCTURE_CONTROLLER) {
                                    costs.set(struct.pos.x, struct.pos.y, 0xff)

                                } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                    struct.structureType !== STRUCTURE_ROAD) {
                                    // Can't walk through non-walkable buildings
                                    if (struct.structureType === STRUCTURE_WALL) {
                                        costs.set(struct.pos.x, struct.pos.y, 15)
                                    } else {
                                        costs.set(struct.pos.x, struct.pos.y, 5);
                                    }
                                }
                            });


                            return costs;
                        },
                    }
                );

                if (!ret.incomplete) {

                    path = ret.path;
                    for (let i = 0; i < path.length; i++) {

                        if (!getPath(creep, creep.pos, path[i], 1, 1, true, false, false, true)) {

                            let targetPos = path[i];


                            let target = creep.room.lookForAt(LOOK_STRUCTURES, targetPos)[0]
                            if (target)

                                return new DismantleTask(target.id)
                        }
                    }

                }
            }





            // getPath(creep = undefined, origin, destination, range, maxRooms, incomplete = false, avoidCreeps = false, allowedRooms = false)


            let targets = [];
            let storeUsedStructures = [];
            for (let s of structures) {
                if (s.structureType === STRUCTURE_NUKER) {
                    targets.push(s)
                    continue;
                }
                if (s.structureType === STRUCTURE_CONTROLLER) {
                    continue;
                }

                if (s.store && (s.store[RESOURCE_ENERGY] > 0 || s.store.getUsedCapacity() > 0)) {
                    storeUsedStructures.push(s)
                    continue;
                }
                targets.push(s)
            }

            storeUsedStructures = storeUsedStructures.sort((a, b) =>
                (b.store.getUsedCapacity() || b.store[RESOURCE_ENERGY]) - (a.store.getUsedCapacity() || a.store[RESOURCE_ENERGY])
            )

            for (let s of storeUsedStructures) {
                if (getPath(creep, creep.pos, s.pos, 1, 1, true, false, false, true)) {
                    continue;
                }
                let rampart = targets.find(t => t.pos.x === s.pos.x && t.pos.y === s.pos.y && t.structureType === STRUCTURE_RAMPART)

                if (rampart) {

                    return new DismantleTask(rampart.id)
                }

            }


            targets = targets.sort((a, b) => b.pos.getRangeTo(creep) - a.pos.getRangeTo(creep))
            while (targets.length) {
                let target = targets.pop()
                if (!getPath(creep, creep.pos, target.pos, 1, 1, true, false, false, true)) {


                    return new DismantleTask(target.id)
                }
            }

            /*let dismantlers = creep.room.find(FIND_MY_CREEPS).filter(c => c.memory.role === 'dismantler')
            if (dismantlers.length > 1) {
                let targetDismantler = _.min(dismantlers, c => c.ticksToLive)
                if (targetDismantler) {
                    if(task.length(MEMORY.rooms[targetDismantler.memory.home].creeps[targetDismantler.name]))
                    return MEMORY.rooms[targetDismantler.memory.home].creeps[targetDismantler.name].tasks[0]
                }
            }*/
            //return helper.parkTask(creep.room, creep)
            let dismantlerTargets = [];
            console.log(creep.name, 'A')
            for (let mr of Object.values(MEMORY.monitoredRooms)) {
                if (mr.dismantleTarget && mr.roomName !== creep.room.name) {
                    dismantlerTargets.push(mr.roomName)
                }
            }
            console.log(creep.name, dismantlerTargets)
            if (dismantlerTargets.length) {
                let newTargetRoom = _.min(dismantlerTargets, name => Game.map.getRoomLinearDistance(creep.room.name, name))
                console.log(creep.name, newTargetRoom)
                if (newTargetRoom) {
                    creep.memory.assignedRoom = newTargetRoom;
                }
            } else { creep.suicide() }

        }


    },

    fastFiller: function (room, creep) {
        const creepName = creep.name;
        const fillerNumber = creepName[creepName.length - 1];
        let spawnLink = Game.getObjectById(MEMORY.rooms[room.name].links.spawn);
        let centerPos = undefined;
        if (spawnLink) {
            centerPos = spawnLink.pos;
        } else {
            const sources = room.find(FIND_SOURCES);
            const mineral = room.find(FIND_MINERALS)[0];
            let containers = room.find(FIND_STRUCTURES)
                .filter(s => s.structureType === STRUCTURE_CONTAINER
                    && !sources.some(source => s.pos.isNearTo(source))
                    && !s.pos.isNearTo(mineral))

            if (containers.length !== 2) {
                return;
            }
            let x = 0;
            for (let c of containers) {
                x += c.pos.x;
            }
            x /= 2;

            centerPos = new RoomPosition(x, containers[0].pos.y, room.name);
        }

        let pos = undefined;
        switch (fillerNumber) {
            case '0':
                pos = new RoomPosition(centerPos.x - 1, centerPos.y - 1, room.name)
                break;
            case '1':
                pos = new RoomPosition(centerPos.x + 1, centerPos.y - 1, room.name)
                break;
            case '2':
                pos = new RoomPosition(centerPos.x - 1, centerPos.y + 1, room.name)
                break;
            case '3':
                pos = new RoomPosition(centerPos.x + 1, centerPos.y + 1, room.name)
                break;
        }


        if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {

            return new MoveTask(pos)
        } else {
            MEMORY.rooms[room.name].creeps[creep.name].moving = false;
            let capacity = creep.store.getCapacity()
            const structures = room.find(FIND_STRUCTURES).filter(s => s.pos.isNearTo(creep) && s.structureType !== STRUCTURE_ROAD)
            let containers = []
            for (let s of structures) {
                if (s.structureType === STRUCTURE_CONTAINER) {
                    containers.push(s);
                    continue;
                }
                if ((s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {

                    if (creep.store[RESOURCE_ENERGY] === 0) {
                        if (spawnLink && spawnLink.store[RESOURCE_ENERGY] > 0 && spawnLink.forecast(RESOURCE_ENERGY) > 0) {
                            return new WithdrawTask(spawnLink.id, RESOURCE_ENERGY, capacity)
                        }

                        for (let _s of structures) {
                            if ((_s.structureType === STRUCTURE_CONTAINER) && _s.store[RESOURCE_ENERGY] > 0 && _s.forecast(RESOURCE_ENERGY) > 0) {
                                return new WithdrawTask(_s.id, RESOURCE_ENERGY, capacity)
                            }
                        }
                    } else {
                        return new TransferTask(s.id, RESOURCE_ENERGY, Math.min(s.store.getFreeCapacity(RESOURCE_ENERGY), creep.store[RESOURCE_ENERGY]))
                    }
                }
            }

            if (creep.store.getFreeCapacity() > 0) {

                if (spawnLink && spawnLink.store[RESOURCE_ENERGY] > 0 && spawnLink.forecast(RESOURCE_ENERGY) > 0) {

                    return new WithdrawTask(spawnLink.id, RESOURCE_ENERGY, capacity)
                }
            }

            if (creep.store[RESOURCE_ENERGY] > 0) {
                for (let c of containers) {

                    if (c.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {

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
     * @param {Creep[]} creeps
     * @returns {Task[]}
     */
    filler: function (room, creep, creeps) {


        let tasks = [];

        let fillTasks = getTasks.fill(room, creep)

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...fillTasks);

        }
        ;
        if (creep.store.getFreeCapacity() > 0) {



            if (room.storage && room.storage.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity()) {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
                tasks.push(new WithdrawTask(room.storage.id, RESOURCE_ENERGY, creep.store.getFreeCapacity()))
            } else {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

                if (tasks.length === 0) {
                    tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                    tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));
                }

            }
        }




        return tasks;
    },

    hauler: function (room, creep, creeps) {

        let tasks = [];
        tasks.push(...getTasks.lab(room, creep))

        if (tasks.length > 0) {
            return tasks;
        }
        if (creep.store.getFreeCapacity() > 0) {
            tasks.push(...getTasks.haul(room, creep))
        }

        if (creep.store.getUsedCapacity() > 0) {
            tasks.push(...getTasks.deliver(room, creep, creeps))
        }
        if (tasks.length === 0) {

        }



        return tasks;

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     */
    healer: function (room, creep) {

        let healTargets = creep.room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax)
        if (healTargets.length) {
            let closest = _.min(healTargets, c => c.pos.getRangeTo(creep))
            if (closest) {
                return new HealTask(closest.id)
            }
        }

        if (creep.room.name !== creep.memory.assignedRoom) {

            return new MoveToRoomTask(creep.memory.assignedRoom)
        }

        return helper.parkTask(creep.room, creep)

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns {Task}
     */
    hub: function (room, creep) {
        let storage = room.storage;
        let terminal = room.terminal;

        if (!storage) {
            return undefined;
        }
        let pos = new RoomPosition(storage.pos.x - 1, storage.pos.y + 1, room.name);

        if (creep.pos.x !== pos.x || creep.pos.y !== pos.y) {
            return new MoveTask(pos);
        }
        MEMORY.rooms[room.name].creeps[creep.name].moving = false;
        let creepCapacity = creep.store.getFreeCapacity()
        const hubLink = Game.getObjectById(MEMORY.rooms[room.name].links.hub)
        let hubEnergyNeeded = 800 - hubLink.store[RESOURCE_ENERGY];
        if (hubEnergyNeeded > 0 && (storage.store[RESOURCE_ENERGY] > 0 || (terminal && terminal.store[RESOURCE_ENERGY] > 0))) {

            if (creep.store.getUsedCapacity() > 0) {
                for (let r of Object.keys(creep.store)) {
                    if (r !== RESOURCE_ENERGY) {
                        return new TransferTask(storage.id, r, creep.store[r]);
                    }
                }
            }


            if (creep.store[RESOURCE_ENERGY] > 0) {
                return new TransferTask(hubLink.id, RESOURCE_ENERGY, Math.min(hubEnergyNeeded, creep.store[RESOURCE_ENERGY]))
            }
            let withdrawFromTerminal = false;
            if (terminal) {
                let storageQty = storage.store[RESOURCE_ENERGY]
                let terminalQty = terminal.store[RESOURCE_ENERGY]
                if (storageQty < 20000 + creepCapacity && terminalQty > 0) {
                    withdrawFromTerminal = true;
                } else if (storageQty + creepCapacity < 200000 && terminalQty - creepCapacity > 10000) {
                    withdrawFromTerminal = true;
                }

            }

            if (withdrawFromTerminal && creep.store.getFreeCapacity() > 0) {
                return new WithdrawTask(terminal.id, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), storage.store[RESOURCE_ENERGY], hubEnergyNeeded))
            } else if (!withdrawFromTerminal && creep.store.getFreeCapacity() > 0 && storage.store[RESOURCE_ENERGY] > 0) {
                return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), storage.store[RESOURCE_ENERGY], hubEnergyNeeded))
            }


        }

        let structures = room.find(FIND_MY_STRUCTURES)
        let ps = undefined;
        let nuker = undefined;

        for (let s of structures) {
            if (s.structureType === STRUCTURE_NUKER) {
                nuker = s;
            } else if (s.structureType === STRUCTURE_POWER_SPAWN) {
                ps = s;
            }
        }

        // Terminal managment
        // Goal, up to 100k energy, no more energy than storage has.
        // 2k of every other thing.
        if (terminal && storage) {


            let terminalQtyNeeded = 0;
            let storageQtyNeeded = 0;
            let psQtyNeeded = 0;
            let nukerQtyNeeded = 0;

            let storageQty = storage.store[RESOURCE_ENERGY]
            let terminalQty = terminal.store[RESOURCE_ENERGY]
            let psQty = 0;
            let nukerQty = 0;
            if (ps) {
                psQty = ps.store[RESOURCE_ENERGY]
            }
            if (nuker) {
                nukerQty = nuker.store[RESOURCE_ENERGY]
            }

            const storageFreeSpace = storage.store.getFreeCapacity()
            const terminalFreeSpace = terminal.store.getFreeCapacity()


            // Storage < 20k, terminal > 0
            if (storageQty < 20000 && terminalQty >= 0 && storageFreeSpace) { // se 5000 te 200

                storageQtyNeeded = Math.min(20000 - storageQty, terminalQty + creep.store[RESOURCE_ENERGY], storageFreeSpace); // Min(20000-5000 = 15000,200)
                // Storage < 200k, terminal > 10k
            }

            if (storageQty < 200000 && terminalQty >= 10000 && storageFreeSpace) { //se 50000 te 20000

                storageQtyNeeded = Math.min(200000 - storageQty, terminalQty - 10000 + creep.store[RESOURCE_ENERGY], storageFreeSpace);  // Min(200000-50000 = 150000, 10000)
                // storage > 20k, terminal < 10k
            } if (storageQty >= 20000 && terminalQty < 10000 && terminalFreeSpace) { // se 25000, te 2000

                terminalQtyNeeded = Math.min(10000 - terminalQty, creep.store[RESOURCE_ENERGY] + storageQty - 20000, terminalFreeSpace); // 
                // Storage > 200k, terminal < 100k
            } if (storageQty >= 200000 && terminalQty < 100000 && terminalFreeSpace) {

                terminalQtyNeeded = Math.min(100000 - terminalQty, creep.store[RESOURCE_ENERGY] + storageQty - 200000, terminalFreeSpace)

            } if (terminalQty >= 100000 && storageFreeSpace) {

                storageQtyNeeded = Math.min(terminalQty - 100000 + creep.store[RESOURCE_ENERGY], storageFreeSpace)

            } if (ps && psQty < 2500 && storageQty >= 200000) {

                psQtyNeeded = Math.min(5000 - psQty, storageQty - 200000 + creep.store[RESOURCE_ENERGY])

            } if (nuker && nukerQty < 300000 && storageQty >= 200000) {

                nukerQtyNeeded = Math.min(300000 - nukerQty, storageQty - 200000 + creep.store[RESOURCE_ENERGY])

            }




            if ((storageQtyNeeded || terminalQtyNeeded || psQtyNeeded || nukerQtyNeeded)) {

                if (creep.store.getUsedCapacity() > 0) {
                    for (let r in creep.store) {
                        if (r !== RESOURCE_ENERGY)

                            return new TransferTask(storage.id, r, creep.store[r]);

                    }
                }

                if (storageQtyNeeded) {

                    if (creep.store[RESOURCE_ENERGY]) {
                        return new TransferTask(storage.id, RESOURCE_ENERGY, Math.min(storageQtyNeeded, creep.store[RESOURCE_ENERGY]));
                    } else {
                        return new WithdrawTask(terminal.id, RESOURCE_ENERGY, Math.min(storageQtyNeeded, creepCapacity))
                    }

                } else if (psQtyNeeded) {

                    if (creep.store[RESOURCE_ENERGY]) {
                        return new TransferTask(ps.id, RESOURCE_ENERGY, Math.min(psQtyNeeded, creep.store[RESOURCE_ENERGY]));
                    } else {
                        return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(psQtyNeeded, creepCapacity))
                    }

                } else if (nukerQtyNeeded) {

                    if (creep.store[RESOURCE_ENERGY]) {
                        return new TransferTask(nuker.id, RESOURCE_ENERGY, Math.min(nukerQtyNeeded, creep.store[RESOURCE_ENERGY]));
                    } else {
                        return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(nukerQtyNeeded, creepCapacity))
                    }

                } else if (terminalQtyNeeded) {

                    if (creep.store[RESOURCE_ENERGY]) {
                        return new TransferTask(terminal.id, RESOURCE_ENERGY, Math.min(terminalQtyNeeded, creep.store[RESOURCE_ENERGY]));
                    } else {
                        return new WithdrawTask(storage.id, RESOURCE_ENERGY, Math.min(terminalQtyNeeded, creepCapacity))
                    }

                }

            }



            let TERMINAL_TARGET = 2000
            let STORAGE_TARGET = 10000



            for (let r of RESOURCES_ALL) {
                if (r === RESOURCE_ENERGY) {
                    continue;
                } else if (ps && r === RESOURCE_POWER && ps.store[r] < 50) {
                    psQty = ps.store[r]

                    psQtyNeeded = Math.min(100 - psQty, storage.store[r] + creep.store[r])
                    if (psQtyNeeded) {
                        if (creep.store[r]) {
                            return new TransferTask(ps.id, r, Math.min(psQtyNeeded, creep.store[r]));
                        } else {
                            return new WithdrawTask(storage.id, r, Math.min(psQtyNeeded, creepCapacity))
                        }
                    }

                } else if (nuker && r === RESOURCE_GHODIUM) {
                    nukerQty = nuker.store[r]
                    nukerQtyNeeded = Math.min(5000 - nukerQty, storage.store[r] + creep.store[r])
                    if (nukerQtyNeeded) {
                        if (creep.store[r]) {
                            return new TransferTask(nuker.id, r, Math.min(nukerQtyNeeded, creep.store[r]));
                        } else {
                            return new WithdrawTask(storage.id, r, Math.min(nukerQtyNeeded, creepCapacity))
                        }
                    }
                }



                storageQty = storage.store[r]
                terminalQty = terminal.store[r]




                if (storageQty < STORAGE_TARGET && terminalQty >= 0 && storageFreeSpace) {

                    storageQtyNeeded = Math.min(STORAGE_TARGET - storageQty, terminalQty + creep.store[r], storageFreeSpace)

                } if (storageQty >= STORAGE_TARGET && terminalQty < TERMINAL_TARGET && terminalFreeSpace) {

                    terminalQtyNeeded = Math.min(TERMINAL_TARGET - terminalQty, storageQty - STORAGE_TARGET + creep.store[r], terminalFreeSpace)

                } if (terminalQty > TERMINAL_TARGET && storageFreeSpace) {

                    storageQtyNeeded = Math.min(terminalQty - TERMINAL_TARGET + creep.store[r], storageFreeSpace)
                }


                if ((storageQtyNeeded || terminalQtyNeeded)) {
                    if (creep.store.getUsedCapacity() > 0) {
                        for (let resource in creep.store) {
                            if (resource !== r)

                                return new TransferTask(storage.id, resource, creep.store[resource]);

                        }
                    }

                    if (storageQtyNeeded) {

                        if (creep.store[r]) {
                            return new TransferTask(storage.id, r, Math.min(storageQtyNeeded, creep.store[r]));
                        } else {
                            return new WithdrawTask(terminal.id, r, Math.min(storageQtyNeeded, creepCapacity))
                        }

                    } else if (terminalQtyNeeded) {

                        if (creep.store[r]) {
                            return new TransferTask(terminal.id, r, Math.min(terminalQtyNeeded, creep.store[r]));
                        } else {
                            return new WithdrawTask(storage.id, r, Math.min(terminalQtyNeeded, creepCapacity))
                        }

                    }

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

    /**
     * 
     * @param {Room} room Room creep is in.
     * @param {Creep} creep 
     */
    longHauler: function (room, creep) {
        let myRooms = [];

        for (const roomName of Object.keys(Game.rooms)) {
            if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my && Game.rooms[roomName].storage && Game.rooms[roomName].storage.store.getFreeCapacity() >= 100000) {

                myRooms.push(roomName);
            }
        }

        const homeRoomName = _.min(myRooms, r => Game.map.findRoute(creep.room.name, r).length)
        const assignedRoomName = creep.memory.assignedRoom;

        if (creep.room.name === homeRoomName) {

            if (creep.store.getUsedCapacity() > 0) {

                let storage = room.storage

                for (let r of Object.keys(creep.store)) {

                    return new TransferTask(storage.id, r, creep.store[r])
                }
            } else {
                return new MoveToRoomTask(assignedRoomName)
            }

        } else {
            if (creep.store.getFreeCapacity() === 0) {


                let homeRoom = Game.rooms[homeRoomName]

                if (homeRoom.storage) {
                    for (let r of Object.keys(creep.store)) {

                        return new TransferTask(homeRoom.storage.id, r, creep.store[r])
                    }


                } else {
                    return new MoveToRoomTask(homeRoomName)
                }
            } else if (creep.room.name === assignedRoomName) {
                let resources;
                let structures;
                if (creep.room.controller && creep.room.controller.my) {
                    structures = room.find(FIND_HOSTILE_STRUCTURES)
                    resources = room.find(FIND_DROPPED_RESOURCES).filter(r => r.amount > creep.store.getFreeCapacity())


                } else {
                    structures = room.find(FIND_STRUCTURES).filter(s => {
                        let pos = s.pos
                        let rampart = room.find(FIND_STRUCTURES).filter(r => r.structureType === STRUCTURE_RAMPART && r.pos.x === pos.x && r.pos.y === pos.y)[0]
                        if (rampart) {
                            return false;
                        }
                        return true;
                    })
                    resources = room.find(FIND_DROPPED_RESOURCES).filter(r => r.amount > 100)
                }
                if (resources.length) {
                    resources = resources.sort((a, b) => a.forecast() - b.forecast())
                }
                while (resources.length) {
                    let r = resources.pop()
                    if (!getPath(creep, creep.pos, r.pos, 1, 1, true, false, false, true)) {

                        return new PickupTask(r.id, Math.min(creep.store.getFreeCapacity(), r.amount))
                    }
                }

                let storeStructures = [];
                for (let s of structures) {
                    if (s.structureType === STRUCTURE_NUKER) {
                        continue;
                    }
                    if (s.store) {
                        for (let r of Object.keys(s.store)) {
                            storeStructures.push(s)
                            break;
                        }

                    }

                }
                if (storeStructures.length === 0 && resources.length === 0) {
                    if (creep.store.getUsedCapacity() === 0) {
                        return helper.parkTask(creep.room, creep)
                    }
                    return new MoveToRoomTask(homeRoomName)
                }

                storeStructures = storeStructures.sort((a, b) => b.pos.getRangeTo(creep) - a.pos.getRangeTo(creep))
                while (storeStructures.length) {
                    let closest = storeStructures.pop()
                    if (!getPath(creep, creep.pos, closest.pos, 1, 1, true, false, false, true)) {
                        for (let r of Object.keys(closest.store)) {

                            return new WithdrawTask(closest.id, r, Math.min(closest.store[r], creep.store.getFreeCapacity()))
                        }

                    }
                }



            } else if (creep.store.getUsedCapacity > 0) {
                return new MoveToRoomTask(homeRoomName)
            } else {
                return new MoveToRoomTask(assignedRoomName)
            }


        }



    },

    maintainer: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > .5 * creep.store.getCapacity()) {

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

            if (tasks.length === 0) {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));
            }

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {


            tasks.push(...getTasks.repair(creep, room));

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
        let mineralContainer = undefined;
        for (let s of structures) {
            if (s.structureType === STRUCTURE_CONTAINER && s.pos.isNearTo(mineral)) {

                mineralContainer = s
                break;
            }
        }
        if (creep.pos.x !== mineralContainer.pos.x || creep.pos.y !== mineralContainer.pos.y) {
            return new MoveTask(mineralContainer.pos)
        } else if (mineralContainer.store.getFreeCapacity() > 50) {
            return new HarvestTask(mineral.id)
        }


    },

    remoteBuilder: function (room, creep, creeps) {
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
            let availableTasks = [];
            if (room.controller && room.controller.my)
                availableTasks = getRoleTasks.filler(creep.room, creep, creeps)
            if (availableTasks.length === 0) {
                availableTasks = getRoleTasks.builder(creep.room, creep)
            }

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


    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep
     * @param {Creep[]} 
     * @returns 
     */
    remoteHauler: function (room, creep, creeps) {

        let tasks = []
        let task = [];
        const homeRoomName = creep.memory.home
        const capacity = creep.store.getFreeCapacity()

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.deliver(room, creep, creeps))

            if (creep.room.name === homeRoomName) {
                if (tasks.length > 0) {
                    task = _.min(tasks, t => Game.getObjectById(t.id).pos.getRangeTo(creep))
                    return task;
                } else {
                    return helper.parkTask(room, creep)
                }
            }
        }

        if (capacity > 0) {


            // Get new assigned rooom
            const outpostsNames = Memory.rooms[homeRoomName].outposts;

            let pickUpTarget = undefined;
            let maxPickupQty = 0;

            let withdrawTarget = undefined;
            let maxWithdrawQty = 0;

            for (let outpostName of outpostsNames) {
                let outpostRoom = Game.rooms[outpostName]
                if (!outpostRoom) {

                    continue;
                }

                let distance = 0;

                let sources = undefined;
                if (MEMORY.rooms[homeRoomName].outposts[outpostName].sources) {
                    sources = Object.values(MEMORY.rooms[homeRoomName].outposts[outpostName].sources)
                }
                if (sources) {
                    for (let s of sources) {
                        distance += s.distance / sources.length
                    }
                }

                const dropped = outpostRoom.find(FIND_DROPPED_RESOURCES)

                for (let r of dropped) {
                    if (r.resourceType === RESOURCE_ENERGY) {
                        const forecast = r.forecast() + distance
                        if (forecast > maxPickupQty) {
                            pickUpTarget = r
                            maxPickupQty = forecast
                        }
                    }

                }

                const structures = outpostRoom.find(FIND_STRUCTURES)

                for (let s of structures) {
                    if (s.structureType === STRUCTURE_CONTAINER) {
                        const forecast = s.forecast(RESOURCE_ENERGY) + distance
                        if (forecast > maxWithdrawQty) {
                            withdrawTarget = s
                            maxWithdrawQty = forecast
                        }
                    }

                }

                const tombstones = outpostRoom.find(FIND_TOMBSTONES)

                for (let t of tombstones) {
                    const forecast = t.forecast(RESOURCE_ENERGY)
                    if (forecast > maxWithdrawQty) {
                        withdrawTarget = t
                        maxWithdrawQty = forecast
                    }
                }
            }


            if (pickUpTarget && withdrawTarget) {
                if (maxWithdrawQty > maxPickupQty) {
                    tasks.push(new WithdrawTask(withdrawTarget.id, RESOURCE_ENERGY, capacity))
                } else {
                    tasks.push(new PickupTask(pickUpTarget.id, capacity))
                }
            } else if (pickUpTarget) {
                tasks.push(new PickupTask(pickUpTarget.id, capacity))
            } else if (withdrawTarget) {
                tasks.push(new WithdrawTask(withdrawTarget.id, RESOURCE_ENERGY, capacity))
            }





        }

        if (tasks.length === 0) {
            if (creep.room.name !== homeRoomName) {
                return new MoveToRoomTask(homeRoomName)
            }
            return helper.parkTask(room, creep)
        }

        task = _.min(tasks, t => Game.getObjectById(t.id).pos.getRangeTo(creep))


        return task;
    },

    remoteMaintainer: function (room, creep) {
        let tasks = [];

        if (creep.store.getFreeCapacity() > .5 * creep.store.getCapacity()) {
            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

            if (tasks.length === 0) {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));
            }

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {


            tasks.push(...getTasks.repairRoads(room, creep));


        };

        if (tasks.length === 0) {
            try {
                tasks.push(...getTasks.dismantle(room, creep));
            } catch (e) { }
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
            && Memory.rooms[creep.memory.home].plans
            && Memory.rooms[creep.memory.home].plans[creep.room.name] &&

            Memory.rooms[creep.memory.home].plans[creep.room.name].some(p => p.x === container.pos.x && p.y === container.pos.y)) {
            return new RepairTask(container.id)
        }

        if (container && container.store.getFreeCapacity() > 0) {
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES).filter(d => d.pos.getRangeTo(creep) < 2 && d.resourceType === RESOURCE_ENERGY)

            if (dropped.length) {
                if (creep.store.getFreeCapacity()) {
                    return new PickupTask(dropped[0].id, Math.min(creep.store.getFreeCapacity(), dropped[0].amount))
                } else {
                    return new TransferTask(container.id, RESOURCE_ENERGY, Math.min(creep.store[RESOURCE_ENERGY], container.store.getFreeCapacity()))
                }

            }
        }

        return new HarvestTask(assignedSource.id)




    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns 
     */
    reserver: function (room, creep) {

        const assignedRoom = creep.memory.assignedRoom
        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        }
        if (!creep.room.controller) {
            return;
        }
        if (creep.room.controller.reservation && creep.room.controller.reservation.username !== MEMORY.username) {
            return new AttackControllerTask(creep.room.controller.id)
        } else if (creep.room.controller.owner && creep.room.controller.owner.username !== MEMORY.username) {
            return new AttackControllerTask(creep.room.controller.id)
        }
        return new ReserveTask(creep.room.controller.id)


    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns 
     */
    scout: function (room, creep) {
        if (Game.cpu.bucket < 100) {
            return undefined;
        }

        const controller = creep.room.controller;
        if (controller && !controller.safeMode) {
            let hostileSites = creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES).filter(s => s.pos.x !== creep.pos.x && s.pos.y !== creep.pos.y)

            if (hostileSites.length) {
                let closest = _.min(hostileSites, s => s.pos.getRangeTo(creep))
                if (!getPath(creep, creep.pos, closest.pos, 0, 1, true)) {

                    //console.log(creep.name, 'stomping enemy site at', JSON.stringify(closest.pos))
                    return new MoveTask(closest.pos)
                }
            }
        }

        if (controller && !getPath(creep, creep.pos, controller.pos, 1, 1, true)) {

            const sign = controller.sign;

            if (!sign || sign.username !== MEMORY.username) {
                return new SignTask(controller.id, 'RA was here.')
            }

        }


        let currentRoomName = creep.room.name;
        let homeRoomName = creep.memory.home;

        let neighbors = Object.values(Game.map.describeExits(currentRoomName))

        let availableNextRooms = []

        for (const neighborName of neighbors) {

            if (MEMORY.monitoredRooms[neighborName] && (Game.map.findExit(currentRoomName, neighborName) !== ERR_NO_PATH || Game.map.getRoomLinearDistance(homeRoomName, neighborName) < 11)) {
                availableNextRooms.push(neighborName)
            }

        }

        let roomsNeedingScan = availableNextRooms.filter(r => {
            if (!MEMORY.monitoredRooms[r]) {
                return false;
            }
            let lastScan = MEMORY.monitoredRooms[r].lastScan;
            let distance = Game.map.findRoute(homeRoomName, r).length;

            return Game.time - lastScan > (100 * distance)

        })

        if (roomsNeedingScan.length === 0) {
            roomsNeedingScan = availableNextRooms;
        }
        let min = Infinity;

        let nextTargets = []
        for (let neighborName of availableNextRooms) {
            let lastScanTime = MEMORY.monitoredRooms[neighborName].lastScan
            if (lastScanTime < min) {
                min = lastScanTime;

                nextTargets = [neighborName]
            } else if (lastScanTime === min) {
                nextTargets.push(neighborName)
            }
        }
        while (nextTargets.length) {
            let idx = Math.floor(Math.random() * (nextTargets.length - .001))

            let nextRoom = nextTargets[idx];

            let from = creep.pos;
            let to = new RoomPosition(25, 25, nextRoom);

            // Use `findRoute` to calculate a high-level plan for this path,
            // prioritizing highways and owned rooms

            route = Game.map.findRoute(from.roomName, to.roomName, {
                routeCallback(roomName) {
                    if (Game.map.getRoomStatus(roomName).status !== 'normal') return 0xff;
                    if (roomName === to.roomName) {
                        return 1;
                    }
                    let isMyRoom = Game.rooms[roomName] &&
                        Game.rooms[roomName].controller &&
                        Game.rooms[roomName].controller.my;
                    let scanData = MEMORY.monitoredRooms[roomName]

                    if (scanData && scanData.hostileTarget) {
                        if (scanData.towers) {
                            return 0xff;
                        }
                        return 10;
                    }

                    if (!scanData || scanData.hostileTarget === undefined || scanData.occupied) {
                        return 3;
                    }

                    let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) ||
                        (parsed[2] % 10 === 0);
                    if (isHighway || isMyRoom) {
                        return 1
                    }

                    return 2;
                }


            })


            if (!route.length) {
                nextTargets.splice(idx, 1);
                continue;
            }
            let allowedRooms = [creep.room.name, ...route.map(r => r.room)]
            //getPath(creep = undefined, origin, destination, range, maxRooms, incomplete = false, avoidCreeps = false, allowedRooms = false)
            if (getPath(creep, creep.pos, new RoomPosition(25, 25, nextRoom), 22, 16, true, false, allowedRooms)) {
                nextTargets.splice(idx, 1)
            } else if (nextRoom) {
                return new MoveToRoomTask(nextRoom)
            }
        }

    },

    /**
     * 
     * @param {Creep} creep 
     * @returns 
     */
    soldier: function (creep,) {
        const assignedRoom = creep.memory.assignedRoom

        let controller = creep.room.controller
        let searchRange = 50;
        if (creep.room.name !== assignedRoom) {
            searchRange = 4
        } if (creep.pos.x === 0) {
            return new MoveTask(new RoomPosition(1, creep.pos.y, creep.room.name))
        } else if (creep.pos.x === 49) {
            return new MoveTask(new RoomPosition(48, creep.pos.y, creep.room.name))
        } else if (creep.pos.y === 0) {
            return new MoveTask(new RoomPosition(creep.pos.x, 1, creep.room.name))
        } else if (creep.pos.y === 49) {
            return new MoveTask(new RoomPosition(creep.pos.x, 48, creep.room.name))
        }
        if ((creep.getActiveBodyparts(ATTACK) || creep.getActiveBodyparts(RANGED_ATTACK)) && (!controller || (controller && !controller.safeMode))) {

            let hostileStructures = [];
            let hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS)


            if (hostileCreeps.length) {
                hostileCreeps.sort((a, b) => b.pos.getRangeTo(creep) - a.pos.getRangeTo(creep))
            }
            //getPath(creep = undefined, origin, destination, range, maxRooms, incomplete = false, avoidCreeps = false, allowedRooms = false)
            while (hostileCreeps.length) {
                let targetCreep = hostileCreeps.pop()
                if (!getPath(creep, creep.pos, targetCreep.pos, 1, 1, true, false, false, true)) {
                    return new AttackTask(targetCreep.id)
                }
            }

            let invaderCore = creep.room.find(FIND_HOSTILE_STRUCTURES).find(h => h.structureType === STRUCTURE_INVADER_CORE)
            if (invaderCore) {
                return new AttackTask(invaderCore.id)
            }



            if (creep.room.name === creep.memory.assignedRoom && (!creep.room.controller || (creep.room.controller && !creep.room.controller.my))) {

                hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_TOWER)
                if (hostileStructures.length) {
                    hostileStructures = hostileStructures.sort((a, b) => b.pos.getRangeTo(creep) - a.pos.getRangeTo(creep))

                    for (let s of hostileStructures) {
                        let look = s.pos.lookFor(LOOK_STRUCTURES)
                        for (let lo of look) {
                            if (lo.structureType === STRUCTURE_RAMPART) {
                                s = lo;
                            }
                        }
                    }

                    while (hostileStructures.length) {
                        let targetStructure = hostileStructures.pop()

                        if (!getPath(creep, creep.pos, targetStructure.pos, 1, 1, true, false, false, true)) {
                            return new AttackTask(targetStructure.id)


                        } else if (!getPath(creep, creep.pos, targetStructure.pos, 3, 1, true, false, false, true)) {
                            return new RangedAttackTask(targetStructure.id)
                        }
                    }
                }

                hostileStructures = creep.room.find(FIND_STRUCTURES).filter(s =>
                    s.structureType !== STRUCTURE_ROAD
                    && s.structureType !== STRUCTURE_CONTAINER
                    && s.structureType !== STRUCTURE_CONTROLLER
                )
                if (hostileStructures.length) {
                    hostileStructures = hostileStructures.sort((a, b) => b.hits - a.hits)



                    while (hostileStructures.length) {
                        let targetStructure = hostileStructures.pop()
                        if (targetStructure.store && (targetStructure.store[RESOURCE_ENERGY] > 0 || targetStructure.store.getUsedCapacity() > 0)) {
                            continue;
                        }
                        if (!getPath(creep, creep.pos, targetStructure.pos, 1, 1, true, false, false, true)) {
                            return new AttackTask(targetStructure.id)
                        } else if (!getPath(creep, creep.pos, targetStructure.pos, 3, 1, true, false, false, true)) {
                            return new RangedAttackTask(targetStructure.id)
                        }
                    }
                }

            }
        }



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

        if (creep.room.name !== assignedRoom) {


            return new MoveToRoomTask(assignedRoom)
        }

        MEMORY.monitoredRooms[creep.room.name].occupied = false;

        return helper.parkTask(creep.room, creep)





    },

    unclaimer: function (room, creep) {

        const assignedRoom = creep.memory.assignedRoom
        if (creep.room.name !== assignedRoom) {

            return new MoveToRoomTask(assignedRoom)
        }
        if (!creep.room.controller) {
            return;
        }
        if (creep.room.controller.reservation && creep.room.controller.reservation.username !== MEMORY.username) {
            if (creep.room.controller.upgradeBlocked) {
                return helper.parkTask(creep.room, creep)
            }
            return new AttackControllerTask(creep.room.controller.id)
        } else if (creep.room.controller.owner && creep.room.controller.owner.username !== MEMORY.username) {
            if (creep.room.controller.upgradeBlocked) {
                return helper.parkTask(creep.room, creep)
            }
            return new AttackControllerTask(creep.room.controller.id)
        }
        return new ReserveTask(creep.room.controller.id)
    },

    upgrader: function (room, creep) {

        let tasks = [];
        let controllerLink = Game.getObjectById(MEMORY.rooms[room.name].links.controller)

        if (creep.store.getUsedCapacity() === 0) {
            if (!controllerLink) {

                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

                if (tasks.length === 0) {
                    tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                    tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));
                }
                if (tasks.length === 0) {
                    tasks.push(...getTasks.harvest(room));
                };
            } else {
                if (controllerLink.pos.getRangeTo(creep) > 1) {
                    // Find open position near link and move to it
                    let _x = controllerLink.pos.x
                    let _y = controllerLink.pos.y

                    for (let x = _x - 1; x <= _x + 1; x++) {
                        for (let y = _y - 1; y <= _y + 1; y++) {
                            if (x === 0 || x === 49 || y === 0 || y === 49) {
                                continue
                            }
                            let pos = new RoomPosition(x, y, creep.room.name)
                            let valid = true;
                            let look = pos.look()
                            for (let lo of look) {
                                if (lo.creep && lo.creep.name !== creep.name) {
                                    valid = false;
                                    break;
                                }
                                if (lo.structure && (lo.structure.structureType !== STRUCTURE_RAMPART && lo.structure.structureType !== STRUCTURE_ROAD)) {
                                    valid = false;
                                    break;
                                }
                                if (lo.terrain && lo.terrain === 'wall') {
                                    valid = false;
                                    break;
                                }
                            }

                            if (valid) {

                                return [new MoveTask(pos)]
                            }

                        }
                    }
                }

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

            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

            if (tasks.length === 0) {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));
            }

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room, creep, RESOURCE_ENERGY));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {

            tasks.push(...getTasks.wallBuild(room, creep));
        };

        return tasks;

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns 
     */
    worker: function (room, creep) {

        let tasks = [];

        if (creep.store.getFreeCapacity() > 0) {



            tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, true));
            tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, true));

            if (tasks.length === 0) {
                tasks.push(...getTasks.pickup(room, creep, RESOURCE_ENERGY, false));
                tasks.push(...getTasks.withdraw(room, creep, RESOURCE_ENERGY, false));
            }

            if (tasks.length === 0) {
                tasks.push(...getTasks.harvest(room));
            };

        };

        if (creep.store[RESOURCE_ENERGY] > 0) {
            if (room.controller.ticksToDowngrade < 2000) {
                tasks.push(...getTasks.upgrade(room, creep))
                return tasks;
            }
            tasks.push(...getTasks.fill(room, creep));
            if (tasks.length === 0) {
                tasks.push(...getTasks.build(room, creep));
            };
            if (tasks.length === 0) {
                tasks.push(...getTasks.upgrade(room, creep));
            };

        };

        return tasks;

    },




};

const getTasks = {


    build: function (room, creep) {

        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        const structures = room.find(FIND_STRUCTURES);
        let tasks = [];
        for (let s of structures) {
            if (s.structureType === STRUCTURE_RAMPART && s.hits < 15000) {
                tasks.push(new RepairTask(s.id))
            }
        }


        let targets = [];
        for (let type of BUILD_PRIORITY) {

            for (let site of sites) {
                if (site.structureType === type) {
                    targets.push(site)
                }
            }

            if (targets.length > 0) {
                if (type === STRUCTURE_ROAD) {
                    let closest = _.min(targets, t => t.pos.getRangeTo(creep))

                    if (closest) {
                        return [new BuildTask(closest.id)]
                    }

                } else {

                    let maxProgress = _.max(targets, t => t.progress).progress
                    for (let t of targets) {
                        if (t.progress === maxProgress) {
                            tasks.push(new BuildTask(t.id))
                        }
                    }
                }

                return tasks;
            }

        };
        return tasks
    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @param {Creep[]} creeps 
     * @returns 
     */
    deliver: function (room, creep, creeps) {
        let tasks = [];
        if (room.storage) {
            if (creep.store[RESOURCE_ENERGY] > 0) {
                const sources = room.find(FIND_SOURCES)
                const mineral = room.find(FIND_MINERALS)[0]
                let containers = room.find(FIND_STRUCTURES)
                    .filter(s => s.structureType === STRUCTURE_CONTAINER
                        && !sources.some(source => s.pos.isNearTo(source))
                        && !s.pos.isNearTo(mineral))

                for (let s of containers) {

                    if (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && s.forecast(RESOURCE_ENERGY) + (.5 * creep.store[RESOURCE_ENERGY] <= 2000)) {
                        tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY]))
                    }
                }
            }
            if (tasks.length === 0) {

                for (let r of Object.keys(creep.store)) {
                    tasks.push(new TransferTask(room.storage.id, r, creep.store[r]));
                };
            }
        } else {
            if (creep.store[RESOURCE_ENERGY] > 0) {
                const sources = room.find(FIND_SOURCES)
                const mineral = room.find(FIND_MINERALS)[0]
                let containers = room.find(FIND_STRUCTURES)
                    .filter(s => s.structureType === STRUCTURE_CONTAINER
                        && !sources.some(source => s.pos.isNearTo(source))
                        && !s.pos.isNearTo(mineral))

                for (let s of containers) {

                    if (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && s.forecast(RESOURCE_ENERGY) < 2000) {
                        tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY]))
                    }
                }

                for (let c of creeps) {


                    if (c.pos.roomName === room.name && (c.memory.role === 'upgrader' || c.memory.role === 'worker' || c.memory.role === 'builder') && !MEMORY.rooms[room.name].creeps[c.name].moving && c.store[RESOURCE_ENERGY] < .8 * c.store.getCapacity()) {

                        tasks.push(new TransferTask(c.id, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY]))

                    }
                }

                let structures = room.find(FIND_STRUCTURES).filter(s => (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                for (let s of structures) {
                    if (s.forecast(RESOURCE_ENERGY) < s.store.getCapacity(RESOURCE_ENERGY)) {
                        tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, Math.min(creep.store[RESOURCE_ENERGY], s.store.getFreeCapacity(RESOURCE_ENERGY))))
                        break;
                    }
                }

            }
            else {
                for (let r in creep.store) {
                    creep.drop(r)
                    return []
                }
            }
        }
        return tasks;
    },

    dismantle: function (room, creep) {
        let tasks = [];
        if (!Memory.rooms[creep.memory.home].plans) {
            return tasks
        }
        let plans = Memory.rooms[creep.memory.home].plans[creep.room.name]
        if (!plans) {
            return;
        }
        let structures = room.find(FIND_STRUCTURES)
        for (let s of structures) {
            if (s.structureType === STRUCTURE_CONTROLLER) {
                continue;
            }
            if (!plans.some(p => p.x === s.pos.x && p.y === s.pos.y && p.structure === s.structureType)) {
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
        let structures = room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return ((structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            }
        });

        if (structures.length) {
            structures = structures.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep))
        }

        const heldEnergy = creep.store[RESOURCE_ENERGY];
        const tasks = [];

        for (let structure of structures) {
            const forecast = structure.forecast(RESOURCE_ENERGY);
            const capacity = structure.store.getCapacity(RESOURCE_ENERGY);

            if (forecast < capacity) {
                return [new TransferTask(structure.id, RESOURCE_ENERGY, heldEnergy)];
            }
        }

        if (tasks.length === 0) {
            const towers = room.find(FIND_MY_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_TOWER);
                }
            });
            if (towers.length) {
                let target = _.min(towers, (tower) => tower.energy);
                const forecast = target.forecast(RESOURCE_ENERGY);
                const capacity = target.store.getCapacity(RESOURCE_ENERGY);

                if (forecast < capacity - 40) {
                    tasks.push(new TransferTask(target.id, RESOURCE_ENERGY, heldEnergy));
                }
            }
        }

        if (tasks.length === 0) {
            let labs = room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_LAB)
            for (let lab of labs) {
                const freeCapacity = lab.store.getFreeCapacity(RESOURCE_ENERGY)
                if (freeCapacity > 0) {
                    tasks.push(new TransferTask(lab.id, RESOURCE_ENERGY, Math.min(heldEnergy, freeCapacity)))
                }
            }

        }


        /*if (tasks.length === 0) {
            let creeps = creep.room.find(FIND_MY_CREEPS).filter(c => (c.memory.role === 'upgrader' || c.memory.role === 'builder') && !MEMORY.rooms[c.memory.home].creeps[c.name].moving && c.store.getUsedCapacity() < .85 * c.store.getCapacity())
            if (creeps.length) {
                let target = _.max(creeps, c => c.store.getFreeCapacity());
                tasks.push(new TransferTask(target.id, RESOURCE_ENERGY, heldEnergy));
            }

        }*/

        return tasks;
        /*const structures = room.find(FIND_STRUCTURES);
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
 
                    tasks.push(new TransferTask(s.id, RESOURCE_ENERGY, heldEnergy));
 
                };
 
            };
 
        };
 
        if (tasks.length === 0 && towers.length) {
 
            let target = _.min(towers, t => t.forecast(RESOURCE_ENERGY))
            const forecast = target.forecast(RESOURCE_ENERGY);
            const capacity = target.store.getCapacity(RESOURCE_ENERGY);
 
            if (forecast < capacity - 40) {
 
                tasks.push(new TransferTask(target.id, RESOURCE_ENERGY, heldEnergy));
            }
 
 
        }
        return tasks;*/

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
        const tombstones = room.find(FIND_TOMBSTONES);

        let tasks = [];

        for (let t of tombstones) {


            for (let r of Object.keys(t.store)) {
                if (!room.storage && r !== RESOURCE_ENERGY) {
                    continue;
                }

                let forecast = t.forecast(r)
                if (forecast > 0) {

                    tasks.push(new WithdrawTask(t.id, r, Math.min(forecast, capacity)))
                }
            }

        }
        const dropped = room.find(FIND_DROPPED_RESOURCES);

        for (let r of dropped) {
            if (!room.storage && r !== RESOURCE_ENERGY) {
                continue;
            }
            let forecast = r.forecast()
            if (forecast >= capacity) {

                tasks.push(new PickupTask(r.id, Math.min(forecast, capacity)))
            }
        }

        if (tasks.length > 0) {
            return tasks;
        }

        for (let s of structures) {

            if (s.structureType === STRUCTURE_CONTAINER) {

                if (s.pos.isNearTo(mineral)) {

                    if (s.store.getUsedCapacity() > 0) {

                        for (let r of Object.keys(s.store)) {

                            tasks.push(new WithdrawTask(s.id, r, Math.min(capacity, s.store[r])));
                        }

                    }

                    continue;
                }

                let nearSource = false;
                for (let source of sources) {

                    if (s.pos.isNearTo(source) && s.store.getUsedCapacity() > 0) {
                        nearSource = true;
                        for (let r of Object.keys(s.store)) {

                            tasks.push(new WithdrawTask(s.id, r, Math.min(capacity, s.store[r])));
                        };

                    };
                }

                if (!nearSource) {
                    for (let r in s.store) {
                        if (r !== RESOURCE_ENERGY) {
                            tasks.push(new WithdrawTask(s.id, r, Math.min(capacity, s.store[r])));
                        }
                    }
                }

            };
        };

        for (let r of dropped) {
            if (!room.storage && r !== RESOURCE_ENERGY) {
                continue;
            }


            tasks.push(new PickupTask(r.id, Math.min(r.amount, capacity)))

        }


        const ruins = room.find(FIND_RUINS);


        for (let ruin of ruins) {
            if (!room.storage && r !== RESOURCE_ENERGY) {
                continue;
            }
            for (let r of Object.keys(ruin.store)) {

                tasks.push(new WithdrawTask(ruin.id, r, Math.min(ruin.store[r], capacity)))

            }
        }

        /*
        for (let t of tombstones) {
 
 
            for (let r of Object.keys(t.store)) {
                let forecast = t.forecast(r)
                if (forecast > 0) {
                    tasks.push(new WithdrawTask(t.id, r, Math.min(forecast, capacity)))
                }
            }
 
        }
        if (tasks.length > 0) {
            return tasks;
        }
 
 
 
        for (let s of structures) {
 
            if (s.structureType === STRUCTURE_CONTAINER) {
 
                if (s.pos.isNearTo(mineral)) {
 
                    if (s.store.getUsedCapacity() > capacity) {
 
                        for (let r of Object.keys(s.store)) {
 
                            return [new WithdrawTask(s.id, r, Math.min(capacity, s.store[r]))];
                        }
 
                    }
 
                    continue;
                }
 
 
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
 
        if (!room.storage) {
 
            return tasks;
        }
 
        const dropped = room.find(FIND_DROPPED_RESOURCES);
 
        const ruins = room.find(FIND_RUINS);
 
        for (let r of dropped) {
            let forecast = r.forecast()
            if (forecast > 0) {
 
                tasks.push(new PickupTask(r.id, Math.min(forecast, capacity)))
            }
        }
 
 
        for (let ruin of ruins) {
            for (let r of Object.keys(ruin.store)) {
                let forecast = ruin.forecast(r)
                if (forecast > 0) {
                    tasks.push(new WithdrawTask(ruin.id, r, Math.min(forecast, capacity)))
                }
            }
        }*/
        let max = 0;
        let returnTask = undefined;
        for (let task of tasks) {
            let forecast;
            if (task.type === 'WITHDRAW') {
                forecast = Game.getObjectById(task.id).forecast(task.resourceType)
            } else {
                forecast = Game.getObjectById(task.id).forecast(Game.getObjectById(task.id).resourceType)
            }
            if (forecast > max) {
                returnTask = task
                max = forecast
            }

        }
        if (returnTask) {
            return [returnTask]
        }

        return tasks;

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     */
    lab: function (room, creep) {

        if (!room.storage) {
            return []
        }
        if (!MEMORY.rooms[room.name].labs) {

            return [];
        }
        let tasks = []
        let reaction = MEMORY.rooms[room.name].labs.reaction
        if ((!reaction || reaction.complete)) {
            if (creep.store.getUsedCapacity() > 0) {
                for (let r of Object.keys(creep.store)) {
                    tasks.push(new TransferTask(room.storage.id, r, creep.store[r]))
                }
            }
            if (creep.store.getFreeCapacity() > 0) {
                for (let lab of room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_LAB)) {
                    let resource = lab.mineralType
                    if (!resource) {
                        continue;
                    }
                    if (lab.store[resource] > 0) {
                        tasks.push(new WithdrawTask(lab.id, resource, Math.min(creep.store.getFreeCapacity(), lab.store[resource])))
                    }
                }
            }

            return tasks;
        }
        let lab1 = Game.getObjectById(reaction.lab1)
        let lab2 = Game.getObjectById(reaction.lab2)
        let reagent1 = reaction.reagent1;
        let reagent2 = reaction.reagent2;

        if (!reaction.emptied) {

            if (creep.store.getFreeCapacity() === 0) {
                return []
            }
            let labs = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_LAB)
            for (let lab of labs) {
                let resource = lab.mineralType
                if (!resource) {
                    continue;
                }
                if (lab.id === lab1.id && resource === reagent1) {
                    continue;
                } else if (lab.id === lab2.id && resource === reagent2) {
                    continue;
                }

                if (resource) {
                    if (Object.keys(creep.store).some(r => r !== resource)) {
                        for (let r of Object.keys(creep.store)) {
                            return [new TransferTask(room.storage.id, r, creep.store[r])]
                        }
                    }
                    return [new WithdrawTask(lab.id, resource, Math.min(creep.store.getFreeCapacity(), lab.store[resource]))]
                }
            }
        }

        if (!reaction.loaded) {

            if (lab1.store[reagent1] < reaction.qty) {

                if (creep.store.getUsedCapacity() > 0) {

                    if (Object.keys(creep.store).some(r => r !== reagent1)) {
                        for (let r of Object.keys(creep.store)) {
                            if (r !== reagent1) {
                                return [new TransferTask(room.storage.id, r, creep.store[r])]
                            }
                        }
                    }
                    return [new TransferTask(lab1.id, reagent1, Math.min(reaction.qty - lab1.store[reagent1], creep.store[reagent1]))]

                } else {
                    return [new WithdrawTask(room.storage.id, reagent1, Math.min(reaction.qty - lab1.store[reagent1], creep.store.getFreeCapacity()))]
                }

            }
            if (lab2.store[reagent2] < reaction.qty) {

                if (creep.store.getUsedCapacity() > 0) {

                    if (Object.keys(creep.store).some(r => r !== reagent2)) {
                        for (let r of Object.keys(creep.store)) {
                            if (r !== reagent2) {
                                return [new TransferTask(room.storage.id, r, creep.store[r])]
                            }
                        }
                    }
                    return [new TransferTask(lab2.id, reagent2, Math.min(reaction.qty - lab2.store[reagent2], creep.store[reagent2]))]

                } else {
                    return [new WithdrawTask(room.storage.id, reagent2, Math.min(reaction.qty - lab2.store[reagent2], creep.store.getFreeCapacity()))]
                }

            }


        }

        return []

    },

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep
     * @param {ResourceConstant} resourceType 
     * @returns {PickupTask[]}
     */
    pickup: function (room, creep, resourceType, pickupCapacity) {

        const capacity = creep.store.getFreeCapacity()
        const dropped = room.find(FIND_DROPPED_RESOURCES);
        let tasks = [];

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

    repairRoads: function (room, creep) {

        const structures = room.find(FIND_STRUCTURES);
        let tasks = [];

        for (let s of structures) {

            if (s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax) {

                if (Memory.rooms[creep.memory.home].plans && Memory.rooms[creep.memory.home].plans[room.name] !== undefined && Memory.rooms[creep.memory.home].plans[room.name].some(p => p.x === s.pos.x && p.y === s.pos.y)) {
                    tasks.push(new RepairTask(s.id));
                }

            }

        }

        return tasks;

    },

    /**
     * 
     * @param {Creep} creep 
     * @param {Room} room 
     * @returns 
     */
    repair: function (creep, room) {

        const structures = room.find(FIND_STRUCTURES);
        let tasks = [];
        let body = creep.body


        let workPerRepair = 0

        for (let part of body) {
            if (part.type === WORK) {
                workPerRepair += 100
            }
        }

        for (let s of structures) {
            if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            if (s.hits < .75 * s.hitsMax) {
                return [new RepairTask(s.id)]
            }
            if (s.hits + workPerRepair <= s.hitsMax) {
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

    /**
     * 
     * @param {Room} room 
     * @param {Creep} creep 
     * @returns 
     */
    wallBuild: function (room, creep) {
        const structures = room.find(FIND_STRUCTURES)

        let task = undefined;
        let min = Infinity;

        for (let s of structures) {

            if ((s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) && s.hits < s.hitsMax) {

                let range = creep.pos.getRangeTo(s)
                let adjustedHits = s.hits + (range * 1000)

                if (adjustedHits < min) {
                    task = new RepairTask(s.id);
                    min = adjustedHits;
                }
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
    withdraw: function (room, creep, resourceType, withdrawCapacity) {


        const capacity = creep.store.getFreeCapacity();
        const structures = room.find(FIND_STRUCTURES);
        const tombstones = room.find(FIND_TOMBSTONES);
        const ruins = room.find(FIND_RUINS);
        let tasks = [];
        if (withdrawCapacity) {
            for (let s of structures) {

                if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {

                    const forecast = s.forecast(resourceType);

                    if (forecast >= capacity && s.store[resourceType] > 0) {

                        tasks.push(new WithdrawTask(s.id, resourceType, capacity));

                    };
                } else if (s.structureType === STRUCTURE_LINK && (creep.memory.role === 'upgrader' && s.id === MEMORY.rooms[room.name].links.controller) || (creep.memory.role === 'fastFiller' && s.id === MEMORY.rooms[room.name].links.spawn)) {

                    const forecast = s.forecast(resourceType);

                    if (forecast >= capacity && s.store[resourceType] > 0) {

                        tasks.push(new WithdrawTask(s.id, resourceType, capacity));

                    };
                }

            };

            for (let t of tombstones) {

                const forecast = t.forecast(resourceType);
                if (forecast >= capacity && t.store[resourceType] > 0) {
                    tasks.push(new WithdrawTask(t.id, resourceType, capacity));
                }
            }

            for (let r of ruins) {
                const forecast = r.forecast(resourceType);
                if (forecast >= capacity && r.store[resourceType] > 0) {
                    tasks.push(new WithdrawTask(r.id, resourceType, capacity));
                }
            }
        } else {


            for (let s of structures) {

                if (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) {

                    const forecast = s.forecast(resourceType);

                    if (s.store[resourceType] > 0 && forecast > 0) {

                        tasks.push(new WithdrawTask(s.id, resourceType, forecast));

                    };
                } else if (s.structureType === STRUCTURE_LINK && (creep.memory.role === 'upgrader' && s.id === MEMORY.rooms[room.name].links.controller) || (creep.memory.role === 'fastFiller' && s.id === MEMORY.rooms[room.name].links.spawn)) {


                    tasks.push(new WithdrawTask(s.id, resourceType, capacity));


                }

            };



            for (let t of tombstones) {

                const forecast = t.forecast(resourceType);
                if (forecast > 0 && t.store[resourceType] > 0) {
                    tasks.push(new WithdrawTask(t.id, resourceType, forecast));
                };
            };

            for (let r of ruins) {
                const forecast = r.forecast(resourceType);
                if (forecast > 0 && r.store[resourceType] > 0) {
                    tasks.push(new WithdrawTask(r.id, resourceType, Math.min(forecast, capacity)));
                }
            }



        }

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
    const task = MEMORY.rooms[room.name].creeps[creep.name].tasks[0]

    if (!task || task === undefined) {

        return false
    }

    let role = creep.memory.role;

    if (role === 'remoteHauler' || role === 'remoteMiner' || role === 'reserver' || role === 'remoteMaintainer' || role === 'remoteBuilder') {
        let assignedRoom = creep.memory.assignedRoom;
        if (assignedRoom && MEMORY.rooms[room.name].outposts[assignedRoom] && MEMORY.rooms[room.name].outposts[assignedRoom].hostileOccupied) {

            if (creep.room.name !== creep.memory.home && (task.type !== 'MOVE_TO_ROOM' && task.roomName !== creep.memory.home)) {
                MEMORY.rooms[room.name].creeps[creep.name].tasks = [new MoveToRoomTask(creep.memory.home)]

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
            if (!creep.getActiveBodyparts(ATTACK)) {
                return false;
            }
            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS).filter(c => c.pos.getRangeTo(creep) < 5)

            if (hostiles.length && target != _.min(hostiles, h => h.pos.getRangeTo(creep))) {
                return false;
            }

            break;

        case 'ATTACK_CONTROLLER':
            if (!target) {
                return false;
            }
            if (target.upgradeBlocked || ((!target.reservation || target.reservation.username === MEMORY.username) && (!target.owner || target.owner.username === MEMORY.username))) {
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
        case 'CLAIM':
            if (!target) {
                return false;
            }
            if (target.my) {
                return false;
            }
            break;
        case 'DISMANTLE':
            if (!target) {

                return false;
            }
            if (creep.memory.role === 'remoteMaintainer' && creep.store.getFreeCapacity() === 0) {

                //return false;
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

        case 'HARVEST_DEPOSIT':

            if (!target) {
                return false;
            }
            if (creep.store.getFreeCapacity() === 0) {
                return false;
            }
            if (creep.ticksToLive < 250) {
                return false;
            }

            break;

        case 'HEAL':
            if (!target) return false;
            if (target.hits === target.hitsMax) return false;
            if (target.id !== creep.id && creep.hits < creep.hitsMax && creep.hits < target.hits) return false;
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
                //return false
            }


            break;
        case 'MOVE_TO_ROOM':
            if (!MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks[0].roomName) { return false; }

            if (creep.room.name === MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks[0].roomName) {

                MEMORY.rooms[creep.memory.home].creeps[creep.name].path = [];
                MEMORY.rooms[creep.memory.home].creeps[creep.name].nextroom = undefined;
                return false;
            }

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

            if (target.amount === 0 || creep.store.getFreeCapacity() === 0) {
                return false;
            }
            break;

        case 'RANGED_ATTACK':
            if (!target) return false;

            if (!creep.getActiveBodyparts(RANGED_ATTACK)) return false;

            if (Game.time % 10 === 0) {
                return false;
            }

            break;

        case 'REPAIR':
            if (!target) {
                return false
            };
            if (target.hits === target.hitsMax || creep.store[RESOURCE_ENERGY] === 0) {
                return false;
            }
            if (creep.memory.role === 'builder') {
                if (target.hits > 30000) {
                    return false;
                }
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
            if (target.body && MEMORY.rooms[target.memory.home].creeps[target.name].moving) {
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

            if (creep.store.getFreeCapacity() === 0 || target.store[task.resourceType] === 0) {

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