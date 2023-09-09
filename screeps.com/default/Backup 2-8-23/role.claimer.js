let scoutData = require('expansionManager').scoutData

let roleClaimer = {
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
            moveToTargetRoom(creep)
        } else {
            let controller = creep.room.controller
            if (controller.my) {
                creep.memory.targetRoom = undefined
                return
            }

            if ((controller.level > 0 && !controller.my)) {
                if (creep.attackController(controller) == ERR_NOT_IN_RANGE) {
                    let path = creep.pos.findPathTo(controller.pos, {
                        range: 1,
                        ignoreCreeps: true,
                        maxOps:5000,
                        roomCallback: (roomName) => {
                            // This callback will only allow the pathfinder to search in the current room
                            return roomName === creep.room.name;
                        }
                    });


                    if (path.length) {
                        creep.move(path[0].direction);
                    }

                }
            } else if (!controller.my) {
                if (creep.claimController(controller) == ERR_NOT_IN_RANGE) {
                    let path = creep.pos.findPathTo(controller.pos, {
                        range: 1,
                        ignoreCreeps: true,
                        maxOps:5000,
                        roomCallback: (roomName) => {
                            // This callback will only allow the pathfinder to search in the current room
                            return roomName === creep.room.name;
                        }
                    });
                    if (path.length) {
                        creep.move(path[0].direction);
                    }

                    //creep.moveTo(controller)
                }
            }
        }
    }
}
module.exports = roleClaimer

/**
 * 
 * @param {Creep} creep 
 * @returns {string} Reservation target room name.
 */
function findTarget(creep) {
    let target = Game.rooms[creep.memory.home].memory.claimRoom
    creep.memory.targetRoom = target
    return target
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