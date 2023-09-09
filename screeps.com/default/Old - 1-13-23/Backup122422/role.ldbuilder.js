
function moveToTargetRoom(creep, targetRoom) {
    var avoidRooms = []
    var avoidPos = []
    avoidRooms.push(creep.memory.avoidRoom)
    var hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
    for (let hostile of hostiles) {

        avoidPos.push(hostile.pos)
    }
    //console.log(avoidPos)
    do {
        var route = Game.map.findRoute(creep.room, targetRoom, {
            routeCallback(roomName, fromRoomName) {
                if (avoidRooms.includes(roomName)) {    // avoid this room
                    return Infinity;
                }
                return 1;
            }
        });
        //console.log(route[0].room)
        var exitDir = Game.rooms[creep.room.name].findExitTo(route[0].room)
        //console.log(exit)
        var exit = creep.pos.findClosestByPath(exitDir)
        //console.log(path.x + ',' + path.y)
        var look = Game.rooms[creep.room.name].lookAt(exit.x, exit.y)  //(path.x,path.y)
        if (look.some(l => l.type == 'structure')) {
            avoidRooms.push(route[0].room)
        }
    } while (avoidRooms.includes(route[0].room))

    var path = creep.pos.findPathTo(exit, {
        maxOps: 200,
    })
    //p.getRangeTo(creep.pos.findClosestByPath(hostiles))
    /*for (let p of path) {
        let pos = new RoomPosition(p.x, p.y, creep.room.name)
        if (pos.inRangeTo(pos.findClosestByRange(hostiles), 4)) {
            console.log(p.x + ' ' + p.y + ' too close to hostile')
        }
    }*/
    //path.forEach(p => console.log(p.inRangeTo(creep)))
    pathToTarget(creep, exit)
}

function pathToTarget(creep, goal) {

    let ret = PathFinder.search(
        creep.pos, goal,
        {
            // We need to set the defaults costs higher so that we
            // can set the road cost lower in `roomCallback`
            plainCost: 2,
            swampCost: 10,

            roomCallback: function (roomName) {

                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since 
                // PathFinder supports searches which span multiple rooms 
                // you should be careful!
                if (!room) return;
                let costs = new PathFinder.CostMatrix;

                room.find(FIND_STRUCTURES).forEach(function (struct) {
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
                room.find(FIND_HOSTILE_CREEPS).forEach(function (hostile) {

                    let range = 4
                    for (let i = -range; i < range; i++) {
                        for (let j = -range; j < range; j++) {
                            costs.set(hostile.pos.x + i, hostile.pos.y + j, 0xff);
                        }
                    }
                });
                room.find(FIND_MY_CREEPS).forEach(function(creep) {
                    costs.set(creep.pos.x, creep.pos.y, 0xff)
                })
                


                return costs;
            },
        }
    );

    let pos = ret.path[0];
    creep.move(creep.pos.getDirectionTo(pos));
}




var roleldbuilder = {


    /** @param {Creep} creep **/
    run: function (creep) {
        
        var targetRoom = 'W3S24'
        // console.log(Game.rooms[targetRoom])
        //  console.log(creep.room.name)
        if (creep.room.name != targetRoom) {
            
            moveToTargetRoom(creep, targetRoom)
            //let target = creep.pos.findPath(exit)
            //console.log(target)

        } else {
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
                let sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES, {
                    filter: (s) => { return s.structureType == STRUCTURE_EXTENSION }
                })
                if (sites.length == 0) {
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
                    creep.memory.role = 'worker'
                    creep.memory.home = creep.room.name
                }
            }
        }
    }
}
module.exports = roleldbuilder;