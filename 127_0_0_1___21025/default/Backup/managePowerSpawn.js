let MEMORY = require('memory');

/**
 * 
 * @param {Room} room 
 */
function managePowerSpawn(room) {

    if (room.controller.level === 8) {

        let ps = undefined;

        if (!MEMORY.rooms[room.name].powerSpawn) {

            ps = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_POWER_SPAWN)[0];

            if (!ps) {
                return;
            }
            MEMORY.rooms[room.name].powerSpawn = ps.id
        }
        ps = Game.getObjectById(MEMORY.rooms[room.name].powerSpawn)
        if (!ps) {
            MEMORY.rooms[room.name].powerSpawn = undefined;
        }
        if (ps.store[RESOURCE_POWER] && ps.store[RESOURCE_ENERGY] > 49) {
            ps.processPower()
        }

    }

}

module.exports = managePowerSpawn;