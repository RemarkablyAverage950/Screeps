let scoutData = require('expansionManager').scoutData
let roleWorker = require('role.worker')

let roleRemoteBuilder = {
    run: function (creep) {
        // find build target
        let targetRoom = creep.memory.targetRoom
        if (!targetRoom) {
            targetRoom = findTargetRoom()
        }
        if (!targetRoom) {
            return
        }
        if (creep.room.name != targetRoom) {
            movetoTargetRoom(creep)
        } else {
            if (creep.memory.refill) {
                if (!creep.memory.target) {
                    let sources = room.find(FIND_SOURCES_ACTIVE)
                    let target = creep.pos.findClosestByPath(sources)
                    creep.memory.target = target.id
                    creep.memory.task = 'harvest'
                }

            } else {
                if (!creep.memory.target) {
                    let sites = room.find(FIND_CONSTRUCTION_SITES)
                    let target = creep.pos.findClosestByPath(sites)
                    creep.memory.target = target.id
                    creep.memory.task = 'build'
                }
            }

            if (creep.memory.target) {
                roleWorker.run(creep)
            }

        }

    }
}
module.exports = roleRemoteBuilder

function findTargetRoom(creep) {
    let rooms = Game.rooms.filter(r => r.controller.my && r.name != creep.memory.home && r.find(FIND_MY_CONSTRUCTION_SITES).length > 0)
    return rooms[0]
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