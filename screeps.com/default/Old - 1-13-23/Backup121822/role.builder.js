var roleUpgrader = require('role.upgrader')
var roleBuilder = {


    /** @param {Creep} creep **/
    run: function (creep) {
        var target = undefined
        //creep.memory.target = undefined
        if (creep.memory.target && creep.store.getFreeCapacity() > 0) {
            target = Game.getObjectById(creep.memory.target)
            if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                if (creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } }) == ERR_NO_PATH) {
                    creep.memory.target = undefined
                };
            }
        } else if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
            creep.memory.target = undefined

        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
        } else
            if (creep.memory.refill) {
                let sources = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (((structure.structureType == STRUCTURE_CONTAINER && !structure.pos.inRangeTo(creep.room.controller.pos, 4)) ||
                            structure.structureType == STRUCTURE_STORAGE)
                            &&
                            structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity());
                    }
                })
                if (sources.length > 0) {
                    target = creep.pos.findClosestByPath(sources)
                    //creep.memory.target = target.id
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    sources = creep.room.find(FIND_SOURCES);
                    if (sources.length > 0) {
                        target = creep.pos.findClosestByPath(sources)
                        creep.memory.target = target.id
                        if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                        }
                    }
                }
            } else {
                // refill = false
                let sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES, {
                    filter: (s) => { return s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_CONTAINER }
                })
                if (sites.length == 0) {
                    sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
                }
                let repairSites = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL)
                let roads = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType == STRUCTURE_ROAD)

                if (sites.length == 0) {
                    for (let site of repairSites) {
                        sites.push(site)
                    }
                    for (let site of roads) {
                        sites.push(site)
                    }
                }

                /*if (sites.length == 0) {
                    for (let percentage = 1; percentage < 100; percentage++) {
                        repairSites = creep.room.find(FIND_STRUCTURES).filter(s => (s.hits / s.hitsMax) * 100 < percentage && s.structureType == STRUCTURE_WALL)
                        if (repairSites.length > 0) {
                            break
                        }
                    }
                    for (let site of repairSites) {
                        sites.push(site)
                    }
                }*/


                if (sites.length > 0) {
                    target = creep.pos.findClosestByPath(sites)


                    const path = creep.pos.findPathTo(target);

                    if (path.length > 2) {

                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    } else if (repairSites.includes(target)) {

                        creep.repair(target)
                    }
                    else {

                        creep.build(target)
                    }
                } else {
                    roleUpgrader.run(creep)
                }
            }
    }
};

module.exports = roleBuilder;