/*

Future projects

1.  -if wall ruins or rampart ruins are detected, place build flags on them
    -if no enemies are detected - place construction sites on flags for walls/ramparts
    -when walls and ramparts are built on flags, remove flags

2. automatically build walls

3. automatically build ramparts

4. automatically place LD harvester inbox

5. automatically place upgrader storage

6. automatically build extractors

7. automatically build labs

8. functionallize finding a clear area to build 
    - ignoring or checking for roads
    - defining area

9. complete road construction function for new structures    

10. add countdown timer to memory if there are no projects left to build (to save cpu power)
*/

function autoBuild(room) {
    console.log('test')
    let [testx,testy] =getClearArea(40,35,1,1,true)
    console.log('test area ('+testx+','+testy+')')
    let spawns = []
    for (let spawn in Game.spawns) {
        //console.log(Game.spawns[spawn].room.name)
        if (Game.spawns[spawn].room.name == room) {
            spawns.push(Game.spawns[spawn])
        }
    }


    //console.log(Game.spawns[spawns[0]].buildTimer)
    if (spawns[0].memory.buildTimer > 0) {
        spawns[0].memory.buildTimer--
        return
    }
    let maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][Game.rooms[room].controller.level];

    let extensions = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (s) => (s.structureType == STRUCTURE_EXTENSION)
    });
    let constSiteExt = Game.rooms[room].find(FIND_CONSTRUCTION_SITES, {
        filter: (s) => (s.structureType == STRUCTURE_EXTENSION)
    });
    if (extensions.length + constSiteExt.length < maxExtensions) {
        //console.log("build extensions")
        buildExtensions(room)

    }
    var sites = Game.rooms[room].find(FIND_CONSTRUCTION_SITES)
    if (sites.length > 0) {
        return
    }
    let ret = false

    let maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][Game.rooms[room].controller.level];
    let towers = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (s) => (s.structureType == STRUCTURE_TOWER)
    });
    //console.log(towers.length)
    if (towers.length < maxTowers) {
        buildTower(room)
    }




    //console.log(spawns)
    // spawns iterable array of spawnNames

    // get energy sources
    let sources = Game.rooms[room].find(FIND_SOURCES);
    //console.log(sources)
    for (let spawn of spawns) {
        //console.log(spawn.pos)
        for (let source of sources) {
            // console.log(source.pos)
            // get path from spawn to source
            let path = spawn.pos.findPathTo(source, {
                ignoreCreeps: true,
                ignoreRoads: true,
                maxOps: 200,
                swampCost: 1

            })

            //console.log(path)
            //Game.rooms[room].spawn.pos

            // check if road exists
            ret = buildRoads(path, room)
            if (ret) {
                return
            }
            path = source.pos.findPathTo(Game.rooms[room].controller, {
                ignoreCreeps: true,
                ignoreRoads: true,
                maxOps: 200,
                swampCost: 1

            })
            ret = buildRoads(path, room)
            //draw path to source from spawn
            if (ret) {
                return
            }
        }
    }

    for (let extention of extensions) {
        for (let source of sources) {
            if (ret) {
                return
            }
            path = extention.pos.findPathTo(source, {
                ignoreCreeps: true,
                ignoreRoads: false,
                maxOps: 200,
                swampCost: 1
            })
            ret = buildRoads(path, room)
        }
    }

    spawns[0].memory.buildTimer = 100
}

function buildTower(room) {
    let spawns = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (s) => {
            return (s.structureType == STRUCTURE_SPAWN);
        }
    });
    let x = spawns[0].pos.x
    let y = spawns[0].pos.y
    let range = 2
    var build = false
    while (!build) {
        for (let i = -range; i < range; i++) {
            for (let j = -range; j < range; j++) {
                //console.log(i+','+j)
                let checkX = x + i
                let checkY = y + j
                //console.log('Checking '+checkX+','+checkY)
                build = true
                //console.log(OBSTACLE_OBJECT_TYPES)


                //console.log('type '+type)
                let area = Game.rooms[room].lookForAt(LOOK_TERRAIN, checkY - 1, checkX - 1, checkY + 1, checkX + 1, true)
                for (let obj of area) {
                    //console.log(obj)
                    //console.log('X: ' + obj.x + ' Y: ' + obj.y)
                    if (Game.map.getRoomTerrain(room).get(obj.x, obj.y) == 1) {
                        build = false
                    }
                }
                area = Game.rooms[room].lookForAtArea(LOOK_STRUCTURES, checkY - 1, checkX - 1, checkY + 1, checkX + 1, true)
                for (let obj of area) {
                    if (obj.type == 'structure') {
                        build = false
                    }


                }
                if (build == true) {
                    //Game.rooms[room].createConstructionSite(checkX, checkY, STRUCTURE_TOWER)
                    console.log('Placing tower at ' + checkX + ',' + checkY)
                    return
                }
            }
        }
        range++
    }


}

function getClearArea(x, y, startRange, radius, roadsAllowed) {
    let range = startRange;
    var build = false
    while (!build) {
        for (let i = -range; i < range; i++) {
            for (let j = -range; j < range; j++) {
                //console.log(i+','+j)
                let checkX = x + i
                let checkY = y + j
                //console.log('Checking '+checkX+','+checkY)
                build = true
                //console.log(OBSTACLE_OBJECT_TYPES)


                //console.log('type '+type)
                let area = Game.rooms[room].lookForAtArea(LOOK_TERRAIN, checkY - radius, checkX - radius, checkY + radius, checkX + radius, true)
                for (let obj of area) {
                    //console.log(obj)
                    //console.log('X: ' + obj.x + ' Y: ' + obj.y)
                    if (Game.map.getRoomTerrain(room).get(obj.x, obj.y) == 1) {
                        build = false
                    }
                }
                area = Game.rooms[room].lookForAtArea(LOOK_STRUCTURES, checkY - 2, checkX - 2, checkY + 2, checkX + 2, true)
                for (let obj of area) {
                    if (roadsAllowed && obj[LOOK_STRUCTURES].structureType != STRUCTURE_ROAD) {
                        build = false
                    } else if (obj[LOOK_STRUCTURES]) {
                        build = false
                    }

                }

            }
            if (build == true) {
                return [checkX, checkY]
            }
        }
    }
    range++
}






function buildExtensions(room) {

    //center around spawn1
    let spawns = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (s) => {
            return (s.structureType == STRUCTURE_SPAWN);
        }
    });
    let x = spawns[0].pos.x
    let y = spawns[0].pos.y
    // x and y are spawn 1 location

    // find 5x5 space starting from spawn and circling out
    // try center at 25,30 - expect fail

    // try center at 17,30 - expect pass

    // try center at 20,30 - expect fail

    let range = 4
    var build = false
    while (!build) {
        for (let i = -range; i < range; i++) {
            for (let j = -range; j < range; j++) {
                //console.log(i+','+j)
                let checkX = x + i
                let checkY = y + j
                //console.log('Checking '+checkX+','+checkY)
                build = true
                //console.log(OBSTACLE_OBJECT_TYPES)


                //console.log('type '+type)
                let area = Game.rooms[room].lookForAtArea(LOOK_TERRAIN, checkY - 2, checkX - 2, checkY + 2, checkX + 2, true)
                for (let obj of area) {
                    //console.log(obj)
                    //console.log('X: ' + obj.x + ' Y: ' + obj.y)
                    if (Game.map.getRoomTerrain(room).get(obj.x, obj.y) == 1) {
                        build = false
                    }
                }
                area = Game.rooms[room].lookForAtArea(LOOK_STRUCTURES, checkY - 2, checkX - 2, checkY + 2, checkX + 2, true)
                for (let obj of area) {

                    if (obj[LOOK_STRUCTURES].structureType != STRUCTURE_ROAD) {
                        build = false
                    }


                }
                if (build == true) {
                    placeExtensions(checkX, checkY, room)
                    console.log('Placing extensions at ' + checkX + ',' + checkY)
                    return
                }
            }
        }
        range++
    }


}

function placeExtensions(x, y, room) {
    Game.rooms[room].createConstructionSite(x, y, STRUCTURE_EXTENSION)
    Game.rooms[room].createConstructionSite(x - 1, y + 1, STRUCTURE_EXTENSION)
    Game.rooms[room].createConstructionSite(x - 1, y - 1, STRUCTURE_EXTENSION)
    Game.rooms[room].createConstructionSite(x + 1, y - 1, STRUCTURE_EXTENSION)
    Game.rooms[room].createConstructionSite(x + 1, y + 1, STRUCTURE_EXTENSION)
}


function buildRoads(path, room) {
    let ret = false
    let roads = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (s) => {
            return (s.structureType == STRUCTURE_ROAD);
        }
    });
    let sites = Game.rooms[room].find(FIND_CONSTRUCTION_SITES, {
        filter: (s) => (s.structureType == STRUCTURE_ROAD)
    })
    for (let s of sites) {
        roads.push(s)
    }
    //console.log(roads)

    for (let i = 0; i < path.length; i++) {
        //console.log(path[i].x + ',' + path[i].y)
        let x = path[i].x
        let y = path[i].y
        let look = Game.rooms[room].lookAt(x, y);
        //console.log(look[0].type)

        var build = true
        look.forEach(function (lookObject) {

            if ((lookObject.type == LOOK_STRUCTURES &&
                lookObject[LOOK_STRUCTURES].structureType == STRUCTURE_ROAD)
                || (lookObject.type == LOOK_CONSTRUCTION_SITES &&
                    lookObject[LOOK_CONSTRUCTION_SITES].structureType == STRUCTURE_ROAD)




            ) { build = false } else {
                if (Game.map.getRoomTerrain(room).get(x, y) == 1) {
                    build = false
                }
            }
        });

        if (build) {

            console.log('Placing road at (' + x + ',' + y + ') in room ' + room)
            Game.rooms[room].createConstructionSite(x, y, STRUCTURE_ROAD)
            ret = true
        }

    }


    return ret
    //xa,ya,xb,yb

}
module.exports = autoBuild;