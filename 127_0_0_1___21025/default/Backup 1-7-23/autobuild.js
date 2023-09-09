function autoBuild(room) {
    if (Game.time % 10 != 0 || room.find(FIND_CONSTRUCTION_SITES).length > 0) {
        return
    }
    let controller = room.controller
    let ret = buildExtensions(room, controller)
    if (ret) { return }
    ret = buildContainers(room, controller)
    if (ret) { return }
}
module.exports = autoBuild

function buildContainers(room, controller) {
    if (controller.level > 1) {
        let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
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
                        room.memory.targetMinerCount++
                        return true;
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
            let midpointX = xCoords.reduce((acc, coord) => acc + coord, 0) / xCoords.length;
            let midpointY = yCoords.reduce((acc, coord) => acc + coord, 0) / yCoords.length;
            startSearch = new RoomPosition(midpointX, midpointY, room.name);
        } else {
            // Find midpoint between all extensions
            // Get the x and y coordinates of all the extensions
            let xCoords = extensions.map(extension => extension.pos.x);
            let yCoords = extensions.map(extension => extension.pos.y);

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
