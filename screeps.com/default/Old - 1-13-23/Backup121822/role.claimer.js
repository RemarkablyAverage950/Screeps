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


                return costs;
            },
        }
    );

    let pos = ret.path[0];
    creep.move(creep.pos.getDirectionTo(pos));
}

var roleClaimer = {
    /** @param {Creep} creep **/
    run: function (creep) {
        var targetRoom = creep.memory.target 
        // console.log(Game.rooms[targetRoom])
        //  console.log(creep.room.name)
        if (creep.room.name != targetRoom) {

            moveToTargetRoom(creep, targetRoom)
            //let target = creep.pos.findPath(exit)
            //console.log(target)

        } else {
            var target = Game.rooms[targetRoom].controller
            if (creep.claimController(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
            } else if (creep.claimController(target) == ERR_GCL_NOT_ENOUGH) {
                if (creep.reserveController(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target)
                }
            }

        }
    }
}
module.exports = roleClaimer;