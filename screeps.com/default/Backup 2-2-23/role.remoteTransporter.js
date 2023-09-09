let roleTransporter = require('role.transporter');
let scoutData = require('expansionManager').scoutData;
const { moveCreep, moveToTargetRoom } = require("movecreep")

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
            let target = Game.getObjectById(creep.memory.target)
            if(!target){
                creep.memory.needTask = true
                return
            }
            if (target.pos) {
                moveCreep(creep, target, 1, 5)
            } else {
                moveToTargetRoom(creep)
            }
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
    if (!outposts) {
        return
    }
    let containers = []
    for (let outpost in outposts) {
        let room = Game.rooms[outpost]

        if (room) {
            let roomContainers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0)
            for (let container of roomContainers)
                containers.push(container)
        }
    }

    let target = _.max(containers, c => c.forecast(RESOURCE_ENERGY))
    if (target == null || !target || target == 'null' || target == 'undefined') {

        return
    }

    creep.memory.target = target.id
    creep.memory.task = 'withdraw'
    creep.memory.needTask = false
    try {
        creep.memory.targetRoom = target.room.name
    } catch (e) { }
}

function findTransferTarget(creep) {
    // set target to homeroom storage, targetroom to homeroom
    let room = Game.rooms[creep.memory.home]
    let storage = room.storage
    if (!storage) { return }
    creep.memory.target = storage.id
    creep.memory.task = 'transfer'
    creep.memory.needTask = false
    creep.memory.targetRoom = storage.room.name
}

