var roleLdHarvester = {

    /** @param {Creep} creep **/
    run: function (creep) {
        
        // set refill state
        if (creep.memory.refill == true && creep.store.getFreeCapacity() == 0) {
            creep.memory.refill = false
            creep.memory.collected += creep.store.getUsedCapacity()
            
        } else if (creep.memory.refill == false && creep.store.getUsedCapacity() == 0) {
            creep.memory.refill = true
           
        }
        if (creep.memory.timer > 0) {
            for (let spawn in Game.spawns) {
                
                if (Game.spawns[spawn].memory.home == creep.memory.home
                    && Game.spawns[spawn].memory.hostile_room == undefined) {

                    creep.memory.timer = 0

                }

            }
        }
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
        if (hostiles.length > 0) {
            console.log(creep.room.name+ ' Hostile detected')
            
            var hp = 0
            for (let s of hostiles) {
               
                hp += s.hits
                if (s.ticksToLive > creep.memory.timer) {
                    creep.memory.timer = s.ticksToLive
                }
            }
            for (let spawn in Game.spawns) {
               
                if (Game.spawns[spawn].memory.home == creep.memory.home) {
                    Game.spawns[spawn].memory.hostile_hp = hp
                    Game.spawns[spawn].memory.hostile_room = creep.room.name
                }

            }
        } else if (creep.memory.timer > 0) {
           
            let enemyTombstones = creep.room.find(FIND_TOMBSTONES, {
                filter: (t) => (t.creep.my == false)
            })
           
            if (enemyTombstones.length > 0) {
                creep.memory.timer = 0
            }
        }

        
        if (creep.memory.timer > 0) {
            creep.memory.timer = (creep.memory.timer - 1)

            
            if (creep.room.name == creep.memory.target) {
               
                let exit = creep.room.findExitTo(creep.memory.home)
                creep.moveTo(creep.pos.findClosestByPath(exit))
            } else if (creep.memory.home == creep.room.name) {
             

                creep.moveTo(creep.room.controller, {
                    visualizePathStyle: { stroke: '#ffaa00' }
                });


            }
        } else if (creep.memory.refill == true) {
          
            if (creep.room.name == creep.memory.home) {

                let exitFlag = creep.room.find(FIND_FLAGS).filter(f => f.name == 'ldexit' + creep.room.name)
                if (exitFlag.length > 0 && creep.pos != exitFlag.pos) {

                    creep.moveTo(exitFlag[0], { visualizePathStyle: { stroke: '#ffaa00' } });
                } else {
                    let exit = creep.room.findExitTo(creep.memory.target)

                   
                    creep.moveTo(creep.pos.findClosestByRange(exit))
                }
            } else {
               
                // we are in the refill target room
                let tombstones = creep.room.find(FIND_TOMBSTONES, {
                    filter: (t) => (t.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
                })
                let resources = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: (r) => (r.resourceType == RESOURCE_ENERGY)
                })
                if (tombstones.length > 0 && creep.store.getFreeCapacity() > 0) {
                   
                    target = creep.pos.findClosestByPath(tombstones)
                    if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {
                            visualizePathStyle: { stroke: '#ffaa00' }
                        });
                    }
                } else if (resources.length > 0 && creep.store.getFreeCapacity() > 0) {
                  
                    target = creep.pos.findClosestByPath(resources)
                    if (creep.pickup(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    let sources = creep.room.find(FIND_SOURCES);
                    if (sources.length == 0) {
                        creep.moveTo(25, 25)
                    }


                    let closestSource = creep.pos.findClosestByPath(sources);
                   
                    if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closestSource, {
                            visualizePathStyle: { stroke: '#ffaa00' }
                        });
                    }
                }
            }
        } else {
            
            // refill == false
            if (creep.room.name != creep.memory.home) {
                let exit = creep.room.findExitTo(creep.memory.home)
                creep.moveTo(creep.pos.findClosestByPath(exit))
            } else {
                // we are in home room
                let destStructures = creep.room.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK) //&&  structure.store.getFreeCapacity() > creep.store.getUsedCapacity());




                if (destStructures.length == 0) {
                   

                    destStructures = creep.room.find(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return ((structure.structureType == STRUCTURE_CONTAINER ||
                                structure.structureType == STRUCTURE_LINK) &&
                                structure.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY));
                        }
                    });
                }
               
                if (destStructures.length > 0) {
                    let closest = creep.pos.findClosestByPath(destStructures)
                    if (creep.transfer(closest, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(closest, {
                            visualizePathStyle: { stroke: '#ffffff' }
                        });
                    }
                } else if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }

            }
        }
    }
};

module.exports = roleLdHarvester;