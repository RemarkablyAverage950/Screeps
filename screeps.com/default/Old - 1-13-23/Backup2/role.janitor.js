var roleJanitor = {

    /** @param {Creep} creep **/
    run: function (creep) {

        // set refill status
        let target = undefined
        if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
        }

        if (creep.memory.refill) {
            let tombstones = creep.room.find(FIND_TOMBSTONES, {
                filter: (t) => (t.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            })
            let resources = creep.room.find(FIND_DROPPED_RESOURCES)
            if (tombstones.length > 0) {
                //console.log('toombstones.length > 0')
                target = creep.pos.findClosestByPath(tombstones)
                if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                } 
            } else if (resources.length > 0) {
                //console.log('resources length > 0')
                target = creep.pos.findClosestByPath(resources)
                if (creep.pickup(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                } 
            } else {
                let storage = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((structure.structureType == STRUCTURE_CONTAINER||
                            structure.structureType == STRUCTURE_STORAGE)
                            &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity());
                    }
                })
                if (storage.length > 0) {
                    target = _.max(storage, function (s) { return s.store.getUsedCapacity(RESOURCE_ENERGY); });
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    let sources = creep.room.find(FIND_SOURCES_ACTIVE);
                    target = creep.pos.findClosestByPath(sources)
                    if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
            }
        } else {
            // unload energy
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }
};

module.exports = roleJanitor;