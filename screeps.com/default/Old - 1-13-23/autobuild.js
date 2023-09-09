const EXTENSION_POSITIONS = [[-1, -1], [-1, -2], [-1, -3], [0, -2], [-2, -2],
[0, -3], [0, -4], [1, -3], [1, -5], [2, -5], [2, -4], [3, -5], [3, -3], [4, -4],
[4, -3], [4, -2], [5, -1], [5, -2], [5, -3], [6, -2], [-2, 0], [-3, 0], [-3, 1],
[-3, -1], [-3, -3], [-3, -4], [-3, -5], [-2, -5], [-2, -4], [-1, -5], [-4, -2],
[-4, 2], [0, -6], [4, -6], [5, -5], [6, -5], [7, -5], [7, -4], [6, -4], [7, -3]]
const TOWER_POSITIONS = [[1, 0], [1, -1], [2, -1], [2, 1], [3, 0], [3, -1]]
const LAB_POSITIONS = [[4,3],[4,4],[5,2],[5,3],[6,2],[5,5],[6,4],[6,5],[7,3],[7,4]]

function autoBuild(room) {
    var ret = false
    //room.find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove())
    const spawns = room.find(FIND_MY_SPAWNS)
    const spawn = spawns[0]


    if (room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
        return
    }
    const extensions = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTENSION)
    const extensionSites = room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_EXTENSION)
    const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level];

    if (extensions.length + extensionSites.length < maxExtensions) {
        ret = buildExtensions(room, spawn)
    }
    if (ret) {
        return
    }

    ret = buildBunkerRoads(room, spawn)
    if (ret) {
        return
    }
    ret = buildContainers(room, spawn)
    if (ret) {
        return
    }
    const storages = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)
    const storageSites = room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_STORAGE)
    const maxStorages = CONTROLLER_STRUCTURES[STRUCTURE_STORAGE][room.controller.level];
    if (storages.length + storageSites.length < maxStorages) {
        ret = buildStorage(room, spawn)
    }
    if (ret) {
        return
    }
    const towers = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER)
    const towerSites = room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_TOWER)
    const maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][room.controller.level];
    if (towers.length + towerSites.length < maxTowers) {
        buildTowers(room, spawn)
    }

    ret = buildRoads(room, spawn)
    if (ret) {
        return
    }
    const links = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK)
    if (links.length < CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level]) {
        ret = buildLinks(room, spawn)
    }
    if (ret) {
        return
    }

    ret = buildControllerStructures(room, spawn)
    if (ret) {
        return
    }
    if (storages.length > 0) {
        ret = buildRamparts(room, spawn)
    }
    if (ret) {
        return
    }
    const extractors = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTRACTOR)
    const extractorSites = room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_EXTRACTOR)
    if (extractors.length + extractorSites.length < CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level]) {
        ret = buildExtractor(room)
        if (ret) {
            return
        }
    }


    ret = bunkerBuild(room, spawn, [[4, 2]], STRUCTURE_TERMINAL)
    if (ret) {
        return
    }
 
    const labs = room.find(FIND_STRUCTURES).filter(s=>s.structureType == STRUCTURE_LAB)
    const labSites = room.find(FIND_CONSTRUCTION_SITES).filter(s=>s.structureType == STRUCTURE_LAB)
    if(labs.length + labSites.length < CONTROLLER_STRUCTURES[STRUCTURE_LAB][room.controller.level]){
        ret = bunkerBuild(room, spawn, LAB_POSITIONS, STRUCTURE_LAB)
        if(ret){
            return
        }
    }


    spawn.memory.buildTimer = 100



}

function buildExtractor(room) {
    const minerals = room.find(FIND_MINERALS)
    if(minerals.length >0){
        const x = minerals[0].pos.x
        const y = minerals[0].pos.y
        room.createConstructionSite(x, y, STRUCTURE_EXTRACTOR)
        let spawn = room.find(FIND_MY_SPAWNS)[0]
        let path = room.findPath(minerals[0].pos,spawn.pos)
        room.createConstructionSite(path[0].x, path[0].y, STRUCTURE_CONTAINER)
        return true
    }else return false
}

function buildLinks(room, spawn) {
    var build = true
    const center = spawn.pos
    const LINK_POS = [0, 2]
    const x = spawn.pos.x + LINK_POS[0]
    const y = spawn.pos.y + LINK_POS[1]
    let look = room.lookAt(x, y)
    look.forEach(s => {
        if (s.type == LOOK_STRUCTURES || s.type == LOOK_CONSTRUCTION_SITES)
            build = false
    })
    if (build) {
        room.createConstructionSite(x, y, STRUCTURE_LINK)
        return true
    }
    return false

}

function buildControllerStructures(room, spawn) {
    const controller = room.controller
    const links = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK)
    const containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    // count storages in range to controller
    const controllerContainers = controller.pos.findInRange(containers, 4)
    const controllerLinks = controller.pos.findInRange(links, 4)
    if (controllerLinks.length > 0 && controllerContainers.length > 0) {
        return

    } else if (controllerLinks.length > 0) {
        return false
    }
    else {
        const availableLinks = CONTROLLER_STRUCTURES[STRUCTURE_LINK][controller.level] - links.length
        if (controllerLinks.length == 0 && availableLinks > 0) {
            // build link
            //build storage
            let path = room.findPath(controller.pos, spawn.pos, {
                ignoreCreeps: true,
                swampCost: 1

            })
            room.createConstructionSite(path[1].x, path[1].y, STRUCTURE_LINK)
            return true


        } else if (controllerContainers.length == 0) {
            //build storage
            let path = room.findPath(controller.pos, spawn.pos, {
                ignoreCreeps: true,
                swampCost: 1

            })
            room.createConstructionSite(path[2].x, path[2].y, STRUCTURE_CONTAINER)
            return true


        }
    }

}

function buildRamparts(room, spawn) {
    var ret = false
    const center = spawn.pos
    const RAMPART_POSITIONS = [[-3, -5], [-3, 5], [7, -5], [7, 5]]
    const yRange = [-5, 5]
    const xFixed = [-4, 8]
    for (let i of xFixed) {
        for (let j = yRange[0]; j <= yRange[1]; j++) {
            let x = center.x + i
            let y = center.y + j
            let build = true
            let look = room.lookAt(x, y)
            look.forEach(function (lo) {

                if ((lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) && lo.structure.structureType == STRUCTURE_RAMPART) {

                    build = false
                }
            })
            if (build) {
                room.createConstructionSite(x, y, STRUCTURE_RAMPART)
                ret = true
            }

        }
    }
    const xRange = [-3, 7]
    const yFixed = [6, -6]
    for (let j of yFixed) {
        for (let i = xRange[0]; i <= xRange[1]; i++) {
            let x = center.x + i
            let y = center.y + j
            let build = true
            let look = room.lookAt(x, y)
            look.forEach(function (lo) {

                if ((lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) && lo.structure.structureType == STRUCTURE_RAMPART) {
                    build = false
                }
            })
            if (build) {
                room.createConstructionSite(x, y, STRUCTURE_RAMPART)
                ret = true
            }
        }
    }
    for (let pos of RAMPART_POSITIONS) {
        let x = center.x + pos[0]
        let y = center.y + pos[1]
        let build = true
        let look = room.lookAt(x, y)
        look.forEach(function (lo) {

            if ((lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) && lo.structure.structureType == STRUCTURE_RAMPART) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, STRUCTURE_RAMPART)
            ret = true
        }
    }
    const structures = room.find(FIND_STRUCTURES).filter(s =>
        s.structureType == STRUCTURE_SPAWN ||
        s.structureType == STRUCTURE_TOWER ||
        s.structureType == STRUCTURE_STORAGE)

    for (let s of structures) {
        let x = s.pos.x
        let y = s.pos.y
        let build = true
        let look = room.lookAt(x, y)
        look.forEach(function (lo) {
            if ((lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) && lo.structure.structureType == STRUCTURE_RAMPART) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, STRUCTURE_RAMPART)
            ret = true
        }
    }
    return ret

}

function buildStorage(room, spawn) {
    var ret = false
    const center = spawn.pos
    let build = true
    let x = center.x + 2
    let y = center.y + 4

    let look = room.lookAt(x, y)
    look.forEach(function (lo) {

        if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
            build = false
        }
    })
    if (build) {
        room.createConstructionSite(x, y, STRUCTURE_STORAGE)
        ret = true
    }
    return ret
}

function bunkerBuild(room, spawn, positions, structureType) {
    const center = spawn.pos
    var ret = false
    for (let pos of positions) {
        let build = true
        let x = center.x + pos[0]
        let y = center.y + pos[1]

        let look = room.lookAt(x, y)
        look.forEach(function (lo) {

            if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, structureType)
            ret = true
        }

    }
    return ret

}

function buildTowers(room, spawn) {
    ret = false
    const center = spawn.pos

    for (let pos of TOWER_POSITIONS) {
        let build = true
        let x = center.x + pos[0]
        let y = center.y + pos[1]

        let look = room.lookAt(x, y)
        look.forEach(function (lo) {

            if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, STRUCTURE_TOWER)
            ret = true
        }

    }
    return ret

}

function buildRoads(room, spawn) {
    //room.find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove())
    const sources = room.find(FIND_SOURCES)
    var ret = false
    var path = undefined
    sources.forEach(s => {
        if (ret === true) {
            return true
        }
        path = room.findPath(s.pos, spawn.pos, {
            ignoreCreeps: true,
            swampCost: 3

        })
        path.forEach(p => {
            let build = true
            let x = p.x
            let y = p.y
            let look = room.lookAt(x, y)
            look.forEach(function (lo) {
                if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES || (lo.type == LOOK_TERRAIN && lo.terrain == 'wall')) {
                    build = false
                }
            })
            if (build) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD)
                ret = true
            }

        })
        if (ret == true) {
            return ret
        }

        path = room.findPath(s.pos, room.controller.pos, {
            ignoreCreeps: true,
            swampCost: 3

        })
        path.forEach(p => {
            let build = true
            let x = p.x
            let y = p.y
            let look = room.lookAt(x, y)
            look.forEach(function (lo) {
                if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES || (lo.type == LOOK_TERRAIN && lo.terrain == 'wall')) {
                    build = false
                }
            })
            if (build) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD)
                ret = true
            }


        })
        if (ret == true) {
            return ret
        }

        let area = room.lookAtArea(s.pos.y - 2, s.pos.x - 2, s.pos.y + 2, s.pos.x + 2, true)
        area.forEach(function (t) {

            let build = false

            if (t.type == LOOK_TERRAIN && (t.terrain == 'plain' || t.terrain == 'swamp')) {
                build = true

            }
            if (build) {
                let check = room.createConstructionSite(t.x, t.y, STRUCTURE_ROAD)
                if (check == 0) {
                    ret = true
                }

            }
        })
        if (ret == true) {
            return ret
        }
    })

    path = room.findPath(spawn.pos, room.controller.pos, {
        ignoreCreeps: true,
        swampCost: 3

    })
    path.forEach(p => {
        let build = true
        let x = p.x
        let y = p.y
        let look = room.lookAt(x, y)
        look.forEach(function (lo) {
            if ((lo.type == LOOK_TERRAIN && lo.terrain == 'wall') || lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, STRUCTURE_ROAD)
            ret = true
        }

    })
    let extractors = room.find(FIND_STRUCTURES).filter(s=> s.structureType == STRUCTURE_EXTRACTOR)
    if(extractors.length >0){
        path = room.findPath(spawn.pos, extractors[0].pos, {
            ignoreCreeps: true,
            swampCost: 3
    
        })
        path.forEach(p => {
            let build = true
            let x = p.x
            let y = p.y
            let look = room.lookAt(x, y)
            look.forEach(function (lo) {
                if ((lo.type == LOOK_TERRAIN && lo.terrain == 'wall') || lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
                    build = false
                }
            })
            if (build) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD)
                ret = true
            }
    
        })


    }

    return ret
}

function buildContainers(room, spawn) {
    var ret = false
    const sources = room.find(FIND_SOURCES)
    const containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    const sites = room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_CONTAINER)

    sources.forEach(s => {
        let build = true
        containers.forEach(c => {
            if (s.pos.isNearTo(c)) {
                build = false
            }
        })
        sites.forEach(c => {
            if (s.pos.isNearTo(c)) {
                build = false
            }
        })

        if (build) {
            let path = s.pos.findPathTo(spawn, {
                ignoreCreeps: true,
                swampCost: 1
            })
            let x = path[0].x
            let y = path[0].y
            room.createConstructionSite(x, y, STRUCTURE_CONTAINER)
            ret = true
        }
    })
    return ret
}

function buildBunkerRoads(room, spawn) {
    //room.find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove())
    var ret = false
    const center = spawn.pos
    const roadFormulas = [[-1, -1], [-5, -1], [5, -1], [9, -1], [1, 1], [5, 1], [-5, 1], [-9, 1]]
    for (let j of roadFormulas) {
        for (let i = -4; i <= 8; i++) {
            let build = true
            let sign = j[1]
            let intercept = j[0]
            let x = i
            let y = (sign * x) + intercept
            if (y < -6 || y > 6) {
                continue
            }

            x += center.x
            y += center.y
            let look = room.lookAt(x, y)
            look.forEach(function (lo) {
                if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
                    build = false
                }
            })
            if (build) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD)
                ret = true
            }
        }
    }
    const BUNKER_ROAD_POSITIONS = [[-4, 0], [-4, -4], [-4, -5], [-3, -6], [-2, -6], [2, -6], [6, -6], [7, -6],
    [8, -5], [8, -4], [8, 0], [8, 4], [8, 5], [7, 6], [6, 6], [2, 6], [-2, 6], [-3, 6], [-4, 5], [-4, 4]]

    for (let pos of BUNKER_ROAD_POSITIONS) {
        let build = true
        x = pos[0] + center.x
        y = pos[1] + center.y
        let look = room.lookAt(x, y)
        look.forEach(function (lo) {
            if (lo.type == LOOK_STRUCTURES || lo.type == LOOK_CONSTRUCTION_SITES) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, STRUCTURE_ROAD)
            ret = true
        }

    }

    return ret
}

function buildExtensions(room, spawn) {
    // find center
    var ret = false
    var build = undefined
    const center = spawn.pos
    for (let pos of EXTENSION_POSITIONS) {
        build = true
        let x = center.x + pos[0]
        let y = center.y + pos[1]
        let look = room.lookAt(x, y)
        look.forEach(function (lo) {
            if ((lo.type == LOOK_STRUCTURES && lo.structure.structureType != STRUCTURE_RAMPART) || lo.type == LOOK_CONSTRUCTION_SITES) {
                build = false
            }
        })
        if (build) {
            room.createConstructionSite(x, y, STRUCTURE_EXTENSION)
            ret = true
        }
    }
    return ret
}

module.exports = autoBuild;