var roleBuilder = require('role.builder')

var roleHarvester = {

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
                    return (((structure.structureType == STRUCTURE_CONTAINER && !structure.pos.inRangeTo(creep.room.controller.pos, 4)) ||
                        structure.structureType == STRUCTURE_STORAGE)
                        &&
                        structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity());
                }
            })
            if (storage.length > 0) {
                //target = _.max(storage, function (s) { return s.store.getUsedCapacity(RESOURCE_ENERGY); });
                target = creep.pos.findClosestByPath(storage)
                if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }

            } else {
                let sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                    filter: (s) => (s.energy > 0)
                });
                target = creep.pos.findClosestByPath(sources);
                if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        } else {
            // work mode
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN)
                        &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                }
            })
            if (targets.length == 0) {
                roleBuilder.run(creep)
            } else {
                target = creep.pos.findClosestByPath(targets)
                if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }
};
module.exports = roleHarvester;