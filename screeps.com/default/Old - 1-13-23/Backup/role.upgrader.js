var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function (creep) {
        let sources = creep.room.find(FIND_SOURCES_ACTIVE);
        let resources = creep.room.find(FIND_DROPPED_RESOURCES)
        let storage = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_CONTAINER
                    &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity());
            },
            _sortBy: (s) => (s.store.getUsedCapacity())
        })

        for (let r of resources) {
            sources.push(r)
        }

        


        let closestSource = creep.pos.findClosestByPath(sources);
        if(storage.length >0){
            closestSource = _.max( storage, function(s){ return s.store.getUsedCapacity(RESOURCE_ENERGY); });
        }
        let locations = creep.room.find(FIND_SOURCES_ACTIVE)


        locations.push(creep.room.controller)

        let closest = creep.pos.findClosestByPath(locations)
        //console.log(closestSource)
        if (creep.store.getUsedCapacity() == 0 || (creep.store.getFreeCapacity() > 0 && closest == closestSource)) {
            if (closestSource != null && closestSource.structureType == STRUCTURE_CONTAINER) {
                if (creep.withdraw(closestSource, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
        else if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }

};

module.exports = roleUpgrader;