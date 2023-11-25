let MEMORY = require('memory')

const DEBUG = 1;

/**
 * 
 * @param {Room} room 
 * @param {Creep} creep 
 * @returns {boolean}
 */
function validateTask(room, creep) {
    const task = MEMORY.creeps[creep.name].tasks[0]
    if (DEBUG) {
        console.log('validating', creep.name, JSON.stringify(task))
    }
    if (!task || task === undefined) {

        return false
    }

    let role = creep.memory.role;

    if (role === 'remoteHauler' || role === 'remoteMiner' || role === 'reserver' || role === 'remoteMaintainer' || role === 'remoteBuilder') {
        let assignedRoom = creep.memory.assignedRoom;
        if (assignedRoom && MEMORY.outposts[assignedRoom] && MEMORY.outposts[assignedRoom].hostileOccupied) {

            if (creep.room.name !== creep.memory.home && (task.type !== 'MOVE_TO_ROOM' && task.roomName !== creep.memory.home)) {
                MEMORY.creeps[creep.name].tasks = [new MoveToRoomTask(creep.memory.home)]

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

            if (!target) { return false; }

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

module.exports = validateTask;