var followCreep = '63a69a44d36cbbf33d607a84'

class Path {
    constructor(id, path) {
        this.id = id
        this.path = path
    }
}

var roleWorker = {
    run: function (creep, creepPaths) {

        if (creep.memory.target == undefined || creep.memory.task == undefined) {
            return
        }
        const target = Game.getObjectById(creep.memory.target)
        if (target == undefined) {
            creep.memory.target = undefined
            creep.memory.task = undefined
            return
        }
        var ret = undefined
        const task = creep.memory.task
        switch (task) {
            case 'harvest':

                ret = creep.harvest(target)
                if (ret == -6) {
                    creep.memory.target = undefined
                    creep.memory.task = undefined
                }
                break

            case 'withdraw':

                ret = creep.withdraw(target, RESOURCE_ENERGY)
                if (target.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
                    creep.memory.target = undefined
                    creep.memory.task = undefined
                }
                if (creep.store.getFreeCapacity(RESOURCE_ENERGY) < creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                    creep.memory.refill = false
                    creep.memory.target = undefined
                    creep.memory.task = undefined
                }

                break
            case 'pickup':
                ret = creep.pickup(target)
                break
            case 'transferTo':


                if (target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                    creep.memory.target = undefined
                    creep.memory.task = undefined
                    return
                } else {

                    ret = creep.transfer(target, RESOURCE_ENERGY)
                    if (ret == 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) >= target.store.getFreeCapacity(RESOURCE_ENERGY)) {
                        creep.memory.target = undefined
                        creep.memory.task = undefined
                    }
                }
                break

            case 'build':
                ret = creep.build(target)
                if (target.progress == target.progressTotal) {
                    creep.memory.target = undefined
                    creep.memory.task = undefined
                }
                break
            case 'repair':
                ret = creep.repair(target)

                if (target.hits == target.hitsMax) {
                    creep.memory.target = undefined
                    creep.memory.task = undefined
                }
                break
            case 'controller':
                ret = creep.upgradeController(target)
                break
        }


        if (ret == -9) {

            if (!creep.memory.moving) {
                creep.memory.moving = true
            }
            //creepPaths = []
            var path = undefined
            var po = undefined
            var idx = creepPaths.findIndex(p => p.id == creep.id)



            // if path.id not found create new path object and push to array
            if (idx == -1) {

                creepPaths.push(new Path(creep.id, pathCreep(creep, target)))

                idx = creepPaths.findIndex(p => p.id == creep.id)

                // if we have reached path[0], shift
            }
            if (creepPaths[idx].path == undefined) {
                creepPaths[idx].path = pathCreep(creep, target)

            }

            if (creep.pos.x == creepPaths[idx].path[0].x && creep.pos.y == creepPaths[idx].path[0].y) {



                creepPaths[idx].path.shift()

                //if there are no more waypoints, generate new path
                if (creepPaths[idx].path[0] == undefined) {

                    creepPaths[idx].path = pathCreep(creep, target)

                }
            }
            let found = creep.room.lookForAt(LOOK_CREEPS, creepPaths[idx].path[0])
            if (found[0] != undefined && !found[0].memory.moving) {
                creepPaths[idx].path = pathCreep(creep, target)

            }


            /*if (creep.id == followCreep) {
                console.log(target.pos, creepPaths[idx].path)
            }*/
            creep.move(creep.pos.getDirectionTo(creepPaths[idx].path[0]))












            /*let avoidCreeps = creep.room.find(FIND_MY_CREEPS).filter(c=> c.memory.moving == false)
            ret = creep.moveTo(target.pos, { 
                ignoreCreeps: false,
                visualizePathStyle: { stroke: '#ffaa00' } })
            ;*/
            if (ret == -7 || ret == -2) {
                creep.memory.task = undefined
                creep.memory.target = undefined
            }
        } else {
            var idx = creepPaths.findIndex(p => p.id == creep.id)
            if (idx > -1) {
                creepPaths[idx].path = undefined
            }
            if (ret == 0 && task != 'withdraw' && task != 'pickup' && task != 'transferTo' && creep.memory.moving) {
                creep.memory.moving = false
            }
        }
        return creepPaths
    }



}



function pathCreep(creep, target) {

    target.range = 1

    let ret = PathFinder.search(
        creep.pos, target,
        {
            // We need to set the defaults costs higher so that we
            // can set the road cost lower in `roomCallback`
            plainCost: 2,
            swampCost: 5,





            roomCallback: function (roomName) {

                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since 
                // PathFinder supports searches which span multiple rooms 
                // you should be careful!
                if (!room) return;
                let costs = PathFinder.CostMatrix.deserialize(Memory.savedMatrix[roomName])//new PathFinder.CostMatrix;

                /*room.find(FIND_STRUCTURES).forEach(function (struct) {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        // Favor roads over plain tiles
                        costs.set(struct.pos.x, struct.pos.y, 1);
                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART ||
                            !struct.my)) {
                        // Can't walk through non-walkable buildings
                        costs.set(struct.pos.x, struct.pos.y, 0xff);
                    }
                });

                // Avoid creeps in the room
                room.find(FIND_CREEPS).filter(c => c.memory.moving == false).forEach(function (creep) {
                    costs.set(creep.pos.x, creep.pos.y, 0xff);
                });*/
               

                return costs;
            }
        }
    );
    if(ret.incomplete){
        return undefined
    }    

    return ret.path

}

module.exports = roleWorker;