var roleHarvester = require('role.harvester')
var roleWallRepairer = {


    /** @param {Creep} creep **/
    run: function (creep) {
        let target = undefined
        if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false

        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
        }
        if (creep.memory.refill) {
            let sources = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType == STRUCTURE_CONTAINER||
                        structure.structureType == STRUCTURE_STORAGE)
                        &&
                        structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity());
                },
            })
            if (sources.length > 0) {
                target = creep.pos.findClosestByPath(sources)
                if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                sources = creep.room.find(FIND_SOURCES_ACTIVE);
                if (sources.length > 0) {
                    target = creep.pos.findClosestByPath(sources)
                    if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
            }
        } else {
            // refill = false

            let sites = undefined


            //console.log('sites length: '+sites.length)

            for (let percentage = 1; percentage < 100; percentage++) {
                sites = creep.room.find(FIND_STRUCTURES).filter(s => (s.hits / s.hitsMax) * 100 < percentage && s.structureType == STRUCTURE_WALL)
                if (sites.length > 0) {
                    break
                }
            }


            //console.log(repairSites)

            if (sites.length > 0) {
                target = creep.pos.findClosestByPath(sites)

                //console.log(target.structureType)



                if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }

            else {
                roleHarvester.run(creep)
            }
        }
    }
};

module.exports = roleWallRepairer;