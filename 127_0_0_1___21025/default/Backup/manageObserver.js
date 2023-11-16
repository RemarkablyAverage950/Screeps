let MEMORY = require('memory');

/**
 * 
 * @param {Room} room 
 */
function manageObserver(room) {

    if (!MEMORY.rooms[room.name].observer) {
        let observers = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_OBSERVER)
        if (observers.length) {
            MEMORY.rooms[room.name].observer = observers[0].id
        }

    } else {
        let observer = Game.getObjectById(MEMORY.rooms[room.name].observer)

        let monitoredRoomNames = MEMORY.rooms[room.name].monitoredRooms

        for (let roomName of monitoredRoomNames) {
            if(roomName === room.name){
                continue;
            }
            let lastScan = MEMORY.monitoredRooms[roomName].lastScan
            let range = Game.map.getRoomLinearDistance(roomName, room.name)

            if (Game.time - lastScan >= range * 100) {

                let ret = observer.observeRoom(roomName);
                return;
            }


        }


    }



}

module.exports = manageObserver;