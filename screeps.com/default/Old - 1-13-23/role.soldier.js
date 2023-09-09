function moveToTargetRoom(creep, targetRoom) {
    var avoidRooms = []
    avoidRooms.push(creep.memory.avoidRoom)
    var hostiles = creep.room.find(FIND_HOSTILE_CREEPS)

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
        var exit = Game.rooms[creep.room.name].findExitTo(route[0].room)
        //console.log(exit)
        var path = creep.pos.findClosestByPath(exit)
        //console.log(path.x + ',' + path.y)
        if (path != undefined) {
            var look = Game.rooms[creep.room.name].lookAt(path.x, path.y)  //(path.x,path.y)
            if (look.some(l => l.type == 'structure')) {
                avoidRooms.push(route[0].room)
            }
        }
    } while (avoidRooms.includes(route[0].room))

    //console.log(path)

    pathToTarget(creep, path)
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
                room.find(FIND_CREEPS).forEach(function (c) {
                    costs.set(c.pos.x, c.pos.y, 0xff)
                })


                return costs;
            },
        }
    );

    let pos = ret.path[0];
    creep.move(creep.pos.getDirectionTo(pos));
}

var roleSoldier = {
    /** @param {Creep} creep **/
    run: function (creep) {
        var targetRoom = creep.memory.targetRoom
        //const targetRoom = creep.memory.target
        /*for (let spawn in Game.spawns) {
            if (Game.spawns[spawn].memory.home == creep.memory.home && Game.spawns[spawn].memory.targetRoom != undefined) {
                targetRoom = Game.spawns[spawn].memory.targetRoom
            } else {
                targetRoom = creep.memory.home
            }
        }*/
        //console.log(creep.room.name)
        //console.log(creep.room.name != targetRoom)
        // console.log(Game.rooms[targetRoom])
        //  console.log(creep.room.name)
        if (creep.room.name != targetRoom) {
            let ht = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER)
            if (ht.length > 0) {
                creep.memory.avoidRoom = creep.room.name
            } else {
                //console.log('A')
                moveToTargetRoom(creep, targetRoom)
            }
            //let target = creep.pos.findPath(exit)
            //console.log(target)

        } else {
            var target = undefined

            /* if (Game.flags['attack'] != undefined) {
                 console.log(Game.flags['attack'].name)
                 target = Game.flags.name.attack
             }*/
            var hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            let hostileBuildings = creep.room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType != STRUCTURE_CONTROLLER)

            /*if (target == Game.flags.attack) {
                console.log('Flag')
                let ret = creep.attack(target)
                //console.log(ret)
                if (ret < 0) {
                    creep.moveTo(target)
                }
            } else*/ if (hostileBuildings.length > 0) {
                console.log(hostileBuildings)
                target = creep.pos.findClosestByPath(hostileBuildings)
                if (creep.attack(target) < 0) {
                    creep.moveTo(target)
                }
            } else if (hostiles.length > 0) {
                console.log('Hostile Detected!!!')
                // console.log('a')

                target = creep.pos.findClosestByPath(hostiles)
                //console.log(test)
                //console.log(creep.attack(target))
                if (creep.attack(target) < 0) {
                    creep.moveTo(target)
                }
            } else {

                //console.log('B')
                //console.log(Game.rooms[creep.memory.home])
                for (let spawn in Game.spawns) {
                    //console.log(spawn)
                    if (Game.spawns[spawn].pos.roomName == creep.memory.home) {
                        //console.log('Room ' + creep.room.name + ' cleared')
                        Game.spawns[spawn].memory.hostile_hp = 0
                        Game.spawns[spawn].memory.targetRoom = undefined
                    }
                }


            }


        }


    }
}

module.exports = roleSoldier;
// Game.spawns['Spawn1'].memory.targetRoom = 'W6S28'
// delete Game.spawns['Spawn1'].memory.targetRoom