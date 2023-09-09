const { findIndex } = require("lodash");

function autoBuild(room) {
    /* room.memory.buildMap = undefined
     let sites = room.find(FIND_CONSTRUCTION_SITES)
     for (let site of sites){
         site.remove()
     }*/

    if (Game.time % 100 == 0) {
        if (room.memory.buildMap == undefined) {
            generateBuildMap(room)
        }


        buildStructures(room)
    }

}

module.exports = autoBuild

function buildStructures(room) {
    let count = room.find(FIND_CONSTRUCTION_SITES).length
    if (count > 0) {
        return
    }
    let tiles = room.memory.buildMap.filter(t => t.structure != undefined)
    let controller = room.controller
    const structures = room.find(FIND_STRUCTURES)
    let targetTiles;
    const extensions = structures.filter(s=> s.structureType == STRUCTURE_EXTENSION)
    if(CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controller.level] > extensions.length ){
        targetTiles = tiles.filter(t=> t.structure == STRUCTURE_EXTENSION)
    } else if(CONTROLLER_STRUCTURES[STRUCTURE_CONTAINER][controller.level] > structures.filter(s=> s.structureType == STRUCTURE_CONTAINER).length){
        targetTiles = tiles.filter(t=> t.structure == STRUCTURE_CONTAINER)
    }else{
        targetTiles = tiles
    }
    for (let t of targetTiles) {
        if (count >= 10) {
            break
        }
        const ret = room.createConstructionSite(t.x, t.y, t.structure);
        if (ret == 0) {
            tiles.splice(tiles.findIndex(tile => tile.x == t.x && tile.y == t.y), 1)
            count++
        }
    }
    room.memory.buildMap = tiles
}


/*
5 Containers, 3 Spawns, 60 Extensions (200 capacity), Ramparts (300M max hits), Walls, 6 Towers, Storage, 6 Links, Extractor, 10 Labs, Terminal, Factory, Observer, Power Spawn, Nuker
*/

class Tile {
    constructor(x, y, roomName, available) {
        this.x = x
        this.y = y
        this.roomName = roomName
        this.available = available
        this.structure = undefined
        this.center = false
    }
}

function generateBuildMap(room) {
    if (room.memory == undefined) {
        room.memory = {}
    }

    let terrain = new Room.Terrain(room.name)
    let tiles = []
    // Create a 50x50 grid.
    // Mark all walls as 0, open spaces as 1.
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            let available = true
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                available = false
            }
            tiles.push(new Tile(x, y, room.name, available))
        }
    }
    let check = tiles.find(t => t.x == 11 && t.y == 24)

    let spawn = room.find(FIND_MY_SPAWNS)[0]
    updateTile(spawn.pos.x, spawn.pos.y, STRUCTURE_SPAWN, tiles)
    // Generate spawn block
    mapSpawnBlock(spawn, tiles)

    // Place containers
    mapContainers(room, tiles)

    let sources = room.find(FIND_SOURCES)
    let controller = room.controller
    let mineral = room.find(FIND_MINERALS)[0]
    let midX = Math.round([spawn.pos.x].concat(sources.map(s => s.pos.x)).concat(controller.pos.x).concat(mineral.pos.x).concat(25).reduce((a, b) => a + b) / (4 + sources.length))
    let midY = Math.round([spawn.pos.y].concat(sources.map(s => s.pos.y)).concat(controller.pos.y).concat(mineral.pos.y).concat(25).reduce((a, b) => a + b) / (4 + sources.length))
    let center = new RoomPosition(midX, midY, room.name)
    // find center between map center, spawn, sources, controller, and mineral




    mapHub(tiles, center)

    mapLabs(tiles, room)
    // map 9 stamps of extensions
    for (let i = 0; i < 9; i++) {
        mapExtensions(tiles, center)
    }

    mapExtractor(tiles, room)


    mapRoads(tiles, room)

    mapIndividualStructures(tiles, room, center)

    room.memory.buildMap = tiles
}

function mapExtractor(tiles, room) {
    let mineral = room.find(FIND_MINERALS)[0]
    updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR, tiles, true)
}


/*
6 Towers, Extractor, Observer
*/
function mapIndividualStructures(tiles, room, center) {
    const BUILDINGS = [STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_TOWER, STRUCTURE_OBSERVER]
    let availablePos = tiles.filter(t => t.available == true).map(t => new RoomPosition(t.x, t.y, room.name))
    for (let building of BUILDINGS) {
        const pos = _.min(availablePos, p => p.getRangeTo(center))
        console.log(building,pos.x,pos.y)
        updateTile(pos.x, pos.y, building, tiles, false)
    }
}

function mapRoads(tiles, room) {
    let costMatrix = buildRoadCostmatrix(tiles)
    let sources = room.find(FIND_SOURCES)
    let controller = room.controller
    for (let source of sources) {
        costMatrix = placeRoad(source.pos, controller.pos, costMatrix, tiles)
    }
    let centers = tiles.filter(t => t.center == true)
    for (let center of centers) {
        for (let _center of centers) {
            if (center.x == _center.x && center.y == _center.y) {
                continue
            }
            const fromPos = new RoomPosition(center.x, center.y, room.name)
            const toPos = new RoomPosition(_center.x, _center.y, room.name)
            costMatrix = placeRoad(fromPos, toPos, costMatrix, tiles)
        }
    }
}

function placeRoad(fromPos, toPos, costMatrix, tiles) {
    let target = { pos: toPos, range: 1 }
    let ret = PathFinder.search(
        fromPos, target, {
        plainCost: 3,
        swampCost: 4,
        roomCallback: function (roomName) {
            return costMatrix
        }
    },
    )

    for (let pos of ret.path) {
        updateTile(pos.x, pos.y, STRUCTURE_ROAD, tiles, false)
        costMatrix.set(pos.x, pos.y, 1)
    }
    return costMatrix
}

function buildRoadCostmatrix(tiles) {
    let costs = new PathFinder.CostMatrix;
    for (let tile of tiles) {
        if (tile.structure == STRUCTURE_ROAD) {
            costs.set(tile.x, tile.y, 1)
        } else if (tile.available == false) {
            costs.set(tile.x, tile.y, 0xff)
        }
    }
    return costs
}

function mapContainers(room, tiles) {
    const BUILDINGS = [[0, 0, STRUCTURE_CONTAINER]]
    let sources = room.find(FIND_SOURCES)
    for (let source of sources) {
        let [centerX, centerY] = findOpenTiles(BUILDINGS, source.pos, tiles)
        //console.log('FOUND OPEN CONTAINER AREA AT ' + centerX, centerY)
        BUILDINGS.forEach(b => {
            updateTile(centerX + b[0], centerY + b[1], b[2], tiles, true)
        })
    }
    let controller = room.controller
    // get all open tiles at range 3 to controller
    let controllerStorageTiles = tiles.filter(t => {
        const tile = new RoomPosition(t.x, t.y, room.name)
        const range = Math.round(tile.getRangeTo(controller))
        if (range == 3 && t.available == true) {
            return true
        }
        return false
    })
    const tile = _.min(controllerStorageTiles, t => {
        let pos = new RoomPosition(t.x, t.y, room.name)
        return pos.getRangeTo(sources[0])
    })
    //console.log('FOUND OPEN CONTAINER AREA AT ' + tile.x+' '+ tile.y)
    updateTile(tile.x, tile.y, STRUCTURE_CONTAINER, tiles, true)
}

function mapExtensions(tiles, center) {
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

    let [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles)
    //console.log('FOUND OPEN EXTENSION AREA AT ' + centerX, centerY)
    BUILDINGS.forEach(b => {
        let isCenter = b[0] == 0 && b[1] == 0
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter)
    })

}



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

    // find storage and make that the center
    let storageTile = tiles.find(t => t.structure == STRUCTURE_STORAGE)
    let center = new RoomPosition(storageTile.x, storageTile.y, room.name)
    let [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles)
    //console.log('FOUND OPEN LAB AREA AT ' + centerX, centerY)
    BUILDINGS.forEach(b => {
        let isCenter = b[0] == 0 && b[1] == 0
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter)
    })

}

function mapSpawnBlock(spawn, tiles) {
    const BUILDINGS = [
        [-2, -1, STRUCTURE_ROAD],
        [-1, -1, STRUCTURE_ROAD],
        [0, -1, STRUCTURE_ROAD],
        [1, -1, STRUCTURE_ROAD],
        [2, -1, STRUCTURE_ROAD],
        [-3, 0, STRUCTURE_ROAD],
        [-2, 0, STRUCTURE_EXTENSION],
        [-1, 0, STRUCTURE_EXTENSION],
        [0, 0, STRUCTURE_SPAWN],
        [1, 0, STRUCTURE_EXTENSION],
        [2, 0, STRUCTURE_EXTENSION],
        [3, 0, STRUCTURE_ROAD],
        [-3, 1, STRUCTURE_ROAD],
        [-2, 1, STRUCTURE_EXTENSION],
        [0, 1, STRUCTURE_EXTENSION],
        [2, 1, STRUCTURE_EXTENSION],
        [3, 1, STRUCTURE_ROAD],
        [-3, 2, STRUCTURE_ROAD],
        [-2, 2, STRUCTURE_CONTAINER],
        [-1, 2, STRUCTURE_EXTENSION],
        [0, 2, STRUCTURE_LINK],
        [1, 2, STRUCTURE_EXTENSION],
        [2, 2, STRUCTURE_CONTAINER],
        [3, 2, STRUCTURE_ROAD],
        [-3, 3, STRUCTURE_ROAD],
        [-2, 3, STRUCTURE_EXTENSION],
        [0, 3, STRUCTURE_EXTENSION],
        [2, 3, STRUCTURE_EXTENSION],
        [3, 3, STRUCTURE_ROAD],
        [-3, 4, STRUCTURE_ROAD],
        [-2, 4, STRUCTURE_SPAWN],
        [-1, 4, STRUCTURE_EXTENSION],
        [0, 4, STRUCTURE_EXTENSION],
        [1, 4, STRUCTURE_EXTENSION],
        [2, 4, STRUCTURE_SPAWN],
        [3, 4, STRUCTURE_ROAD],
        [-2, 5, STRUCTURE_ROAD],
        [-1, 5, STRUCTURE_ROAD],
        [0, 5, STRUCTURE_ROAD],
        [1, 5, STRUCTURE_ROAD],
        [2, 5, STRUCTURE_ROAD],
    ]
    let centerX = spawn.pos.x
    let centerY = spawn.pos.y

    BUILDINGS.forEach(b => {
        let isCenter = b[0] == 0 && b[1] == 0
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter)
    })
}

function mapHub(tiles, center) {
    const BUILDINGS = [
        [-1, -2, STRUCTURE_ROAD],
        [0, -2, STRUCTURE_ROAD],
        [1, -2, STRUCTURE_ROAD],
        [-2, -1, STRUCTURE_ROAD],
        [-1, -1, STRUCTURE_TERMINAL],
        [0, -1, STRUCTURE_LINK],
        [1, -1, STRUCTURE_STORAGE],
        [2, -1, STRUCTURE_ROAD],
        [-2, 0, STRUCTURE_ROAD],
        [-1, 0, STRUCTURE_NUKER],
        [0, 0, STRUCTURE_ROAD],
        [1, 0, STRUCTURE_POWER_SPAWN],
        [2, 0, STRUCTURE_ROAD],
        [-1, 1, STRUCTURE_ROAD],
        [0, 1, STRUCTURE_FACTORY],
        [1, 1, STRUCTURE_ROAD],
        [0, 2, STRUCTURE_ROAD],
    ]
    // Find open area for template
    let [centerX, centerY] = findOpenTiles(BUILDINGS, center, tiles)
    //console.log('FOUND OPEN HUB AREA AT ' + centerX, centerY)
    BUILDINGS.forEach(b => {
        let isCenter = b[0] == 0 && b[1] == 0
        updateTile(centerX + b[0], centerY + b[1], b[2], tiles, isCenter)
    })
}

function updateTile(x, y, structure, tiles, center) {
    let tile = tiles.find(t => t.x == x && t.y == y)

    tile.structure = structure
    tile.available = false
    if (center) {
        this.center = true
    }
}

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

function findOpenTiles2(BUILDINGS, start, tiles) {
    let range = 0
    let found = false
    const availableTiles = new Set(tiles.filter(t => t.available).map(t => `${t.x},${t.y}`))
    while (!found && range < 25) {
        for (let tile of availableTiles) {
            let [x, y] = tile.split(',').map(Number)
            if (x >= start.x - range && x <= start.x + range && y >= start.y - range && y <= start.y + range) {
                found = true
                for (let building of BUILDINGS) {
                    let lookX = x + building[0]
                    let lookY = y + building[1]
                    if (!availableTiles.has(`${lookX},${lookY}`)) {
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