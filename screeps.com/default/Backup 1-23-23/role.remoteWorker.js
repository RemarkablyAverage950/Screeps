const { set } = require("lodash")
let scoutData = require('expansionManager').scoutData
let roleWorker = require('role.worker')

let remoteWorker = {
    run: function (creep) {

        if (!creep.memory.targetRoom) {
            let target = findTargetRoom(creep)
            creep.memory.targetRoom = target
            Game.rooms[creep.home.room].memory.outpost[target].workAssignedOnTick = Game.time
        }
        let targetRoom = creep.memory.targetRoom
        if (creep.room.name != targetRoom) {
            moveToTargetRoom(creep)

        } else {
            if (creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49) {
                let ret = creep.moveTo(25, 25, {
                    range: 23
                })
            }
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
    } else if (!creep.memory.refill && creep.store.getUsedCapacity() == 0) {
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
    let buildMap = roomData.buildMap
    for (let tile of buildMap) {
        if (tile.placed == false) {
            let ret = creep.room.createConstructionSite(tile.x, tile.y, tile.structure)
            tile.placed = true
        }
    }
    if (creep.memory.refill == true) {

        let containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity())
        if (containers.length > 0) {
            let target = creep.pos.findClosestByRange(containers)
            if (target) {
                creep.memory.target = target.id
                creep.memory.task = 'withdraw'
                creep.memory.needTask = false
            }
        }
        else {


            let sources = creep.room.find(FIND_SOURCES_ACTIVE)
            let target = creep.pos.findClosestByRange(sources)

            if (target) {
                creep.memory.target = target.id
                creep.memory.task = 'harvest'
                creep.memory.needTask = false
            }
        }
    } else {
        let sites = creep.room.find(FIND_CONSTRUCTION_SITES)
        if (sites.length) {
            let target = creep.pos.findClosestByRange(sites)
            creep.memory.target = target.id
            creep.memory.task = 'build'
            creep.memory.needTask = false
        }
        else {
            sites = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax)
            if (sites.length) {
                let target = creep.pos.findClosestByRange(sites)
                creep.memory.target = target.id
                creep.memory.task = 'repair'
                creep.memory.needTask = false
            } else {
                creep.memory.targetRoom == undefined
                let containers = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
                if (containers.length) {
                    for (let container of containers) {
                        if (creep.pos.x == container.pos.x && creep.pos.y == container.pos.y) {
                            creep.moveTo(25, 25)
                        }
                    }
                }
            }
        }
    }


}

function findTargetRoom(creep) {
    let outposts = Memory.rooms[creep.memory.home].outposts
    //let found = outposts.find(o=> o.status == 'SETUP')
    //console.log(found)
    for (let outpost in outposts) {
        if (outposts[outpost].status == 'SETUP') {
            return outpost
        }
    }
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
