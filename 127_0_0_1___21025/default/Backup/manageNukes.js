let MEMORY = require('memory')

function manageNukes(myRooms) {

    if (Game.time % 10 !== 0) {
        return;
    }

    const flags = Object.values(Game.flags)

    for (const flag of flags) {
        if (flag.name === 'NUKE') {

            for (const roomName of myRooms) {
                let room = Game.rooms[roomName];

                if (room.controller.level === 8 && Game.map.getRoomLinearDistance(flag.pos.roomName, roomName) < 11) {

                    let nuker = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_NUKER)[0]

                    if (nuker && !nuker.cooldown && nuker.store[RESOURCE_ENERGY] === 300000 && nuker.store[RESOURCE_GHODIUM] === 5000) {
                        // Ready to launch.

                        let ret = nuker.launchNuke(flag.pos)

                        if (ret === 0) {
                            flag.remove()
                            return;
                        } else {
                            console.log(roomName, 'failed to launch nuke with code', ret)
                        }

                    }
                }
            }
        }
    }
}

module.exports = manageNukes;
