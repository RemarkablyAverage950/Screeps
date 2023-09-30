
/**
 * 
 * @param {Room} room 
 */
function manageRoomDefense(room) {

    const hostiles = room.find(FIND_HOSTILE_CREEPS)
    if (hostiles.length === 0) {
        return;
    }

    if (!room.controller.safeMode && room.controller.safeModeAvailable) {

        let monitoredStructures = room.find(FIND_MY_SPAWNS)
        if (room.storage) {
            monitoredStructures.push(room.storage)
        }
        if (room.terminal) {
            monitoredStructures.push(room.storage)
        }
        for (let s of monitoredStructures) {
            if (s.hits < .5 * s.hitsMax) {
                // Turn on safe mode
                room.controller.activateSafeMode()
                return;

            }
        }
    }

}

module.exports = manageRoomDefense;