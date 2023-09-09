var roleBuilder = {


    /** @param {Creep} creep **/
    run: function (creep) {

        let sites = [];
        let constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
        let repairSites = creep.room.find(FIND_MY_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL)
        for (let site of repairSites) {
            sites.push(site)
        }
        for (let site of constructionSites) {
            sites.push(site)
        }

        if (sites.length == 0) {
            for (let percentage = 1; percentage < 100; percentage++) {
                sites = Game.rooms[room].find(FIND_STRUCTURES).filter(s => (s.hits / s.hitsMax) * 100 < percentage && s.structureType == STRUCTURE_WALL)
                if (sites.lenght > 0) {
                    break
                }
            }
        }

        let target;
        if (sites.length > 0) {
            target = creep.pos.findClosestByPath(sites)
        } else {
            target = Game.flags['Idle Flag']
        }

        let sources = creep.room.find(FIND_SOURCES_ACTIVE);
        let storage = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_CONTAINER
                    &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity());
            },
            sort: (a, b) => (a.store.getUsedCapacity() - b.store.getUsedCapacity())
        })
        let locations = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
        for (let s of sources) {
            locations.push(s)
        }
        if (creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
        }
        if (creep.memory.refill == true) {
            if (creep.store.getFreeCapacity() == 0) {
                creep.memory.refill = false
            } else {

                let closestSource = creep.pos.findClosestByPath(sources);
                if (storage.length > 0) {
                    closestSource = _.max( storage, function(s){ return s.store.getUsedCapacity(RESOURCE_ENERGY); });
                    if (creep.withdraw(closestSource, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }else if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        } else {

            const path = creep.room.findPath(creep.pos, target.pos);
            if (path.length > 2) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            } else if (repairSites.includes(target)) {
                creep.repair(target)
            }
            else {
                creep.build(target)
            }
        }
    }
};

module.exports = roleBuilder;