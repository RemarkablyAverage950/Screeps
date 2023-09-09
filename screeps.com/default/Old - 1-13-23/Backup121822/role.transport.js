var _ = require('lodash');

/*

** PRESSING ISSUE **

Set up system for classifying storages

transfer from fullest chest to upgrade storage

*/


var roleTransport = {


    /** @param {Creep} creep **/
    run: function (creep) {
        let target = undefined

        let tombstones = creep.room.find(FIND_TOMBSTONES, {
            filter: (t) => ((creep.store.getFreeCapacity() >= t.store.getUsedCapacity(RESOURCE_ENERGY) || creep.store.getUsedCapacity() == 0) && t.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
        })
        let resources = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: (r) => (r.resourceType == RESOURCE_ENERGY)
        })
        if (tombstones.length > 0 && creep.store.getFreeCapacity() / creep.store.getCapacity() > .5) {

            target = creep.pos.findClosestByPath(tombstones)
            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else if (resources.length > 0 && creep.store.getFreeCapacity() > 0) {

            target = creep.pos.findClosestByPath(resources)
            if (creep.pickup(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {

            if (creep.memory.refill == true && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.refill = false

            } else if (creep.memory.refill == false && creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.refill = true
            }
            if (creep.memory.refill) {
                let sources = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER
                            &&
                            !structure.pos.inRangeTo(creep.room.controller.pos, 4) ||
                            structure.structureType == STRUCTURE_LINK) &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY) > .25

                    }
                })


                if (sources.length == 0) {
                    sources = creep.room.find(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return ((structure.structureType == STRUCTURE_CONTAINER
                                &&
                                !structure.pos.inRangeTo(creep.room.controller.pos, 4) ||
                                structure.structureType == STRUCTURE_LINK) &&
                                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
                        }
                    })
                }

                if (sources.length > 0) {
                    target = creep.pos.findClosestByPath(sources)
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });

                    } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 300) {
                        creep.memory.refill = false
                    }
                } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.memory.refill = false
                }


            } else {
                // refill = false (working)

                // check for priority structures at 0
                var structures = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN ||
                            structure.structureType == STRUCTURE_TOWER ||
                            (structure.structureType == STRUCTURE_CONTAINER &&
                                structure.pos.inRangeTo(creep.room.controller, 4)))
                            &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) == 0);
                    }
                })

                if (structures.length > 0) {

                    target = creep.pos.findClosestByPath(structures)

                    if (creep.transfer(target, RESOURCE_ENERGY) < 0) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    // if no priority structures at 0, check for any destination structure with free capacity and pick the lowest used capacity

                    // find destination storages
                    structures = creep.room.find(FIND_STRUCTURES, {
                        filter: (s) => {
                            return (((s.structureType == STRUCTURE_STORAGE ||

                                s.structureType == STRUCTURE_SPAWN ||
                                s.structureType == STRUCTURE_EXTENSION ||
                                (s.structureType == STRUCTURE_CONTAINER &&
                                    s.pos.inRangeTo(creep.room.controller, 4))) &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ||
                                (s.structureType == STRUCTURE_TOWER &&
                                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 50))
                        }
                    })
                    if (structures.length > 0) {
                        var min = Infinity
                        for (let s of structures) {

                            if (s.store.getUsedCapacity(RESOURCE_ENERGY) < min) {
                                min = s.store.getUsedCapacity(RESOURCE_ENERGY)

                                target = s

                            }

                        }

                        if (target != undefined) {

                            if (creep.transfer(target, RESOURCE_ENERGY) < 0) {
                                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                            }
                        }
                    }
                }
            }
        }
    }
};

module.exports = roleTransport;