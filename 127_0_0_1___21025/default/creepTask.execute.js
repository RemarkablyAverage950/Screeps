let MEMORY = require('memory');
const { moveCreep } = require('pathfinder');

const DEBUG = 0;

/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 */
function executeTask(room, creep) {
    const task = MEMORY.creeps[creep.name].tasks[0]

    if (DEBUG) {
        console.log(creep.name, JSON.stringify(task))
        console.log('tasks:', JSON.stringify(MEMORY.creeps[creep.name].tasks))
    }
    let range;
    if (!task) {
        MEMORY.creeps[creep.name].moving = false;
        return false
    }

    let target = undefined;

    if (task.id) {
        target = Game.getObjectById(task.id)
    }
    if (DEBUG) {
        console.log('target', JSON.stringify(target))
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

                    MEMORY.creeps[creep.name].tasks[0].type = 'RANGED_ATTACK'
                    MEMORY.creeps[creep.name].moving = false;
                } else {

                    creep.moveTo(target)
                    MEMORY.creeps[creep.name].moving = true;
                }
            }
            if (range === 1 && creep.getActiveBodyparts(ATTACK)) {
                creep.attack(target)
                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;
            }

            break;

        case 'ATTACK_CONTROLLER':


            if (target.pos.getRangeTo(creep) > 1) {
                moveCreep(creep, target.pos, 1, 1)
            } else {
                creep.attackController(target)
                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;
            }

            break;

        case 'BUILD':

            if (creep.build(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };

            break;

        case 'CLAIM':
            if (creep.claimController(target) !== 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };
            break;
        case 'DISMANTLE':
            let ret = creep.dismantle(target)

            if (ret === -9) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };
            break;
        case 'HARVEST':

            if (creep.harvest(target) != 0 && creep.pos.getRangeTo(target) > 1) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };

            break;

        case 'HARVEST_DEPOSIT':
            if (creep.pos.getRangeTo(target) > 1) {
                moveCreep(creep, target.pos, 1, 1);
            } else if (!target.coolDown) {

                creep.harvest(target)
                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            }

            if (target.lastCooldown >= 125) {
                MEMORY.creeps[creep.name].renew = false;
            } else {
                MEMORY.creeps[creep.name].renew = true
            }

            break;

        case 'HEAL':
            if (creep.room.name !== target.pos.roomName) {
                moveCreep(creep, target.pos, 1, 16);
            }
            range = creep.pos.getRangeTo(target);

            if (range < 2) {
                creep.heal(target)
                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;
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


                MEMORY.creeps[creep.name].path = undefined;

            };

            break;
        case 'MOVE_TO_ROOM':

            moveCreepToRoom(creep, task.roomName, task.targetPos)

            break;
        case 'PICKUP':

            if (creep.pickup(target) != 0) {

                moveCreep(creep, target.pos, 1, 16);

            } else {

                MEMORY.creeps[creep.name].path = undefined;

            };
            break;

        case 'RANGED_ATTACK':
            let raRet = creep.rangedAttack(target)

            if (raRet !== 0) {
                moveCreep(creep, target.pos, 3, 1)
            } else {
                MEMORY.creeps[creep.name].moving = false;
            }

            break;

        case 'REPAIR':

            if (creep.repair(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };

            break;

        case 'RESERVE':
            if (creep.reserveController(target) != 0) {

                moveCreep(creep, target.pos, 1, 1);

            } else {

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };
            break;
        case 'SIGN':

            if (creep.signController(target, task.text) !== 0) {
                moveCreep(creep, target.pos, 1, 1);
            } else {

                MEMORY.creeps[creep.name].path = undefined;
            };

            break;

        case 'TRANSFER':

            if (creep.transfer(target, task.resourceType) != 0) {

                moveCreep(creep, target.pos, 1, 24);

            } else {

                MEMORY.creeps[creep.name].path = undefined;
                MEMORY.creeps[creep.name].tasks.shift();

            };

            break;

        case 'UPGRADE':
            if (creep.pos.getRangeTo(target) > 3) {
                moveCreep(creep, target.pos, 1, 1);
            } /*else if (creep.pos.lookFor(LOOK_STRUCTURES).length > 0) {
                MEMORY.creeps[creep.name].path = undefined;
                let range = 0;
                let xStart = creep.pos.x;
                let yStart = creep.pos.y;

                if (MEMORY.links && MEMORY.links.controllerLink) {
                    let cLink = Game.getObjectById(MEMORY.links.controllerLink)
                    xStart = cLink.pos.x;
                    yStart = cLink.pos.y;

                }

                let avoidPos = [];
                if (creep.memory.home === room.name && MEMORY.links) {
                    let spawnLink = Game.getObjectById(MEMORY.links.spawn)
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
                                    MEMORY.creeps[creep.name].moving = false;
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

                MEMORY.creeps[creep.name].moving = false;
                MEMORY.creeps[creep.name].path = undefined;

            };

            break;

        case 'WITHDRAW':
            let wRet = creep.withdraw(target, task.resourceType, Math.min(creep.store.getFreeCapacity(), target.store[task.resourceType], task.qty))

            if (wRet !== 0) {
                if (creep.pos.getRangeTo(target) > 1) {
                    moveCreep(creep, target.pos, 1, 16);
                }

            } else {
                MEMORY.creeps[creep.name].tasks.shift();
                MEMORY.creeps[creep.name].path = undefined;

            };

            break;

    };
};

module.exports = executeTask;