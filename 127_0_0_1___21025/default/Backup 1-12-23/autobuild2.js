const { findIndex } = require("lodash");

/**
 * Generates and stores a blueprint and places construction sites based on blueprint.
 * @param {Room} room
 */
function autoBuild(room) {
    /*room.memory.buildMap = undefined
       let sites = room.find(FIND_CONSTRUCTION_SITES)
       for (let site of sites) {
           site.remove()
       }*/

    if (Game.time % 100 == 0) {

        if (room.memory.buildMap == undefined) {
            generateBuildMap(room)
        }
        updatePlacedStatus(room)

        buildStructures(room)

    }
    visualizeStructures(room)
}

module.exports = autoBuild

function visualizeStructures(room) {
    let tiles = room.memory.buildMap // Tile[]

    //mapRamparts(tiles, room)

    for (let tile of tiles) {
        if (tile.structure && !tile.placed && tile.level <= room.controller.level) {
            // Visualize the tile based on its structure type
            new RoomVisual(tile.roomName).circle(tile.x, tile.y, {
                fill: structureToColor(tile.structure),
                radius: 0.25
            })
        }
    }
}

function structureToColor(structureType) {
    switch (structureType) {
        case STRUCTURE_SPAWN:
            return 'green'
        case STRUCTURE_EXTENSION:
            return 'yellow'
        case STRUCTURE_TOWER:
            return 'red'
        case STRUCTURE_STORAGE:
            return 'purple'
        case STRUCTURE_LAB:
            return 'blue'
        case STRUCTURE_TERMINAL:
            return 'pink'
        case STRUCTURE_FACTORY:
            return 'orange'
        case STRUCTURE_OBSERVER:
            return 'white'
        case STRUCTURE_POWER_SPAWN:
            return 'cyan'
        case STRUCTURE_NUKER:
            return 'brown'
        case STRUCTURE_LINK:
            return 'lightblue'
        case STRUCTURE_CONTAINER:
            return 'black'
        case STRUCTURE_ROAD:
            return 'gray'
        default:
            return 'lightorange'
    }
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
    let targetTiles = tiles.filter(t => t.level <= RCL && t.placed == false).sort((a, b) => ((a.level - b.level) || (a.priority - b.priority)))

    for (let t of targetTiles) {
        if (count >= 10) {
            break
        }
        const ret = room.createConstructionSite(t.x, t.y, t.structure);
        if (ret == 0) {
            count++
        }
    }
    room.memory.buildMap = tiles
}

/**
 * Updates the Tile.placed status to false if the tile.structure does not exist at a position (x,y)
 * @param {Room} room 
 */
function updatePlacedStatus(room) {
    let tiles = room.memory.buildMap

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

    room.memory.tiles = tiles
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
    constructor(x, y, roomName, available) {
        this.x = x
        this.y = y
        this.roomName = roomName
        this.available = available
        this.structure = undefined
        this.center = false
        this.level = 8
        this.priority = 5
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
 * @param {number} priority 
 * @param {number} level 
 */
function updateTile(x, y, structure, tiles, center, priority, level) {
    let tile = tiles.find(t => t.x == x && t.y == y)
    tile.structure = structure
    tile.available = false
    tile.center = center

    tile.priority = Math.min(priority, tile.priority)
    tile.level = Math.min(level, tile.level)
}

/**
 * Finds an open area for a block of structures.
 * @param {StructureConstant[]} BUILDINGS 
 * @param {RoomPosition} start 
 * @param {Tile[]} tiles 
 * @returns {[number,number]} The x and y coordinate for a found open area, or undefined.
 */
function findOpenTiles(BUILDINGS, start, tiles) {
    let range = 0
    let found = false
    while (!found && range < 25) {
        for (let x = start.x - range; x <= start.x + range; x++) {
            for (let y = start.y - range; y <= start.y + range; y++) {
                found = true;
                for (let building of BUILDINGS) {
                    let lookX = x + building[0]
                    let lookY = y + building[1]
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
            tiles.push(new Tile(x, y, room.name, available))
        }
    }

    let spawn = room.find(FIND_MY_SPAWNS)[0]
    mapSpawnBlock(spawn, tiles)

    mapContainers(room, tiles)

    // Find center between map center, spawn, sources, controller, and mineral.
    let sources = room.find(FIND_SOURCES)
    let controller = room.controller
    let mineral = room.find(FIND_MINERALS)[0]
    let midX = Math.round([spawn.pos.x].concat(sources.map(s => s.pos.x)).concat(controller.pos.x).concat(mineral.pos.x).concat(25).reduce((a, b) => a + b) / (4 + sources.length))
    let midY = Math.round([spawn.pos.y].concat(sources.map(s => s.pos.y)).concat(controller.pos.y).concat(mineral.pos.y).concat(25).reduce((a, b) => a + b) / (4 + sources.length))
    let center = new RoomPosition(midX, midY, room.name)

    mapHub(tiles, center)

    mapLabs(tiles, room)

    // Map 9 stamps of extensions.
    for (let i = 0; i < 8; i++) {
        mapExtensions(tiles, center, i)
    }

    mapRoads(tiles, room)

    mapLinks(tiles, room)

    mapExtractor(tiles, room)

    mapIndividualStructures(tiles, room, center)

    mapRamparts(tiles, room)

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
        [-2, 0, STRUCTURE_EXTENSION, 0],
        [-1, 0, STRUCTURE_EXTENSION, 0],
        [0, 0, STRUCTURE_SPAWN, 0],
        [1, 0, STRUCTURE_EXTENSION, 0],
        [2, 0, STRUCTURE_EXTENSION, 0],
        [3, 0, STRUCTURE_ROAD, 2],
        [-3, 1, STRUCTURE_ROAD, 2],
        [-2, 1, STRUCTURE_EXTENSION, 0],
        [-1, 1, STRUCTURE_ROAD, 2],
        [0, 1, STRUCTURE_EXTENSION, 0],
        [1, 1, STRUCTURE_ROAD, 2],
        [2, 1, STRUCTURE_EXTENSION, 0],
        [3, 1, STRUCTURE_ROAD, 2],
        [-3, 2, STRUCTURE_ROAD, 2],
        [-2, 2, STRUCTURE_CONTAINER, 3],
        [-1, 2, STRUCTURE_EXTENSION, 0],
        [0, 2, STRUCTURE_LINK, 2],
        [1, 2, STRUCTURE_EXTENSION, 0],
        [2, 2, STRUCTURE_CONTAINER, 3],
        [3, 2, STRUCTURE_ROAD, 2],
        [-3, 3, STRUCTURE_ROAD, 2],
        [-2, 3, STRUCTURE_EXTENSION, 0],
        [-1, 3, STRUCTURE_ROAD, 2],
        [0, 3, STRUCTURE_EXTENSION, 0],
        [1, 3, STRUCTURE_ROAD, 2],
        [2, 3, STRUCTURE_EXTENSION, 0],
        [3, 3, STRUCTURE_ROAD, 2],
        [-3, 4, STRUCTURE_ROAD, 2],
        [-2, 4, STRUCTURE_SPAWN, 0],
        [-1, 4, STRUCTURE_EXTENSION, 0],
        [0, 4, STRUCTURE_EXTENSION, 0],
        [1, 4, STRUCTURE_EXTENSION, 0],
        [2, 4, STRUCTURE_SPAWN, 0],
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
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, b[3], 1)
    })
}

/**
 * Maps the source and mineral containers
 * @param {Room} room 
 * @param {Tile[]} tiles 
 */
function mapContainers(room, tiles) {

    //Map source containers
    let sources = room.find(FIND_SOURCES)
    for (let source of sources) {

        let sourceTiles = tiles.filter(t => {
            const pos = new RoomPosition(t.x, t.y, t.roomName)
            return (t.available == true && pos.isNearTo(source))
        })

        let targetTile = _.min(sourceTiles, t => {
            const pos = new RoomPosition(t.x, t.y, t.roomName)
            return pos.getRangeTo(25, 25)
        })

        let [centerX, centerY] = [targetTile.x, targetTile.y]

        updateTile(centerX, centerY, STRUCTURE_CONTAINER, tiles, true, 1, 1)

    }

    // Map mineral container.
    let minerals = room.find(FIND_MINERALS)
    for (let mineral of minerals) {

        let mineralTiles = tiles.filter(t => {
            const pos = new RoomPosition(t.x, t.y, t.roomName)
            return (t.available == true && pos.isNearTo(mineral))
        })

        let targetTile = _.min(mineralTiles, t => {
            const pos = new RoomPosition(t.x, t.y, t.roomName)
            return pos.getRangeTo(25, 25)
        })

        let [centerX, centerY] = [targetTile.x, targetTile.y]

        updateTile(centerX, centerY, STRUCTURE_CONTAINER, tiles, true, 1, 6)

    }
}

/**
 * Maps the hub block of structures
 * @param {Tile[]} tiles 
 * @param {RoomPosition} center 
 */
function mapHub(tiles, center) {
    const BUILDINGS = [
        [-1, -2, STRUCTURE_ROAD, 2],
        [0, -2, STRUCTURE_ROAD, 2],
        [1, -2, STRUCTURE_ROAD, 2],
        [-2, -1, STRUCTURE_ROAD, 2],
        [-1, -1, STRUCTURE_TERMINAL, 2],
        [0, -1, STRUCTURE_LINK, 1],
        [1, -1, STRUCTURE_STORAGE, 1],
        [2, -1, STRUCTURE_ROAD, 2],
        [-2, 0, STRUCTURE_ROAD, 2],
        [-1, 0, STRUCTURE_NUKER, 2],
        [0, 0, STRUCTURE_ROAD, 2],
        [1, 0, STRUCTURE_POWER_SPAWN, 2],
        [2, 0, STRUCTURE_ROAD, 2],
        [-1, 1, STRUCTURE_ROAD, 2],
        [0, 1, STRUCTURE_FACTORY, 2],
        [1, 1, STRUCTURE_ROAD, 2],
        [0, 2, STRUCTURE_ROAD, 2],
    ]

    // Find open area for template.
    let [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles)

    BUILDINGS.forEach(b => {
        let isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, b[3], 3)
    })
}

/**
 * Maps the labs block of structures.
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapLabs(tiles, room) {
    const BUILDINGS = [
        [0, -2, STRUCTURE_LAB],
        [-1, -1, STRUCTURE_LAB],
        [0, -1, STRUCTURE_LAB],
        [1, -1, STRUCTURE_ROAD],
        [-2, 0, STRUCTURE_LAB],
        [-1, 0, STRUCTURE_LAB],
        [0, 0, STRUCTURE_ROAD],
        [1, 0, STRUCTURE_LAB],
        [2, 0, STRUCTURE_LAB],
        [-1, 1, STRUCTURE_ROAD],
        [0, 1, STRUCTURE_LAB],
        [1, 1, STRUCTURE_LAB],
        [0, 2, STRUCTURE_LAB],
    ]

    // Find storage and make that the center.
    const storageTile = tiles.find(t => t.structure == STRUCTURE_STORAGE)
    const center = new RoomPosition(storageTile.x, storageTile.y, room.name)
    const [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles)

    BUILDINGS.forEach(b => {
        const isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, 3, 6)
    })
}

/**
 * Maps an extension block of structures.
 * @param {Tile[]} tiles 
 * @param {RoomPosition} center 
 * @param {number} round Number representing the order of building placement
 */
function mapExtensions(tiles, center, round) {
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
    const roundRCL = [4, 5, 5, 6, 6, 7, 7, 8, 8]

    const [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles)

    BUILDINGS.forEach(b => {
        const isCenter = (b[0] == 0 && b[1] == 0)
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter, 1, roundRCL[round])
    })
}

/**
 * Map the extractor.
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapExtractor(tiles, room) {
    let mineral = room.find(FIND_MINERALS)[0]
    updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR, tiles, true, 1, 6)
}

/**
 * Map Link structures
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapLinks(tiles, room) {
    const controller = room.controller

    const linkTiles = tiles.filter(t => {
        const pos = new RoomPosition(t.x, t.y, t.roomName)
        return (pos.getRangeTo(controller) <= 3 && t.available == true)
    })
    const targetTile = _.min(linkTiles, t => {
        const pos = new RoomPosition(t.x, t.y, t.roomName)
        return pos.getRangeTo(25, 25)
    })
    updateTile(targetTile.x, targetTile.y, STRUCTURE_LINK, tiles, true, 0, 5)
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
        costMatrix = placeRoad(source.pos, controller.pos, costMatrix, tiles, 1)
    }
    let centers = tiles.filter(t => t.center == true)
    for (let center of centers) {
        for (let _center of centers) {
            if (center.x == _center.x && center.y == _center.y) {
                continue
            }
            const fromPos = new RoomPosition(center.x, center.y, room.name)
            const toPos = new RoomPosition(_center.x, _center.y, room.name)
            costMatrix = placeRoad(fromPos, toPos, costMatrix, tiles, Math.max(center.level, _center.level))
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
            costs.set(tile.x, tile.y, 1)
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
function placeRoad(fromPos, toPos, costMatrix, tiles, level) {
    let target = { pos: toPos, range: 1 }

    let ret = PathFinder.search(
        fromPos, target, {
        plainCost: 2,
        swampCost: 2,
        roomCallback: function (roomName) {
            return costMatrix
        }
    })

    for (let pos of ret.path) {
        const tile = tiles.find(t => t.x == pos.x && t.y == pos.y)

        updateTile(pos.x, pos.y, STRUCTURE_ROAD, tiles, false, 3, level)
        costMatrix.set(pos.x, pos.y, 1)

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
    const BUILDINGS = [STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_OBSERVER]
    let availablePos = tiles.filter(t => t.available == true).map(t => new RoomPosition(t.x, t.y, room.name))
    for (let building of BUILDINGS) {
        const pos = _.min(availablePos, p => p.getRangeTo(center))
        availablePos.splice(availablePos.findIndex(p => p.x == pos.x && p.y == pos.y), 1)
        updateTile(pos.x, pos.y, building, tiles, false, 2, 3)
    }
}

/**
 * Maps positions for ramparts that enclose the base
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapRamparts(tiles, room) {
    let baseTiles = tiles.filter(s =>
        s.structure != undefined
        && s.structure != STRUCTURE_ROAD
        && s.structure != STRUCTURE_CONTAINER
        && s.structure != STRUCTURE_EXTRACTOR
        && s.structure != STRUCTURE_LINK)

    const left = _.min(baseTiles, t => t.x).x
    const right = _.max(baseTiles, t => t.x).x
    const top = _.min(baseTiles, t => t.y).y
    const bottom = _.max(baseTiles, t => t.y).y

    const terrain = new Room.Terrain(room.name)
    const exits = Game.map.describeExits(room.name)//room.find(FIND_EXIT)
    let walls = []
    if (exits[5] != undefined) {
        // Bottom exit
        let yStart = bottom
        let yEnd = 47
        let counts = []
        for (let y = yStart; y <= yEnd; y++) {
            let count = 0
            for (let x = 0; x < 50; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                row: y,
                count: count,
                border: 'bottom'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }
    if (exits[7] != undefined) {
        // Left exit
        let xStart = left
        let xEnd = 2
        let counts = []
        for (let x = xStart; x <= xEnd; x++) {
            let count = 0
            for (let y = 0; y < walls.find(w => w.border == 'bottom').row || 50; y++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                col: x,
                count: count,
                border: 'left'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }

    if (exits[1] != undefined) {
        // Top exit
        let yStart = top
        let yEnd = 2
        let counts = []
        for (let y = yStart; y <= yEnd; y++) {
            let count = 0
            for (let x = 0; x < 50; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                row: y,
                count: count,
                border: 'top'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }
    if (exits[3] != undefined) {
        // Right exit
        let xStart = right
        let xEnd = 48
        let counts = []
        for (let x = xStart; x <= xEnd; x++) {
            let count = 0
            for (let y = 0; y < walls.find(w => w.border == 'top').row || 50; y++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                col: x,
                count: count,
                border: 'right'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }

}