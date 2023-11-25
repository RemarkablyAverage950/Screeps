let MEMORY = require('memory');

const lib = {

    /**
     * Checks a room's memory for structures listed in StructureTypeArr.
     * Setting StructureTypeArr to false or leaving empty returns all structures in the room.
     *  
     * If room's memory of structures is undefined, generates and caches list.
     * Returns the requested list of structures.
     * 
     * @param {String} roomName 
     * @param {StructureConstant[]} structureTypeArr 
     * @returns {Structure[]}
     */
    getStructures(roomName, structureTypeArr = false) {

        let ret = [];
        let structureCache = MEMORY.rooms[room.name].structures;
        let room = Game.rooms[roomName];

        if (!room) {
            console.log(`Failed to get structures for room '${roomName}' on tick ${Game.time}`);
            return [];
        }

        if (structureCache === undefined) {
            structureCache = this.cacheStructures(room);
            MEMORY.rooms[room.name].structures = structureCache;

        }

        if (structureTypeArr) {

            for (const structureType of structureTypeArr) {

                if (structureCache[structureType]) {
                    ret.push(...structureCache[structureType]);
                }

            }

        } else {

            ret = Object.values(structureCache).flat();

        }

        return ret;

    },


    /**
     * Returns an object of structures, seperated by structureType to cache. Example: {STRUCTURE_EXTENSION: [extension0, extension1], STRUCTURE_SPAWN: [spawn0]}
     * @param {Structure[]} structures 
     * @returns {Object}
     */
    cacheStructures: function (room) {

        let structures = room.find(FIND_STRUCTURES);

        let cache = {};

        for (const s of structures) {

            if (s.structureType === STRUCTURE_CONTROLLER) {
                continue;
            }

            if (!cache[s.structureType]) {
                cache[s.structureType] = [s];
            } else {
                cache[s.structureType].push(s);
            }
        }

        return cache;

    }
}
module.exports = lib;