let { moveCreep, findParking, moveToTargetRoom } = require('movecreep');
let scoutData = require('expansionManager').scoutData

let roleSoldier = {
    run: function (creep) {

        let targetRoom = creep.memory.targetRoom
        if (!targetRoom) {
            targetRoom = findTargetRoom(creep)
        }

        if (targetRoom && creep.room.name != targetRoom && creep.room.find(FIND_HOSTILE_CREEPS).filter(c=> c.owner.username == 'Invader').length == 0) {
            moveToTargetRoom(creep, targetRoom, 0, 10)
        } else {

            let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            let hostileStructures;

            if (creep.room.name == Game.rooms[creep.memory.home].memory.harassRoom) {
                hostileStructures = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER)
            } else { hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER) }
            if (hostiles.length == 0 && hostileStructures.length == 0) {
                let spawnSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_SPAWN)
                if (spawnSites.length > 0) {
                    creep.memory.moving = false
                    creep.moveTo(spawnSites[0], { range: 1 })
                } else {
                    creep.memory.moving = false
                    creep.moveTo(25, 25, { range: 10 })
                    creep.memory.targetRoom = undefined
                }
                return
            }
            let target;
            if (hostiles.length > 0) {
                target = _.min(hostiles, h => h.hits)
            } else if (hostileStructures.length > 0) {
                target = creep.pos.findClosestByPath(hostileStructures)
            }
            let range = creep.pos.getRangeTo(target)
            if (range > 3) {
                moveCreep(creep, target.pos, 1, 1)
            } else if (range > 1) {
                if (creep.body.some(p => p.type == RANGED_ATTACK)) {
                    creep.rangedAttack(target)
                }
                moveCreep(creep, target.pos, 0, 1)
                creep.memory.moving = true
            } else {
                let ret = creep.attack(target)
                if (ret == ERR_NOT_IN_RANGE) {
                    if (creep.body.some(p => p.type == RANGED_ATTACK)) {
                        creep.rangedAttack(target)
                    }
                    moveCreep(creep, target.pos, 0, 1)
                    creep.memory.moving = true
                } else {
                    moveCreep(creep, target.pos, 0, 1)
                    creep.memory.moving = false
                }
            }
        }
    }
}

module.exports = roleSoldier





function findTargetRoom(creep) {
    let outposts = Game.rooms[creep.memory.home].memory.outposts
    for (let outpost in outposts) {
        if (!Game.rooms[outpost]) continue;
        if (Game.rooms[outpost].find(FIND_HOSTILE_CREEPS).length > 0) {
            creep.memory.targetRoom = outpost
            return outpost
        }
    }
    let claimRoom = Game.rooms[creep.memory.home].memory.claimRoom
    if (claimRoom) {
        creep.memory.targetRoom = claimRoom
        return claimRoom
    }
    let defendRoom = Game.rooms[creep.memory.home].memory.defendRoom
    if (defendRoom) {
        creep.memory.targetRoom = defendRoom
        return defendRoom
    }

    let harassRoom = Game.rooms[creep.memory.home].memory.harassRoom
    if (harassRoom) {
        creep.memory.targetRoom = harassRoom
        return harassRoom
    }
}