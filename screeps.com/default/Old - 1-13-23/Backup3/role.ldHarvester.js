var roleLdHarvester = {

    /** @param {Creep} creep **/
    run: function (creep) {
        //console.log('Running for ' + creep.name + ' in room ' + creep.room.name)
        // set refill state
        if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
            creep.memory.collected += creep.store.getUsedCapacity()
            // console.log(creep.name+' collected '+creep.memory.collected+' energy')
        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
            //console.log(creep.name+' deposited '+creep.memory.collected+' energy')
        }
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
        if (hostiles.length > 0) {
            console.log('Hostile detected')
            // console.log(hostiles)
            for (let s of hostiles) {
                // console.log(s.ticksToLive)
                if (s.ticksToLive > creep.memory.timer) {
                    creep.memory.timer = s.ticksToLive
                }
            }
        } else if (creep.memory.timer > 0) {
            // console.log('A')
            let enemyTombstones = creep.room.find(FIND_TOMBSTONES, {
                filter: (t) => (t.creep.my == false)
            })
            //console.log("ET: "+enemyTombstones)
            if (enemyTombstones.length > 0) {
                creep.memory.timer = 0
            }
        }

        //console.log('A')
        if (creep.memory.timer > 0) {
            creep.memory.timer = (creep.memory.timer - 1)

            //console.log(creep.room.name == creep.memory.target)
            if (creep.room.name == creep.memory.target) {
                //console.log('Moving to exit')
                let exit = creep.room.findExitTo(creep.memory.home)
                creep.moveTo(creep.pos.findClosestByPath(exit))
            } else if (creep.memory.home == creep.room.name) {
                //console.log('moving to spawn1')

                creep.moveTo(creep.room.controller, {
                    visualizePathStyle: { stroke: '#ffaa00' }
                });


            }
        } else if (creep.memory.refill == true) {
            //console.log('refill == true')
            //console.log(creep.room.name+' '+creep.memory.target)
            //console.log(creep.room.name != creep.memory.target)
            if (creep.room.name == creep.memory.home) {
                //console.log('B')
                let exit = creep.room.findExitTo(creep.memory.target)

                //console.log('Moving toward exit '+exit)
                creep.moveTo(creep.pos.findClosestByRange(exit))

            } else {
                //console.log('in target room ' + creep.room.name)
                //console.log('entering else')
                // we are in the refill target room
                let tombstones = creep.room.find(FIND_TOMBSTONES, {
                    filter: (t) => (t.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
                })
                let resources = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: (r) => (r.resourceType == RESOURCE_ENERGY)
                })
                if (tombstones.length > 0 && creep.store.getFreeCapacity() > 0) {
                    //console.log('A')
                    //console.log('toombstones.length > 0')
                    target = creep.pos.findClosestByPath(tombstones)
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {
                            visualizePathStyle: { stroke: '#ffaa00' }
                        });
                    }
                } else if (resources.length > 0 && creep.store.getFreeCapacity() > 0) {
                    //console.log('resources length > 0')
                    //console.log('B')
                    target = creep.pos.findClosestByPath(resources)
                    if (creep.pickup(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    let sources = creep.room.find(FIND_SOURCES_ACTIVE);


                    let closestSource = creep.pos.findClosestByPath(sources);
                    //console.log(closest)
                    if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closestSource, {
                            visualizePathStyle: { stroke: '#ffaa00' }
                        });
                    }
                }
            }
        } else {
            // console.log('refill == false')
            // refill == false
            if (creep.room.name != creep.memory.home) {
                let exit = creep.room.findExitTo(creep.memory.home)
                creep.moveTo(creep.pos.findClosestByPath(exit))
            } else {
                // we are in home room
                let destStructures = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER &&
                            structure.store.getFreeCapacity() > creep.store.getUsedCapacity());
                    }
                });
                if (destStructures.length > 0) {
                    let closest = creep.pos.findClosestByPath(destStructures)
                    if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closest, {
                            visualizePathStyle: { stroke: '#ffffff' }
                        });
                    }
                }
                else if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }
            }
        }
    }
};

module.exports = roleLdHarvester;