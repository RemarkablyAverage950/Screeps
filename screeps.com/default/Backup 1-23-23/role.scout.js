let scoutData = require('expansionManager').scoutData

let roleScout = {
    run: function (creep) {
        const room = creep.room
        const homeRoom = creep.memory.home
        let memory = scoutData[homeRoom]
        if (!homeRoom) {
            console.log(creep.name + ' does not have creep.memory.home defined.')
            console.log('Setting ' + creep.room.name + ' to home room.')
            creep.memory.home = creep.room.name
            return
        }

        let explored = memory.explored
        if (room.name == creep.memory.target || !explored.includes(room.name)) {
            //console.log(creep.name+' at target room '+creep.room.name)
            //Room unexplored
            let roomData;
            if (room.name == homeRoom) {
                roomData = memory
            } else {
                roomData = memory.neighbors[room.name]
            }
            if (roomData == undefined) {
                roomData = {}
            }
            roomData.type = getRoomType(room);
            if (roomData.type == 'owned') {
                roomData.rcl = room.controller.level
                roomData.owner = room.controller.owner.username
            }

            roomData.exits = Game.map.describeExits(room.name)
            roomData.energySources = room.find(FIND_SOURCES).map(s => s.id);
            roomData.mineral = room.find(FIND_MINERALS).map(m => m.mineralType)[0];
            roomData.distance = getDistanceToHome(creep, room);
            roomData.hostiles = room.find(FIND_HOSTILE_CREEPS);
            roomData.connected = Object.values(roomData.exits) // change this  to store objects
            roomData.safeToTravel = getSafeToTravel(room)

            if (room.name == homeRoom) {
                memory = roomData
                //console.log('Updating data for scoutData.'+homeRoom)

            } else {
                memory.neighbors[room.name] = roomData
                //console.log('Updating data for scoutData.'+homeRoom+'.neighbors.'+creep.room.name)
            }

            if (!explored.includes(room.name)) {
                //console.log("Adding room to explored[]")
                explored.push(room.name)
            }
            memory.explored = explored
            creep.memory.target = undefined
        }


        if (!creep.memory.target) {
            if (Game.cpu.bucket < 100) { return }
            //console.log('Finding target room')
            let target = findTargetRoom(creep, room.name, explored, 0)
            if (target != undefined) {
                //console.log('Setting scouting target to ' + target)
                creep.memory.target = target
            } else {
               // console.log('Did not find exploration target for ' + creep.name + ' in room ' + room.name)
                creep.memory.moving = false
                return
            }
        }
        if (creep.memory.target) {
            
            moveToTargetRoom(creep)

        }
        if (creep.hits < creep.hitsMax) {
            console.log(creep.name + ' under Attack in ' + creep.room.name + '. Marking unsafe to travel.')
            memory.neighbors[creep.room.name].safeToTravel = false

        }
    }
}

module.exports = roleScout

/*

memory structure:
    Memory[roomName][roomName].data
    memory > room > neighbors > 
    
    neighbor = {
        roomClass: Hostile,Source, highway, Neutral, My
        roomData: {
            energySources
            sources
            exits - > for each exit if distance < 2 to home room, explore and add room to neighbors
            mineral
            distance to home
        }
    }

*/


function getSafeToTravel(room) {
    if (room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER).length > 0) {
        return false
    }
    if (room.find(FIND_HOSTILE_CREEPS).some(c => c.body.some(b => b.type == ATTACK || b.type == RANGED_ATTACK))) {
        return false
    }
    return true
}

/**
 * 
 * @param {Room} room 
 * @returns {string} The availability type of the room.
 */
function getRoomType(room) {
    const controller = room.controller;
    if (!controller) return 'unavailable';
    if (controller.my) return 'my';
    if (controller.reservation && controller.reservation.username) return 'reserved';
    if (controller.owner && controller.owner.username) return 'owned';
    return 'available';
}

/**
 * 
 * @param {Creep} creep 
 * @param {Room} room The current room.
 * @returns {number} The number of rooms between the current room and the creep's home room.
 */
function getDistanceToHome(creep, room) {
    let distance = undefined
    // Calculate distance to home room.
    if (creep.memory.home) {
        let homeRoom = creep.memory.home;
        if (homeRoom) {
            distance = Game.map.getRoomLinearDistance(room.name, homeRoom);
        }
    }
    return distance;
}

/**
 * 
 * @param {Creep} creep 
 * @param {Room} room 
 * @param {string[]} explored 
 * @param {number} count 
 * @returns {string} Name of target room.
 */
function findTargetRoom(creep, roomName, explored, count) {
    if (count == 5) {
        return
    }
    //console.log('Searching from '+roomName)
    // Get the neighbors from the current room.
    let homeRoom = creep.memory.home
    let roomData;
    if (roomName == homeRoom) {
        roomData = scoutData[homeRoom]
    } else {
        roomData = scoutData[homeRoom].neighbors[roomName]
    }
    if (roomData == undefined) {
       // console.log('roomData undefined for ' + roomName)
        scoutData[homeRoom].explored = undefined
        return
    }
    let connected = roomData.connected
    if (connected == undefined) {
        return
    }
    let unsafeRooms = []
    const neighbors = scoutData[homeRoom].neighbors
    for (let neighbor in neighbors) {
        if (scoutData[homeRoom].neighbors[neighbor].safeToTravel == false) {
            unsafeRooms.push(neighbor)
        }
    }

    // find path to targetRoom that avoids all objects in unsafeRoom


    // Check if any of the neighboring rooms have not been explored yet
    let unexplored = []
    for (let i = 0; i < connected.length; i++) {
        let route = Game.map.findRoute(creep.room.name, connected[i], {
            routeCallback: (roomName) => {
                if (unsafeRooms.includes(roomName)) {
                    return Infinity;
                }
                return 1;
            }
        });
        if (!explored.includes(connected[i]) && route.length > 0 && Game.map.getRoomLinearDistance(connected[i], creep.memory.home) <= 5) {
            unexplored.push(connected[i])
        }
    }
   // console.log('A',JSON.stringify(unexplored))
    if (unexplored.length > 0) {
        let minDistRoom = _.min(unexplored, r => Game.map.getRoomLinearDistance(r, homeRoom))
        //console.log('Returning '+minDistRoom)
        return minDistRoom
    }

    // If all neighboring rooms have been explored, check their neighboring rooms
    for (let i = 0; i < connected.length; i++) {
        let target = findTargetRoom(creep, connected[i], explored, count + 1)
        if (target) {
            return target
        }
    }
}

/**
 * 
 * @param {Creep} creep 
 * @returns {void}
 */
function moveToTargetRoom(creep) {
    let targetRoom = creep.memory.target
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
            creep.memory.target = undefined
        }
    } else {
        console.log(`No safe path found from ${creep.room.name} to ${targetRoom}`);
    }
}

