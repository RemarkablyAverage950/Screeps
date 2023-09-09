function autoBuild(room) {
    if (Game.time % 100 != 0 || room.find(FIND_CONSTRUCTION_SITES).length > 0) {
        return
    }
    let controller = room.controller
    let ret = buildExtensions(room, controller)
    if (ret) { return }
    ret = buildContainers(room, controller)
    if (ret) { return }
    ret = buildTowers(room, controller)
    if (ret) { return }


    ret = buildStorage(room, controller)
    if (ret) { return }
    ret = buildRoads(room, controller)
    if (ret) { return }
}
module.exports = autoBuild



function buildStorage(room, controller) {
    let structures = room.find(FIND_STRUCTURES).concat(room.find(FIND_CONSTRUCTION_SITES))
    let storages = structures.filter(s => s.structureType === STRUCTURE_STORAGE)
    if (storages.length < CONTROLLER_STRUCTURES[STRUCTURE_STORAGE][controller.level]) {
        // find midpoint of all spawns and all extensions
        let spawns = room.find(FIND_MY_SPAWNS)
        let extensions = structures.filter(s => s.structureType === STRUCTURE_EXTENSION)
        let midX = Math.round((spawns.map(s => s.pos.x).concat(extensions.map(s => s.pos.x))).reduce((a, b) => a + b) / (spawns.length + extensions.length))
        let midY = Math.round((spawns.map(s => s.pos.y).concat(extensions.map(s => s.pos.y))).reduce((a, b) => a + b) / (spawns.length + extensions.length))
        console.log(midX, midY)
        let range = 0
        // find closest tile with no structures and no terrain walls to the midpoint and build a storage
        while (range < 25) {
            for (let x = midX - range; x <= midX + range; x++) {
                for (let y = midY - range; y <= midY + range; y++) {
                    console.log(x, y)
                    let tile = room.lookAt(x, y)
                    let build = true
                    tile.forEach(lo => {
                        console.log(JSON.stringify(lo))
                        if ((lo.type == 'terrain' && lo.terrain == 'wall') || lo.type == 'structure') {
                            build = false;
                        }
                    })
                    if (build) {
                        room.createConstructionSite(x, y, STRUCTURE_STORAGE);
                        return true;
                    }


                }
            }
            range++
        }
    }
    return false
}

function buildTowers(room, controller) {
    let structures = room.find(FIND_STRUCTURES).concat(room.find(FIND_CONSTRUCTION_SITES))
    let towers = structures.filter(s => s.structureType === STRUCTURE_TOWER)
    // Check if we can build a tower.
    if (towers.length < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][controller.level]) {
        // Look for a spot at range 3 from spawn 0 that has no structures and is next to a road. If a spot is not found, increase the range and check again until a spot is found.
        let range = 3
        let spawn = room.find(FIND_MY_SPAWNS)[0]
        let x = spawn.pos.x - range;
        let y = spawn.pos.y - range;
        let foundSpot = false;
        while (!foundSpot && range <= 50) {
            for (let i = 0; i < range * 2 + 1; i++) {
                for (let j = 0; j < range * 2 + 1; j++) {
                    let pos = new RoomPosition(x + i, y + j, room.name);
                    let structuresAtPos = pos.lookFor(LOOK_STRUCTURES);
                    let constructionSitesAtPos = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                    if (structuresAtPos.length === 0 && constructionSitesAtPos.length === 0) {
                        let surroundingPositions = [
                            new RoomPosition(pos.x - 1, pos.y - 1, pos.roomName),
                            new RoomPosition(pos.x, pos.y - 1, pos.roomName),
                            new RoomPosition(pos.x + 1, pos.y - 1, pos.roomName),
                            new RoomPosition(pos.x - 1, pos.y, pos.roomName),
                            new RoomPosition(pos.x + 1, pos.y, pos.roomName),
                            new RoomPosition(pos.x - 1, pos.y + 1, pos.roomName),
                            new RoomPosition(pos.x, pos.y + 1, pos.roomName),
                            new RoomPosition(pos.x + 1, pos.y + 1, pos.roomName),
                        ];
                        for (let surroundingPos of surroundingPositions) {
                            let structuresAtSurroundingPos = surroundingPos.lookFor(LOOK_STRUCTURES);
                            if (structuresAtSurroundingPos.length > 0) {
                                let isRoad = false;
                                for (let structure of structuresAtSurroundingPos) {
                                    if (structure.structureType === STRUCTURE_ROAD) {
                                        isRoad = true;
                                        break;
                                    }
                                }
                                if (isRoad) {
                                    foundSpot = true;
                                    room.createConstructionSite(pos, STRUCTURE_TOWER);
                                    return true;
                                }
                            }
                        }
                    }
                }
                range++;
            }

        }
    }
    return false;
}
function getRoadPath(fromPos, toPos, range) {
    let ret = PathFinder.search(
        fromPos, { pos: toPos, range: range }, {
        plainCost: 2,
        swampCost: 3,
        roomCallback: function (roomName) {
            let room = Game.rooms[roomName]
            if (!room) return;
            let costMatrix = new PathFinder.CostMatrix();
            let structures = room.find(FIND_STRUCTURES).concat(room.find(FIND_CONSTRUCTION_SITES));
            for (let structure of structures) {
                // set impassable tiles for structures
                if (structure.structureType == 'road') {
                    costMatrix.set(structure.pos.x, structure.pos.y, 1)
                    continue
                } else {
                    if (structure.structureType == 'container'
                        || (structure.structureType == 'rampart' && structure.my)) {
                        continue
                    }
                }
                costMatrix.set(structure.pos.x, structure.pos.y, 0xff);
            }
            let sources = room.find(FIND_SOURCES)
            let terrain = new Room.Terrain(roomName)
            for (let source of sources) {
                let x = source.pos.x
                let y = source.pos.y
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (terrain.get(x + i, y + j) != TERRAIN_MASK_WALL)
                            costMatrix.set(x + i, y + j, 10)
                    }
                }
            }
            for (let x = room.controller.pos.x - 1; x <= room.controller.pos.x + 1; x++) {
                for (let y = room.controller.pos.y - 1; y <= room.controller.pos.y + 1; y++) {
                    if (terrain.get(x, y) != TERRAIN_MASK_WALL)
                        costMatrix.set(x, y, 10)
                }
            }
            let myCreeps = room.find(FIND_MY_CREEPS)
            for (let creep of myCreeps) {
                if (creep.memory.role == 'miner' && creep.memory.moving == false) {
                    costMatrix.set(creep.pos.x, creep.pos.y, 0xff)
                }
            }
            return costMatrix
        },

    });
    return ret.path;
}

/**
 * 
 * @param {Room} room Room object.
 * @param {StructureController} controller Controller object.
 * @returns {boolean} A construction site was placed
 */
function buildRoads(room, controller) {
    if (controller.level < 2) {
        return false
    }
    let sources = room.find(FIND_SOURCES)
    let extensions = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTENSION);
    let spawns = room.find(FIND_MY_SPAWNS)
    let _ret = false
    let path;
    for (let source of sources) {
        for (let extension of extensions) {
            if (_ret) {
                return true
            }
            path = getRoadPath(source.pos, extension.pos, 1)
            for (let step of path) {
                let ret = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
                if (ret == 0) {
                    _ret = true
                }
            }
        }
        if (_ret) {
            return true
        }
        path = source.pos.findPathTo(controller, {
            ignoreCreeps: true,
            swampCost: 3,
            plainCost: 3,
            range: 1
        });
        for (let step of path) {
            let ret = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
            if (ret == 0) {
                _ret = true
            }
        }
        for (let spawn of spawns) {
            if (_ret) {
                return true
            }
            path = source.pos.findPathTo(spawn, {
                ignoreCreeps: true,
                swampCost: 3,
                plainCost: 3,
                range: 1
            });
            for (let step of path) {
                let ret = room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
                if (ret == 0) {
                    _ret = true
                }
            }
        }

    }
    return false
}
/**
 * 
 * @param {Room} room Room object.
 * @param {StructureController} controller Controller object.
 * @returns {boolean} A construction site was placed
 */
function buildContainers(room, controller) {
    if (controller.level > 1) {
        let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER).concat(room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType === STRUCTURE_CONTAINER))
        if (containers.length < CONTROLLER_STRUCTURES[STRUCTURE_CONTAINER][controller.level]) {
            // Check if there is a container next to each source, closest to the controller
            let sources = room.find(FIND_SOURCES);
            for (let source of sources) {
                let closestContainer = source.pos.findClosestByRange(containers);
                if (!closestContainer || source.pos.getRangeTo(closestContainer) > 1) {
                    let tiles = source.room.lookForAtArea(LOOK_TERRAIN, source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
                    let openTiles = _.filter(tiles, tile => tile.terrain !== 'wall');
                    let positions = openTiles.map(t => new RoomPosition(t.x, t.y, room.name));
                    let closestOpenTile = _.min(positions, p => p.getRangeTo(controller))
                    let result = room.createConstructionSite(closestOpenTile, STRUCTURE_CONTAINER);
                    if (result == OK) {
                        return true;
                    }
                }
            }

            if (controller.pos.findInRange(containers, 3).length === 0) {
                let roads = room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_ROAD)
                // Find a road at exactly range 3 from the controller.
                let road = roads.find(r => controller.pos.getRangeTo(r) === 3)
                // Check all adjacent positions next to the road for an open site that is at exactly range 3 from the controller.
                if (road) {
                    let adjacentPositions = [
                        new RoomPosition(road.pos.x - 1, road.pos.y, room.name),
                        new RoomPosition(road.pos.x + 1, road.pos.y, room.name),
                        new RoomPosition(road.pos.x, road.pos.y - 1, room.name),
                        new RoomPosition(road.pos.x, road.pos.y + 1, room.name)
                    ];
                    let openSite = adjacentPositions.find(pos => {
                        let structuresAtPos = pos.lookFor(LOOK_STRUCTURES);
                        let constructionSitesAtPos = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                        return structuresAtPos.length === 0 && constructionSitesAtPos.length === 0 && controller.pos.getRangeTo(pos) === 3;
                    });
                    // If an open site is found, build a container at that position.
                    if (openSite) {
                        room.createConstructionSite(openSite, STRUCTURE_CONTAINER);
                    }
                }
            }


        }
    }
}

// If there is not a container at range 3 or less to the controller

// Find the closest open tile at range 3 from the controller to the midpoint between the sources

function buildExtensions(room, controller) {

    // Find all the extensions in the room
    let extensions = room.find(FIND_STRUCTURES, {
        filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
    });
    // Get the current number of extensions
    let extensionCount = extensions.length + room.find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_EXTENSION).length;
    // Calculate the number of extensions needed
    let extensionCapacity = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controller.level];
    let extensionsToBuild = extensionCapacity - extensionCount;

    if (extensionsToBuild > 0) {



        let startSearch;
        if (extensionCount == 0) {
            // Find midpoint between all spawns and sources
            let spawnsAndSources = room.find(FIND_MY_SPAWNS).concat(room.find(FIND_SOURCES));
            let xCoords = spawnsAndSources.map(structure => structure.pos.x);
            let yCoords = spawnsAndSources.map(structure => structure.pos.y);

            for (let i = 0; i < spawnsAndSources.length; i++) {
                xCoords.push(25)
                yCoords.push(25)
            }
            let midpointX = xCoords.reduce((acc, coord) => acc + coord, 0) / xCoords.length;
            let midpointY = yCoords.reduce((acc, coord) => acc + coord, 0) / yCoords.length;
            startSearch = new RoomPosition(midpointX, midpointY, room.name);
        } else {
            // Find midpoint between all extensions
            // Get the x and y coordinates of all the extensions
            let xCoords = extensions.map(extension => extension.pos.x);
            let yCoords = extensions.map(extension => extension.pos.y);
            for (let i = 0; i < extensions.length; i++) {
                xCoords.push(25)
                yCoords.push(25)
            }
            // Calculate the midpoint of the coordinates
            let midpointX = xCoords.reduce((acc, coord) => acc + coord, 0) / xCoords.length;
            let midpointY = yCoords.reduce((acc, coord) => acc + coord, 0) / yCoords.length;

            // Create a RoomPosition object for the midpoint
            startSearch = new RoomPosition(midpointX, midpointY, room.name);
        }

        // these two variables make up the pattern of the "Extension stamp"
        const EXTENSION_BLOCK = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
        const EXTENSION_ROADS = [[-1, -1], [0, -2], [1, -1], [2, 0], [1, 1], [0, 2], [-1, 1], [-2, 0]]

        let buildLocation = findExtensionBlockArea(room, startSearch, EXTENSION_BLOCK, EXTENSION_ROADS)
        if (buildLocation == null) {
            console.log('Could not find a location to build Extensions in ' + room.name)
        }

        console.log('Building Extensions at', buildLocation.x, buildLocation.y)


        // Place extension construction sites
        EXTENSION_BLOCK.forEach(([dx, dy]) => {
            room.createConstructionSite(buildLocation.x + dx, buildLocation.y + dy, STRUCTURE_EXTENSION);
        });
        // Place road construction sites
        EXTENSION_ROADS.forEach(([dx, dy]) => {
            room.createConstructionSite(buildLocation.x + dx, buildLocation.y + dy, STRUCTURE_ROAD);
        });

        return true

    }
    return false
}

function findExtensionBlockArea(room, startSearch, EXTENSION_BLOCK, EXTENSION_ROADS) {
    // Set a flag to indicate if an open area has been found
    let foundOpenArea = false;
    // Set a counter to increment the search range
    let searchCounter = 0;
    let avoid = room.find(FIND_SOURCES).concat(room.controller).concat(room.find(FIND_MINERALS))
    // Create a loop that continues until an open area is found or the maximum search range is reached
    while (!foundOpenArea && searchCounter < 50) {
        // Iterate over the search area
        for (let x = startSearch.x - searchCounter; x <= startSearch.x + searchCounter; x++) {
            for (let y = startSearch.y - searchCounter; y <= startSearch.y + searchCounter; y++) {
                foundOpenArea = true
                for (let offset of EXTENSION_BLOCK) {
                    let xOff = offset[0] + x
                    let yOff = offset[1] + y
                    avoid.forEach(a => {
                        if (a.pos.getRangeTo(xOff, yOff) <= 3) {
                            foundOpenArea = false
                            return
                        }
                    })
                    if (!foundOpenArea) {
                        break
                    }
                    let look = room.lookAt(xOff, yOff)
                    room.lookForAt('terrain', xOff, yOff).forEach(lo => {
                        if (lo == 'wall') {
                            foundOpenArea = false
                        }
                    })
                    for (let lo of look) {
                        if (lo.type == 'structure') {
                            foundOpenArea = false
                            break
                        }
                    }
                    if (!foundOpenArea) {
                        break
                    }
                }
                if (!foundOpenArea) {
                    continue
                }
                for (let offset of EXTENSION_ROADS) {
                    let xOff = offset[0] + x
                    let yOff = offset[1] + y
                    let look = room.lookAt(xOff, yOff)
                    room.lookForAt('terrain', xOff, yOff).forEach(lo => {
                        if (lo == 'wall') {
                            foundOpenArea = false
                        }
                    })
                    for (let lo of look) {
                        if ((lo.type == 'structure' && lo.structure.structureType != STRUCTURE_ROAD) || (lo.type == 'terrain' && lo.terrain == 'wall')) {
                            foundOpenArea = false
                            break
                        }
                    }
                    if (!foundOpenArea) {
                        break
                    }
                }
                if (foundOpenArea) {
                    // If open area is found, return center position of extension block
                    return new RoomPosition(x, y, room.name);
                }
            }
        }
        searchCounter++;
    }
    return null
}


// If no open area was found, return null
