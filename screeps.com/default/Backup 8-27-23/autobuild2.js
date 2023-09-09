const { findIndex } = require("lodash");
const util_mincut = require('minicutRamparts')

const structureTypesByBuildPriority = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_CONTAINER,
    STRUCTURE_ROAD,
    STRUCTURE_STORAGE,
    STRUCTURE_TOWER,
    STRUCTURE_WALL,
    STRUCTURE_RAMPART,
    STRUCTURE_LINK,
    STRUCTURE_TERMINAL,
    STRUCTURE_EXTRACTOR,
    STRUCTURE_LAB,
    STRUCTURE_FACTORY,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_NUKER,
    STRUCTURE_OBSERVER,
]


/**
 * Generates and stores a blueprint and places construction sites based on blueprint.
 * @param {Room} room
 */
function autoBuild(room) {
    //if (room.name == 'W37S1') {
    //room.memory.buildMap = undefined
    //}
    /*let sites = room.find(FIND_CONSTRUCTION_SITES)
    for (let site of sites) {
        //site.remove()
    }*/


    //room.memory.outposts['W37S4'].workAssignedOnTick = 0

    if (Game.time % 20 == 0) {
        if (room.memory.buildMap == undefined) {
            if (Game.cpu.bucket < 500) {
                //console.log('Game.cpu.bucket',Game.cpu.bucket)
                return
            }
            generateBuildMap(room)


        }


        for (let outpost in room.memory.outposts) {
            let outpostRoom = Game.rooms[outpost]
            let buildMap = room.memory.outposts[outpost].buildMap
            if (outpostRoom && buildMap) {
                updatePlacedStatus(outpostRoom, buildMap)
            }
        }



        updatePlacedStatus(room, room.memory.buildMap)
        buildStructures(room)


    }
    if (Game.cpu.bucket > 100 && room.memory.buildMap) {
        for (let outpost in room.memory.outposts) {
            let outpostRoom = Game.rooms[outpost]
            if (outpostRoom && !room.memory.outposts[outpost].buildMap && room.memory.outposts[outpost].status == 'SETUP') {
                blueprintInfrastructure(room, outpostRoom)
            }
        }
    }

    visualizeStructures(room)
}

module.exports = autoBuild


function blueprintInfrastructure(homeRoom, targetRoom) {
    // rework this function. Look for outposts without blueprints
    let route = [homeRoom.name].concat(Game.map.findRoute(homeRoom, targetRoom).map(r => r.room))

    const sources = targetRoom.find(FIND_SOURCES)
    let homeTiles = homeRoom.memory.buildMap
    let storageTile = homeTiles.find(t => t.structure == STRUCTURE_STORAGE)
    let origin = new RoomPosition(storageTile.x, storageTile.y, homeRoom.name)
    for (let source of sources) {

        for (let i = 0; i < route.length; i++) {
            let tiles;
            let roomName = route[i]
            if (roomName == homeRoom.name) {
                tiles = homeRoom.memory.buildMap
            } else {
                tiles = homeRoom.memory.outposts[roomName].buildMap || []
            }
            let ret = PathFinder.search(origin, { pos: source.pos, range: 1 }, {
                plainCost: 3,
                swampCost: 4,
                maxOps: 4000,
                roomCallback: function () {
                    return buildRoadCostmatrix(tiles)
                },
            }).path.filter(r => r.roomName == roomName);

            // update tiles for each room
            for (let pos of ret) {
                if (pos.x == 0 || pos.x == 49 || pos.y == 0 || pos.y == 49) {
                    continue
                }
                let tile
                if (tiles.findIndex(t => t.x == pos.x && t.y == pos.y) > -1) {
                    tile = tiles.find(t => t.x == pos.x && t.y == pos.y)
                } else {
                    tile = new Tile(pos.x, pos.y, true)
                    tiles.push(tile)
                }

                if (i != route.length - 1 && (pos.x == 48 || pos.x == 1 || pos.y == 48 || pos.y == 1)) {
                    let nextTiles = homeRoom.memory.outposts[route[i + 1]].buildMap || []
                    let nextTile;
                    if (pos.x == 48) {
                        nextTile = new Tile(1, pos.y, true)
                    } else if (pos.x == 1) {
                        nextTile = new Tile(48, pos.y, true)
                    } else if (pos.y == 48) {
                        nextTile = new Tile(pos.x, 1, true)
                    } else if (pos.y == 1) {
                        nextTile = new Tile(pos.x, 48, true)
                    }
                    nextTile.structure = STRUCTURE_ROAD
                    nextTile.available = false
                    nextTile.center = false
                    nextTile.level = 3
                    nextTiles.push(nextTile)
                    homeRoom.memory.outposts[route[i + 1]].buildMap = nextTiles
                    origin = new RoomPosition(nextTile.x, nextTile.y, route[i + 1])
                }

                updateTile(pos.x, pos.y, STRUCTURE_ROAD, tiles, false, 3)

                if (pos.isNearTo(source)) {
                    tile = new Tile(pos.x, pos.y, true)
                    tile.structure = STRUCTURE_CONTAINER
                    tile.available = false
                    tile.center = false
                    tile.level = 3
                    tiles.push(tile)
                }
            }


            if (roomName == homeRoom.name) {
                homeRoom.memory.buildMap
            } else {
                homeRoom.memory.outposts[roomName].buildMap = tiles
            }
        }
    }



    /*
    if (!targetRoom) {
        return
    }
    
   
    let targetRoomTiles = []
    
    let costMatrix = buildRoadCostmatrix(homeTiles)
    for (let source of sources) {
        // find tile near source that is closest to exit to homeroom

        let target = { pos: source.pos, range: 1 }
        let ret = PathFinder.search(
            new RoomPosition(storageTile.x, storageTile.y, homeRoom.name), target, {
            plainCost: 3,
            swampCost: 3,
            roomCallback: function (roomName) {
                return costMatrix
            }
        })

        for (let pos of ret.path) {
            if (pos.x == 0 || pos.x == 49 || pos.y == 0 || pos.y == 49) {
                continue
            }
            let tile;
            if (pos.roomName == homeRoom.name) {

                if (homeTiles.findIndex(t => t.x == pos.x && t.y == pos.y) > -1) {
                    tile = homeTiles.find(t => t.x == pos.x && t.y == pos.y)
                } else {
                    tile = new Tile(pos.x, pos.y, true)
                    homeTiles.push(tile)
                }
                updateTile(pos.x, pos.y, STRUCTURE_ROAD, homeTiles, false, 3)
                costMatrix.set(pos.x, pos.y, 2)
            } else {
                tile = new Tile(pos.x, pos.y, true)
                targetRoomTiles.push(new Tile(pos.x, pos.y, true))
                if (pos.isNearTo(source.pos)) {
                    updateTile(pos.x, pos.y, STRUCTURE_CONTAINER, targetRoomTiles, false, 3)
                } else {
                    updateTile(pos.x, pos.y, STRUCTURE_ROAD, targetRoomTiles, false, 3)
                }
            }
        }
    }
    homeRoom.memory.outposts[targetRoom.name].buildMap = targetRoomTiles
    homeRoom.memory.outposts[targetRoom.name].status = 'OPERATION'
    */
}




function visualizeStructures(room) {
    let tiles = room.memory.buildMap // Tile[]
    if (tiles == undefined) {
        return
    }
    for (let tile of tiles) {

        if (tile.structure && !tile.placed && tile.level <= 8 && tile.structure != STRUCTURE_RAMPART) {//room.controller.level
            // Visualize the tile based on its structure type
            room.visual.structure(tile.x, tile.y, tile.structure)
        }
    }
    room.visual.connectRoads()

}



/**
 * Places construction sites.
 * @param {Room} room 
 */
function buildStructures(room) {
    let count = room.find(FIND_CONSTRUCTION_SITES).length
    if (count > 0) {
        return
    }
    const RCL = room.controller.level
    let tiles = room.memory.buildMap
    let targetTiles = tiles.filter(t => t.level <= RCL && t.placed == false)
    for (let i = 0; i < structureTypesByBuildPriority.length; i++) {
        for (let t of targetTiles) {
            if (count >= 10) {
                return
            }
            if (t.structure == structureTypesByBuildPriority[i]) {
                const ret = room.createConstructionSite(t.x, t.y, t.structure);
                if (ret == 0) {
                    count++
                }
            }
        }
    }
    room.memory.buildMap = tiles
}

/**
 * Updates the Tile.placed status to false if the tile.structure does not exist at a position (x,y)
 * @param {Room} room 
 */
function updatePlacedStatus(room, tiles) {
    for (let tile of tiles) {
        // check for tile.structure at (tile.x, tile.y)
        const look = room.lookAt(tile.x, tile.y)

        let structures = look.filter(lo => (lo.type == LOOK_STRUCTURES && lo.structure.structureType == tile.structure) || (lo.type == LOOK_CONSTRUCTION_SITES && lo.constructionSite.structureType == tile.structure))
        // If no structure exists at that tile, set tile.placed to false
        if (structures.length == 0) {
            tile.placed = false
        } else {
            tile.placed = true
        }
    }
}

class Tile {
    /**
     * Stores a blueprint for a tile
     * @param {number} x 
     * @param {number} y 
     * @param {string} roomName 
     * @param {boolean} available 
     * @param {number} level
     * @param {number} priority
     */
    constructor(x, y, available) {
        this.x = x
        this.y = y
        this.available = available
        this.structure = undefined
        this.center = false
        this.level = 8
        this.placed = false
    }
}

/**
 * Updates a tile object with a structure
 * @param {number} x 
 * @param {number} y 
 * @param {StructureConstant} structure 
 * @param {Tile[]} tiles 
 * @param {RoomPosition} center 
 * @param {number} level 
 */
function updateTile(x, y, structure, tiles, center, level) {
    let tile = tiles.find(t => t.x == x && t.y == y)
    if (tile && tile.available == false && structure == STRUCTURE_RAMPART) {
        let newTile = new Tile(x, y, tile.roomName, false)
        newTile.structure = structure
        newTile.available = false
        newTile.center = false
        newTile.level = level
        tiles.push(newTile)
    } else if (tile) {
        tile.structure = structure
        tile.available = false
        tile.center = center
        tile.level = Math.min(level, tile.level)
    }
}

/**
 * Finds an open area for a block of structures.
 * @param {StructureConstant[]} BUILDINGS 
 * @param {RoomPosition} start 
 * @param {Tile[]} tiles 
 * @returns {[number,number]} The x and y coordinate for a found open area, or undefined.
 */
function findOpenTiles(BUILDINGS, start, tiles, room) {
    let range = 0
    let found = false
    let linkTiles = tiles.filter(t => t.structure == STRUCTURE_LINK)


    while (!found && range < 25) {
        for (let x = start.x - range; x <= start.x + range; x++) {
            for (let y = start.y - range; y <= start.y + range; y++) {
                found = true;

                for (let building of BUILDINGS) {

                    let lookX = x + building[0]
                    let lookY = y + building[1]
                    let buildingPos = new RoomPosition(lookX, lookY, room.name)
                    for (let linkTile of linkTiles) {
                        let linkPos = new RoomPosition(linkTile.x, linkTile.y, room.name)
                        if (linkPos.getRangeTo(buildingPos) < 3) {
                            found = false
                        }
                    }
                    let tile = tiles.find(t => t.x == lookX && t.y == lookY)
                    if (tile.structure == STRUCTURE_ROAD && building[2] == STRUCTURE_ROAD) {
                        continue
                    }
                    if (tile.available == false) {
                        found = false
                        break
                    }
                }
                if (found) {
                    return [x, y]
                }
            }
        }
        range++
    }
    return undefined
}

/**
 * 
 * @param {Room} room 
 */
function generateBuildMap(room) {
    if (room.memory == undefined) {
        room.memory = {}
    }

    let terrain = new Room.Terrain(room.name)
    let tiles = []
    // Create a 50x50 grid.
    // Mark all terrain walls as unavailable, open spaces as available.
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            let available = true
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                available = false
            }
            tiles.push(new Tile(x, y, available))
        }
    }

    // Find center between map center, spawn, sources, controller, and mineral.
    const spawn = room.find(FIND_MY_SPAWNS)[0]
    const sources = room.find(FIND_SOURCES)
    const controller = room.controller
    const mineral = room.find(FIND_MINERALS)[0]
    const midX = Math.round([spawn.pos.x].concat(sources.map(s => s.pos.x)).concat(controller.pos.x).concat(mineral.pos.x).concat(25).reduce((a, b) => a + b) / (4 + sources.length))
    const midY = Math.round([spawn.pos.y].concat(sources.map(s => s.pos.y)).concat(controller.pos.y).concat(mineral.pos.y).concat(25).reduce((a, b) => a + b) / (4 + sources.length))
    let center = new RoomPosition(midX, midY, room.name)

    mapSpawnBlock(spawn, tiles)
    mapContainers(room, tiles, center)
    mapHub(tiles, center, room)

    // Find storage and make that the center.
    const storageTile = tiles.find(t => t.structure == STRUCTURE_STORAGE)
    center = new RoomPosition(storageTile.x, storageTile.y, room.name)
    mapLabs(tiles, center, room)

    // Map 9 stamps of extensions.
    for (let i = 0; i < 5; i++) {
        mapExtensions(tiles, center, i, room)
    }

    mapRoads(tiles, room)
    mapLinks(tiles, room, center)
    mapExtractor(tiles, room)
    mapIndividualStructures(tiles, room, center)
    mapRamparts(tiles, room, center)

    tiles.forEach(t => {
        delete t.center
        delete t.available
    })

    room.memory.buildMap = tiles.filter(t => t.structure != undefined)
}

/**
 * Maps the spawn block of scructures
 * @param {StructureSpawn} spawn 
 * @param {tile[]} tiles 
 */
function mapSpawnBlock(spawn, tiles) {
    const BUILDINGS = [
        [-2, -1, STRUCTURE_ROAD, 2],
        [-1, -1, STRUCTURE_ROAD, 2],
        [0, -1, STRUCTURE_ROAD, 2],
        [1, -1, STRUCTURE_ROAD, 2],
        [2, -1, STRUCTURE_ROAD, 2],
        [-3, 0, STRUCTURE_ROAD, 2],
        [-2, 0, STRUCTURE_EXTENSION, 2],
        [-1, 0, STRUCTURE_EXTENSION, 2],
        [0, 0, STRUCTURE_SPAWN, 1],
        [0, 0, STRUCTURE_RAMPART, 4],
        [1, 0, STRUCTURE_EXTENSION, 2],
        [2, 0, STRUCTURE_EXTENSION, 2],
        [3, 0, STRUCTURE_ROAD, 2],
        [-3, 1, STRUCTURE_ROAD, 2],
        [-2, 1, STRUCTURE_EXTENSION, 2],
        [-1, 1, undefined, 1],
        [0, 1, STRUCTURE_EXTENSION, 3],
        [1, 1, undefined, 1],
        [2, 1, STRUCTURE_EXTENSION, 3],
        [3, 1, STRUCTURE_ROAD, 2],
        [-3, 2, STRUCTURE_ROAD, 2],
        [-2, 2, STRUCTURE_CONTAINER, 6],
        [-1, 2, STRUCTURE_EXTENSION, 3],
        [0, 2, STRUCTURE_LINK, 6],
        [1, 2, STRUCTURE_EXTENSION, 3],
        [2, 2, STRUCTURE_CONTAINER, 6],
        [3, 2, STRUCTURE_ROAD, 2],
        [-3, 3, STRUCTURE_ROAD, 2],
        [-2, 3, STRUCTURE_EXTENSION, 3],
        [-1, 3, undefined, 2],
        [0, 3, STRUCTURE_EXTENSION, 4],
        [1, 3, undefined, 2],
        [2, 3, STRUCTURE_EXTENSION, 4],
        [3, 3, STRUCTURE_ROAD, 2],
        [-3, 4, STRUCTURE_ROAD, 2],
        [-2, 4, STRUCTURE_SPAWN, 7],
        [-2, 4, STRUCTURE_RAMPART, 4],
        [-1, 4, STRUCTURE_EXTENSION, 4],
        [0, 4, STRUCTURE_EXTENSION, 4],
        [1, 4, STRUCTURE_EXTENSION, 4],
        [2, 4, STRUCTURE_SPAWN, 8],
        [2, 4, STRUCTURE_RAMPART, 4],
        [3, 4, STRUCTURE_ROAD, 2],
        [-2, 5, STRUCTURE_ROAD, 2],
        [-1, 5, STRUCTURE_ROAD, 2],
        [0, 5, STRUCTURE_ROAD, 2],
        [1, 5, STRUCTURE_ROAD, 2],
        [2, 5, STRUCTURE_ROAD, 2],
    ]
    let centerX = spawn.pos.x
    let centerY = spawn.pos.y

    BUILDINGS.forEach(b => {
        let isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, b[3])
    })
}

/**
 * Maps the source and mineral containers
 * @param {Room} room 
 * @param {Tile[]} tiles 
 * @param {RoomPosition} center
 */
function mapContainers(room, tiles, center) {
    //Map source containers
    let sources = room.find(FIND_SOURCES)
    for (let source of sources) {

        let sourceTiles = tiles.filter(t => {
            const pos = new RoomPosition(t.x, t.y, room.name)

            return (t.available == true && pos.isNearTo(source))
        })

        let targetTile = _.min(sourceTiles, t => {
            const pos = new RoomPosition(t.x, t.y, room.name)
            const path = pos.findPathTo(center)
            return path.length
        })

        let [centerX, centerY] = [targetTile.x, targetTile.y]

        updateTile(centerX, centerY, STRUCTURE_CONTAINER, tiles, true, 1)
        updateTile(centerX, centerY, STRUCTURE_RAMPART, tiles, false, 4)

    }

    // Map mineral container.
    let minerals = room.find(FIND_MINERALS)
    for (let mineral of minerals) {

        let mineralTiles = tiles.filter(t => {
            const pos = new RoomPosition(t.x, t.y, room.name)
            return (t.available == true && pos.isNearTo(mineral))
        })

        let targetTile = _.min(mineralTiles, t => {
            const pos = new RoomPosition(t.x, t.y, room.name)
            const path = pos.findPathTo(center)
            return path.length
        })
        let [centerX, centerY] = [targetTile.x, targetTile.y]

        updateTile(centerX, centerY, STRUCTURE_CONTAINER, tiles, true, 6)
        updateTile(centerX, centerY, STRUCTURE_RAMPART, tiles, false, 6)
    }
}

/**
 * Maps the hub block of structures
 * @param {Tile[]} tiles 
 * @param {RoomPosition} center 
 */
function mapHub(tiles, center, room) {
    const BUILDINGS = [
        [-1, -2, STRUCTURE_ROAD, 4],
        [0, -2, STRUCTURE_ROAD, 4],
        [1, -2, STRUCTURE_ROAD, 4],
        [-2, -1, STRUCTURE_ROAD, 4],
        [-1, -1, STRUCTURE_TERMINAL, 6],
        [-1, -1, STRUCTURE_RAMPART, 6],
        [0, -1, STRUCTURE_LINK, 5],
        [1, -1, STRUCTURE_STORAGE, 4],
        [1, -1, STRUCTURE_RAMPART, 4],
        [2, -1, STRUCTURE_ROAD, 4],
        [-2, 0, STRUCTURE_ROAD, 4],
        [-1, 0, STRUCTURE_NUKER, 8],
        [-1, 0, STRUCTURE_RAMPART, 8],
        [0, 0, STRUCTURE_ROAD, 4],
        [1, 0, STRUCTURE_POWER_SPAWN, 8],
        [1, 0, STRUCTURE_RAMPART, 8],
        [2, 0, STRUCTURE_ROAD, 4],
        [-1, 1, STRUCTURE_ROAD, 4],
        [0, 1, STRUCTURE_FACTORY, 7],
        [0, 1, STRUCTURE_RAMPART, 7],
        [1, 1, STRUCTURE_ROAD, 4],
        [0, 2, STRUCTURE_ROAD, 4],
    ]

    // Find open area for template.
    let [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles, room)

    BUILDINGS.forEach(b => {
        let isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, b[3])
    })
}

/**
 * Maps the labs block of structures.
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapLabs(tiles, center, room) {
    const BUILDINGS = [
        [0, -2, STRUCTURE_LAB, 6],
        [1, -2, STRUCTURE_LAB, 6],
        [2, -2, STRUCTURE_ROAD, 6],
        [-1, -1, STRUCTURE_LAB, 6],
        [0, -1, STRUCTURE_LAB, 7],
        [1, -1, STRUCTURE_ROAD, 6],
        [2, -1, STRUCTURE_LAB, 7],
        [-1, 0, STRUCTURE_LAB, 7],
        [0, 0, STRUCTURE_ROAD, 6],
        [1, 0, STRUCTURE_LAB, 8],
        [2, 0, STRUCTURE_LAB, 8],
        [-1, 1, STRUCTURE_ROAD, 6],
        [0, 1, STRUCTURE_LAB, 8],
        [1, 1, STRUCTURE_LAB, 8],
    ]

    const [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles, room)

    BUILDINGS.forEach(b => {
        const isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, b[3])
    })
}

/**
 * Maps an extension block of structures.
 * @param {Tile[]} tiles 
 * @param {RoomPosition} center 
 * @param {number} round Number representing the order of building placement
 */
function mapExtensions(tiles, center, round, room) {
    const BUILDINGS = [
        [0, -2, STRUCTURE_ROAD],
        [-1, -1, STRUCTURE_ROAD],
        [0, -1, STRUCTURE_EXTENSION],
        [1, -1, STRUCTURE_ROAD],
        [-2, 0, STRUCTURE_ROAD],
        [-1, 0, STRUCTURE_EXTENSION],
        [0, 0, STRUCTURE_EXTENSION],
        [1, 0, STRUCTURE_EXTENSION],
        [2, 0, STRUCTURE_ROAD],
        [-1, 1, STRUCTURE_ROAD],
        [0, 1, STRUCTURE_EXTENSION],
        [1, 1, STRUCTURE_ROAD],
        [0, 2, STRUCTURE_ROAD],
    ]
    const roundRCL = [4, 5, 5, 6, 6]

    const [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles, room)

    BUILDINGS.forEach(b => {
        const isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, roundRCL[round])
    })
}

/**
 * Map the extractor.
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapExtractor(tiles, room) {
    let mineral = room.find(FIND_MINERALS)[0]
    updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR, tiles, true, 6)
}

/**
 * Map Link structures
 * @param {Tile[]} tiles 
 * @param {Room} room 
 * @param {RoomPosition} center
 */
function mapLinks(tiles, room, center) {
    const controller = room.controller
    let linkTiles = tiles.filter(t => {
        const pos = new RoomPosition(t.x, t.y, room.name)
        if (pos.getRangeTo(controller) <= 3 && t.available == true) {
            for (let x = pos.x - 1; x <= pos.x + 1; x++) {
                for (let y = pos.y - 1; y <= pos.y + 1; y++) {
                    if (tiles.find(t => t.x == x && t.y == y && t.available == false)) {
                        return false
                    }
                }
            }
        } else {
            return false
        }

        return true
    })
    if (linkTiles.length == 0) {
        linkTiles = tiles.filter(t => {
            const pos = new RoomPosition(t.x, t.y, room.name)
            return pos.getRangeTo(controller) <= 3 && t.available == true
        })
    }
    const targetTile = _.min(linkTiles, t => {
        const pos = new RoomPosition(t.x, t.y, room.name)
        return pos.getRangeTo(center)
    })
    updateTile(targetTile.x, targetTile.y, STRUCTURE_LINK, tiles, true, 5)

    for (let x = targetTile.x - 2; x <= targetTile.x + 2; x++) {
        for (let y = targetTile.y - 2; y <= targetTile.y + 2; y++) {
            let tile = tiles.find(t => t.x == x && t.y == y && t.available)
            if(tile){
                tile.available = false
            }
        }
    }
}

/**
 * Map connecting roads
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapRoads(tiles, room) {
    let costMatrix = buildRoadCostmatrix(tiles)
    let sources = room.find(FIND_SOURCES)
    let controller = room.controller
    for (let source of sources) {
        costMatrix = placeRoad(source.pos, controller.pos, costMatrix, tiles, 1, 2)
    }
    let centers = tiles.filter(t => t.center == true)
    for (let center of centers) {
        for (let _center of centers) {
            if (center.x == _center.x && center.y == _center.y) {
                continue
            }
            const fromPos = new RoomPosition(center.x, center.y, room.name)
            const toPos = new RoomPosition(_center.x, _center.y, room.name)
            costMatrix = placeRoad(fromPos, toPos, costMatrix, tiles, Math.max(center.level, _center.level), 2)
        }
    }
}

/**
 * Builds the initial costmatrix for road placement.
 * @param {Tile[]} tiles 
 * @returns {CostMatrix}
 */
function buildRoadCostmatrix(tiles) {
    let costs = new PathFinder.CostMatrix;
    for (let tile of tiles) {
        if (tile.available == false) {
            costs.set(tile.x, tile.y, 0xff)
        }
        if (tile.structure == STRUCTURE_ROAD) {
            costs.set(tile.x, tile.y, 2)
        }
    }
    return costs
}

/**
 * 
 * @param {RoomPosition} fromPos 
 * @param {RoomPosition} toPos 
 * @param {CostMatrix} costMatrix 
 * @param {Tile[]} tiles 
 * @param {number} level 
 * @returns {CostMatrix}
 */
function placeRoad(fromPos, toPos, costMatrix, tiles, level, roadCost) {
    let target = { pos: toPos, range: 1 }

    let ret = PathFinder.search(
        fromPos, target, {
        plainCost: 3,
        swampCost: 3,
        roomCallback: function (roomName) {
            return costMatrix
        }
    })

    for (let pos of ret.path) {
        const tile = tiles.find(t => t.x == pos.x && t.y == pos.y)
        updateTile(pos.x, pos.y, STRUCTURE_ROAD, tiles, false, level)
        costMatrix.set(pos.x, pos.y, roadCost)
    }
    return costMatrix
}

/**
 * Maps positions for 6 Towers, 1 Observer closest to center.
 * @param {Tile[]} tiles 
 * @param {Room} room 
 * @param {RoomPosition} center 
 */
function mapIndividualStructures(tiles, room, center) {
    const BUILDINGS = [
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 7],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_EXTENSION, 8],
        [STRUCTURE_OBSERVER, 8],
    ]
    let availablePos = tiles.filter(t => {
        if (!t.available) {
            return false
        }
        let nearRoad = false
        for (let x = -1; x <= 1; x++) {
            if (nearRoad) break;



            for (let y = -1; y <= 1; y++) {
                if (nearRoad) break;
                let tile = tiles.find(tile => tile.x == x + t.x && tile.y == y + t.y)
                if (tile && tile.structure == STRUCTURE_ROAD) {
                    nearRoad = true
                }
            }
        }
        return nearRoad
    }).map(t => new RoomPosition(t.x, t.y, room.name))
    for (let building of BUILDINGS) {
        const pos = _.min(availablePos, p => p.getRangeTo(center))
        availablePos.splice(availablePos.findIndex(p => p.x == pos.x && p.y == pos.y), 1)
        updateTile(pos.x, pos.y, building[0], tiles, false, building[1])
        if (building[0] == STRUCTURE_TOWER) {
            updateTile(pos.x, pos.y, STRUCTURE_RAMPART, tiles, false, building[1])
        }
    }
}

cmp = function (a, b) {
    if (a > b) return +1;
    if (a < b) return -1;
    return 0;
}

/**
 * 
 * @param {Tile[]} tiles 
 * @param {Room} room 
 * @param {RoomPosition} center
 */
function mapRamparts(tiles, room, center) {
    let buildings = [
        [STRUCTURE_TOWER, 3],
        [STRUCTURE_TOWER, 5],
        [STRUCTURE_TOWER, 7],
        [STRUCTURE_TOWER, 8],
        [STRUCTURE_TOWER, 8],
        [STRUCTURE_TOWER, 8]
    ]


    let output = util_mincut.test(room.name, tiles)
    output = output.sort(function (a, b) {
        return cmp(a.x, b.x) || cmp(a.y, b.y)
    })
    let connectedRamparts = []
    let last = undefined
    output.forEach(o => {
        updateTile(o.x, o.y, STRUCTURE_ROAD, tiles, false, 4)
        updateTile(o.x, o.y, STRUCTURE_RAMPART, tiles, false, 4)
        let pos = new RoomPosition(o.x, o.y, room.name)
        let connectedRampart = connectedRamparts[connectedRamparts.length - 1]
        if (last && pos.isNearTo(last)) {
            connectedRampart.push(pos);
            connectedRamparts[connectedRamparts.length - 1] = connectedRampart;
        } else {
            connectedRamparts.push([pos])
        }
        last = pos
    })
    let costMatrix = buildRampartRoadCostMatrix(tiles)
    // Get middle of ramparts
    let midpoints = []
    connectedRamparts.forEach(r => {
        const idx = Math.max(Math.floor(((r.length) / 2)), 0)
        const mid = new RoomPosition(r[idx].x, r[idx].y, room.name)
        midpoints.push(mid)
    })
    // build roads from each rampart to each storage
    midpoints.forEach(m => {

        const fromPos = m
        const toPos = new RoomPosition(center.x, center.y, room.name)
        costMatrix = placeRoad(fromPos, toPos, costMatrix, tiles, 4, 1)
    })

    // Place towers
    midpoints.forEach(m => {
        // get road tiles at range 3 from midpoint
        const towerRoadTiles = tiles.filter(t => t.structure == STRUCTURE_ROAD && m.getRangeTo(new RoomPosition(t.x, t.y, room.name)) == 2)

        // find closest road tile to storage
        const roadTile = _.min(towerRoadTiles, t => new RoomPosition(t.x, t.y, room.name).getRangeTo(center))
        // place tower next to road
        let availablePos = tiles.filter(t => {
            if (t.available && new RoomPosition(t.x, t.y, room.name).isNearTo(new RoomPosition(roadTile.x, roadTile.y, room.name))) {
                return true
            }
            return false
        }).map(t => new RoomPosition(t.x, t.y, room.name))

        if (buildings.length > 0) {
            let building = buildings.pop()
            const pos = _.min(availablePos, p => p.getRangeTo(center))
            if (pos) {
                availablePos.splice(availablePos.findIndex(p => p.x == pos.x && p.y == pos.y), 1)
                updateTile(pos.x, pos.y, building[0], tiles, false, building[1])
                updateTile(pos.x, pos.y, STRUCTURE_RAMPART, tiles, false, building[1])
            }
        }
    })
    midpoints.forEach(m => {
        // get road tiles at range 3 from midpoint
        const towerRoadTiles = tiles.filter(t => t.structure == STRUCTURE_ROAD && m.getRangeTo(new RoomPosition(t.x, t.y, room.name)) == 2)

        // find closest road tile to storage
        const roadTile = _.min(towerRoadTiles, t => new RoomPosition(t.x, t.y, room.name).getRangeTo(center))
        // place tower next to road
        let availablePos = tiles.filter(t => {
            if (t.available && new RoomPosition(t.x, t.y, room.name).isNearTo(new RoomPosition(roadTile.x, roadTile.y, room.name))) {
                return true
            }
            return false
        }).map(t => new RoomPosition(t.x, t.y, room.name))


        if (buildings.length > 0) {
            let building = buildings.pop()
            const pos = _.min(availablePos, p => p.getRangeTo(center))
            availablePos.splice(availablePos.findIndex(p => p.x == pos.x && p.y == pos.y), 1)
            updateTile(pos.x, pos.y, building[0], tiles, false, building[1])
            updateTile(pos.x, pos.y, STRUCTURE_RAMPART, tiles, false, building[1])
        }
    })

}

function buildRampartRoadCostMatrix(tiles) {
    let costs = new PathFinder.CostMatrix;
    for (let tile of tiles) {
        if (tile.available == false && tile.structure != STRUCTURE_ROAD && tile.structure != STRUCTURE_RAMPART) {
            costs.set(tile.x, tile.y, 0xff)
        } else
            if (tile.structure == STRUCTURE_ROAD) {
                costs.set(tile.x, tile.y, 1)
            } else if (tile.structure == STRUCTURE_RAMPART && !tiles.find(t => t.x == tile.x && t.y == tile.y && t.structure != STRUCTURE_RAMPART && t.structure != STRUCTURE_ROAD)) {
                costs.set(tile.x, tile.y, 1)
            }
    }
    return costs
}
