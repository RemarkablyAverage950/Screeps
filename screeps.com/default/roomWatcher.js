let roomData = {}

function roomWatcher() {

    for (let room in Game.rooms) {
        if (!roomData[room.name]) {
            roomData[room.name] = {}
            updateRoomData(room)
        }




    }


}

function updateRoomData(room){

}

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