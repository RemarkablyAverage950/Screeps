var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function (creep) {
        // set refill status
        let target = undefined
        if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
        }

        if (creep.memory.refill == true) {
            let storage = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_CONTAINER ||
                        structure.structureType == STRUCTURE_STORAGE) &&
                        structure.pos.inRangeTo(creep.room.controller.pos, 4)
                }
            })
            if (storage.length > 0) {
                target = creep.pos.findClosestByPath(storage)
                if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }

            } else {

                storage = storage = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((structure.structureType == STRUCTURE_CONTAINER ||
                            structure.structureType == STRUCTURE_STORAGE)
                            &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity());
                    }
                })
                if (storage.length > 0) {
                    target = creep.pos.findClosestByPath(storage)
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }

                } else {
                    let sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                        filter: (s) => (s.energy > creep.store.getFreeCapacity())
                    });
                    target = creep.pos.findClosestByPath(sources);
                    if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
            }
        } else {
            // work mode
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }
};

module.exports = roleUpgrader;