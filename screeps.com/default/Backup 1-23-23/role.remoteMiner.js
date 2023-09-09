let scoutData = require('expansionManager').scoutData
let roleMiner = require('role.miner')
let roleRemoteMiner = {
    run: function (creep) {
        if (creep.memory.needTask == true) {
            findRemoteMinerTarget(creep)
        }
        if (creep.room.name != creep.memory.targetRoom) {
            moveToTargetRoom(creep)

        } else {
            if (creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49) {
                let ret = creep.moveTo(25, 25, {
                    range: 23
                })

                return
            }
            roleMiner.run(creep)
        }
    }
}

module.exports = roleRemoteMiner

function findRemoteMinerTarget(creep) {
    let outposts = Memory.rooms[creep.memory.home].outposts
    for (let outpost in outposts) {
        let room = Game.rooms[outpost]
        const containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
        const sources = room.find(FIND_SOURCES)
        let availableSourceGroups = []
        for (let source of sources) {
            for (let container of containers) {
                if (container.pos.isNearTo(source)
                    && !source.assignedCreeps().some(c => Game.creeps[c].memory.role == 'remoteMiner')) {
                    availableSourceGroups.push([source.id, container.id,source.pos.roomName])
                }
            }
        }
        console.log(JSON.stringify(availableSourceGroups))
        if (availableSourceGroups.length > 0) {
            let group = availableSourceGroups[0]
            console.log(JSON.stringify(group))
            creep.memory.harvestTarget = group[0]
            creep.memory.moveTarget = group[1]
            creep.memory.resource = RESOURCE_ENERGY
            creep.memory.needTask = false
            creep.memory.targetRoom = group[2]
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
