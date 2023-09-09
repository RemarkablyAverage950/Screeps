var roleUpgrader = require('role.upgrader')
var roleBuilder = {


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
                    return ((structure.structureType == STRUCTURE_CONTAINER ||
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
            let sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES,{
                filter: (s) => {return s.structureType == STRUCTURE_EXTENSION}
            })
            if(sites.length == 0){
                sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
            }
            let repairSites = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL)
            let roads = creep.room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType == STRUCTURE_ROAD)
            // console.log('repairSites.length: '+repairSites.length)
            if (sites.length == 0) {
                for (let site of repairSites) {
                    sites.push(site)
                }
                for (let site of roads) {
                    sites.push(site)
                }
            }
            //console.log('sites length: '+sites.length)
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
            //console.log(repairSites)

            if (sites.length > 0) {
                target = creep.pos.findClosestByPath(sites)

                //console.log(target.structureType)
                const path = creep.pos.findPathTo(target);

                if (path.length > 2) {
                    //console.log('moving to target')
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                } else if (repairSites.includes(target)) {
                    //console.log('repairing target')
                    creep.repair(target)
                }
                else {
                    //console.log('building target')
                    creep.build(target)
                }
            } else {
                creep.memory.upgraderTime = 20
                roleUpgrader.run(creep)
            }
        }
    }
};

module.exports = roleBuilder;