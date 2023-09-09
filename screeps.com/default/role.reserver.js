let scoutData = require('expansionManager').scoutData
const { moveCreep, moveToTargetRoom } = require("movecreep")

let roleReserver = {
    run: function (creep) {
        let target = creep.memory.targetRoom
        if (!target) {
            target = findTarget(creep)
        }
        if (!target) {
            return
        }
        if (creep.room.name != target) {
            // move to target room
            moveToTargetRoom(creep, target)
        } else {
            let controller = creep.room.controller
            if (controller.reservation && controller.reservation.ticksToEnd >= 4999) {
                creep.memory.targetRoom = undefined
                return
            }
            if (creep.reserveController(controller) == ERR_NOT_IN_RANGE) {
                moveCreep(creep, controller, 1, 1)
            } else {
                creep.memory.moving = false
            }
        }

    }
}
module.exports = roleReserver

/**
 * 
 * @param {Creep} creep 
 * @returns {string} Reservation target room name.
 */
function findTarget(creep) {
    let outposts = Game.rooms[creep.memory.home].memory.outposts
    let target;
    let min = Infinity
    for (let outpost in outposts) {
        if (!Game.rooms[outpost]) {
            continue
        }
        if (!Game.rooms[outpost].controller.reservation) {
            target = outpost
            break
        }

        let ticksToEnd = Game.rooms[outpost].controller.reservation.ticksToEnd
        if (ticksToEnd < min) {
            target = outpost
            min = ticksToEnd
        }
    }
    creep.memory.targetRoom = target
    return target
}

