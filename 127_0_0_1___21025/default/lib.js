let MEMORY = require('memory');

const lib = {

    /**
     * Returns an array of requests for filling extensions and spawns < full energy capacity.
     * @param {Room} room 
     * @returns {Object[]}
     */
    getFillRequests: function (room) {

        let requests = [];

        let structures = this.getStructures(room, [STRUCTURE_EXTENSION, STRUCTURE_SPAWN]);

        if (structures.length) {
            for (const s of structures) {

                const capacity = s.store.getCapacity(RESOURCE_ENERGY)
                if (s.store[RESOURCE_ENERGY] < capacity) {

                    requests.push({
                        id: s.id,
                        qty: capacity - s.store[RESOURCE_ENERGY],
                    })
                }
            }

        }

        return requests;

    },

    /**
     * Checks a room's memory for dropped resources of type resourceType.
     * Setting resourceType to false or leaving empty returns all dropped resources in the room.
     *  
     * If room's memory of dropped resources is undefined, generates and caches list.
     * Returns the requested list of dropped resources.
     * 
     * @param {String} roomName 
     * @param {ResourceConstant} resourceType 
     * @returns {Resource[]}
     */
    getDroppedResources: function (room, resourceType = false) {

        let ret = [];
        let droppedCache = MEMORY.rooms[room.name].droppedResources;
    

        if (droppedCache === undefined) {

            droppedCache = this.cacheDropped(room);
            MEMORY.rooms[room.name].droppedResources = droppedCache;

        }

        if (resourceType) {

            if (droppedCache[resourceType]) {
                ret.push(...droppedCache[resourceType]);
            }

        } else {

            ret = Object.values(droppedCache).flat();

        }

        return ret;
    },



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
    getStructures: function (room, structureTypeArr = false) {

        let ret = [];
        let structureCache = MEMORY.rooms[room.name].structures;

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
     * Returns an object of dropped resources, seperated by resource to cache. Example: {RESOURCE_ENERGY: [energy0, energy1], RESOURCE_OXYGEN: [oxygen0]}
     * @param {Room} room 
     * @returns {Object}
     */
    cacheDropped: function (room) {

        const dropped = room.find(FIND_DROPPED_RESOURCES);

        let cache = {};

        for (const r of dropped) {
            if (!cache[r.resourceType]) {
                cache[r.resourceType] = [r];
            } else {
                cache[r.resourceType].push(r);
            }
        }

        return cache;

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