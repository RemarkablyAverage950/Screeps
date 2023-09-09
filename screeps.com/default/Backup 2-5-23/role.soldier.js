const {moveCreep} = require("movecreep")
let scoutData = require('expansionManager').scoutData

let roleSoldier = {
    run: function (creep) {

        let targetRoom = creep.memory.targetRoom
        if (!targetRoom) {
            targetRoom = findTargetRoom(creep)
        }
        if (!creep.memory.targetRoom) {
            creep.memory.moving = false
            return
        }
        if (creep.room.name != targetRoom) {
            moveToTargetRoom(creep, targetRoom)
        } else {

            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            let hostileStructures;

            if (creep.room.name == Game.rooms[creep.memory.home].memory.harassRoom) {
                hostileStructures = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER)
            } else { hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER) }
            if (hostiles.length == 0 && hostileStructures.length == 0) {
                creep.memory.moving = false
                creep.memory.targetRoom = undefined
                creep.moveTo(25, 25, { range: 10 })
                return
            }
            let target;
            if (hostiles.length > 0) {
                target = _.min(hostiles, h => h.hits)
            } else if (hostileStructures.length > 0) {
                target = creep.pos.findClosestByPath(hostileStructures)
            }
            let ret = creep.attack(target)
            if (ret == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
                creep.memory.moving = true
            } else {
                creep.memory.moving = false
            }
        }
    }
}

module.exports = roleSoldier


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
    let exit = creep.memory.exitPos
    if (!exit || exit.roomName != creep.room.name) {
        
        const neighbors = scoutData[creep.memory.home].neighbors
        for (let neighbor in neighbors) {
            if (scoutData[creep.memory.home].neighbors[neighbor].safeToTravel == false) {
                unsafeRooms.push(neighbor)
            }
        }

        // find path to targetRoom that avoids all objects in unsafeRoom
        let route = Game.map.findRoute(creep.room.name, targetRoom, {
            maxOps: 600,
        });
        if (route.length > 0) {
            exit = creep.pos.findClosestByPath(route[0].exit)
            creep.memory.exitPos = exit
        } else {
            console.log(`No safe path found from ${creep.room.name} to ${targetRoom}`);
            return
        }
    }

    if (creep.memory.exitPos.roomName == creep.room.name) {
        moveCreep(creep, exit, 0, 1)
    }
}


function findTargetRoom(creep) {
    let outposts = Game.rooms[creep.memory.home].memory.outposts
    for (let outpost in outposts) {
        if (!Game.rooms[outpost]) continue;
        if (Game.rooms[outpost].find(FIND_HOSTILE_CREEPS).length > 0) {
            creep.memory.targetRoom = outpost
            return outpost
        }
    }
    let claimRoom = Game.rooms[Game.rooms[creep.memory.home].memory.claimRoom]
    if (claimRoom) {
        let hostiles = claimRoom.find(FIND_HOSTILE_CREEPS).concat(claimRoom.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER))
        if (hostiles.length > 0) {
            creep.memory.targetRoom = claimRoom.name
            return claimRoom.name
        }
    }
    let harassRoom = Game.rooms[creep.memory.home].memory.harassRoom
    if (harassRoom) {
        creep.memory.targetRoom = harassRoom
        return harassRoom
    }
}