const { set } = require("lodash")
let scoutData = require('expansionManager').scoutData
let roleWorker = require('role.worker')
const {moveCreep,moveToTargetRoom} = require("movecreep")


let remoteWorker = {
    run: function (creep) {
        if (!creep.memory.targetRoom) {
            let target = findTargetRoom(creep)
            if (!target) {
                return
            }
            creep.memory.targetRoom = target
            Memory.rooms[creep.memory.home].outposts[target].workAssignedOnTick = Game.time
        }
        let targetRoom = creep.memory.targetRoom
        if (creep.room.name != targetRoom && !creep.memory.harvestTarget) {

            moveToTargetRoom(creep)

        } else {
            manageCreepState(creep)
            let roomData = Memory.rooms[creep.memory.home].outposts[targetRoom]
            if (creep.memory.needTask) {
                assignTask(creep, roomData)
            }

            roleWorker.run(creep)



        }

    }
}

module.exports = remoteWorker

function manageCreepState(creep) {

    if (creep.memory.refill && creep.store.getFreeCapacity() == 0) {
        creep.memory.refill = false
        creep.memory.needTask = true
        creep.memory.task = undefined
        creep.memory.target = undefined
        creep.memory.moving = false
    } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
        creep.memory.refill = true
        creep.memory.needTask = true
        creep.memory.task = undefined
        creep.memory.target = undefined
        creep.memory.moving = false
    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {Object} roomData 
 */
function assignTask(creep, roomData) {
    let sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
    if (creep.room.name != Game.rooms[creep.memory.home].memory.claimRoom) {
        //console.log(creep.room.name,Game.rooms[creep.memory.home].memory.claimRoom)

        try {
            if (sites.length == 0) { }
            let buildMap = roomData.buildMap

            if (!buildMap) {
                return
            }
            for (let tile of buildMap) {
                if (tile.placed == false) {
                    let ret = creep.room.createConstructionSite(tile.x, tile.y, tile.structure)
                }
            }


        } catch (e) {
            console.log('Failed on roomData.buildmap')
            console.log(creep.name, creep.memory.targetRoom)
        }
    }
    if (creep.memory.refill) {
        let containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity())
        if (containers.length > 0) {
            let target = creep.pos.findClosestByRange(containers)
            if (target) {
                creep.memory.target = target.id
                creep.memory.task = 'withdraw'
                creep.memory.needTask = false
            }
        } else {
            let sources = creep.room.find(FIND_SOURCES).filter(s => s.assignedCreeps().length < s.maxCreeps())
            let target = creep.pos.findClosestByRange(sources)

            if (target) {
                creep.memory.target = target.id
                creep.memory.task = 'harvest'
                creep.memory.needTask = false
            }
        }
    } else {

        if (sites.length) {
            let target = creep.pos.findClosestByRange(sites)
            creep.memory.target = target.id
            creep.memory.task = 'build'
            creep.memory.needTask = false
        }
        else {
            let buildMap = roomData.buildMap

            sites = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && buildMap.some(t => t.x == s.pos.x && t.y == s.pos.y))
            if (sites.length > 0) {
                let target = _.min(sites, s => { return s.hits / s.hitsMax })
                creep.memory.target = target.id
                creep.memory.task = 'repair'
                creep.memory.needTask = false
            } else {
                creep.memory.targetRoom = undefined
                let containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
                if (containers.length) {
                    for (let container of containers) {
                        if (creep.pos.getRangeTo(container) < 2) {
                            creep.moveTo(25, 25)
                        }
                    }
                }
            }
        }
    }
}

function findTargetRoom(creep) {

    // implement better code for finding claimRoom
    /*for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName]
        if (room.controller.my && room.name != creep.memory.home && room.find(FIND_MY_CONSTRUCTION_SITES).length > 0)
            return room.name
    }*/



    let outposts = Memory.rooms[creep.memory.home].outposts
    return _.min(outposts, o => o.workAssignedOnTick).roomName
}


