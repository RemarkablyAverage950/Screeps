let roleTransporter = require('role.transporter');
let scoutData = require('expansionManager').scoutData;

let remoteTransporter = {
    run: function (creep) {
        if (creep.memory.needTask) {
            if (creep.memory.refill == true) {
                findWithdrawTarget(creep)
            } else {
                findTransferTarget(creep)
            }
        }
        manageCreepState(creep)
        if (creep.room.name != creep.memory.targetRoom) {
            moveToTargetRoom(creep)
        } else {
            roleTransporter.run(creep)
        }


    }
}

module.exports = remoteTransporter

function manageCreepState(creep) {
    if (creep.memory.refill && creep.store.getFreeCapacity() == 0) {
        creep.memory.refill = false
        creep.memory.needTask = true
        creep.memory.task = undefined
        creep.memory.target = undefined
        creep.memory.moving = false
    } else if (!creep.memory.refill && creep.store.getUsedCapacity() == 0) {
        creep.memory.refill = true
        creep.memory.needTask = true
        creep.memory.task = undefined
        creep.memory.target = undefined
        creep.memory.moving = false
    }
}

function findWithdrawTarget(creep) {
    // Get fullest outpost container
    let outposts = Memory.rooms[creep.memory.home].outposts
    let containers = []
    for (let outpost in outposts) {
        let room = Game.rooms[outpost]

        if (room) {
            let roomContainers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
            for (let container of roomContainers)
                containers.push(container)
        }
    }

    let target = _.max(containers, c => c.store.getUsedCapacity())
    creep.memory.target = target.id
    creep.memory.task = 'withdraw'
    creep.memory.needTask = false
    creep.memory.targetRoom = target.room.name
}

function findTransferTarget(creep) {
    // set target to homeroom storage, targetroom to homeroom
    let room = Game.rooms[creep.memory.home]
    let storage = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)[0]
    creep.memory.target = storage.id
    creep.memory.task = 'transfer'
    creep.memory.needTask = false
    creep.memory.targetRoom = storage.room.name
}

/**
 * 
 * @param {Creep} creep 
 * @returns {void}
 */
function moveToTargetRoom(creep) {
    let targetRoom = creep.memory.targetRoom
    if (!targetRoom) {
        return
    }
    let unsafeRooms = []
    const neighbors = scoutData[creep.memory.home].neighbors
    for (let neighbor in neighbors) {
        if (scoutData[creep.memory.home].neighbors[neighbor].safeToTravel == false) {
            unsafeRooms.push(neighbor)
        }
    }

    // find path to targetRoom that avoids all objects in unsafeRoom
    let route = Game.map.findRoute(creep.room.name, targetRoom, {
        maxOps: 600,
        routeCallback: (roomName) => {
            if (unsafeRooms.includes(roomName)) {
                return Infinity;
            }
            return 1;
        }
    });
    if (route.length > 0) {
        let ret = creep.moveTo(creep.pos.findClosestByPath(route[0].exit), { visualizePathStyle: { stroke: '#ffffff' } });
        if (ret == -2) {
            creep.memory.targetRoom = undefined
        }
    } else {
        console.log(`No safe path found from ${creep.room.name} to ${targetRoom}`);
    }
}