let MEMORY = require('memory');

const util_mincut = require('minicutRamparts')

const DEBUG = 0;


class BuildOrder {
    constructor(x, y, structure, level) {
        this.x = x;
        this.y = y;
        this.structure = structure;
        this.level = level;
        this.placed = false;
    }
};

class Tile {
    /**
     * Stores a construction data for a tile.
     * @constructor
     * @param {number} x 
     * @param {number} y 
     * @param {string} roomName 
     * @param {boolean} available 
     * @param {number} level
     * @param {number} priority
     */
    constructor(x, y, available) {
        this.x = x;
        this.y = y;
        this.available = available;
        this.structure = undefined;
        this.center = false;
        this.level = 8;
        this.placed = false;
    };
};

/**
 * 
 * @param {Room} room 
 */
function roomPlanner(room) {

    if (DEBUG === 1) {
        //console.log('Entering roomPlanner with', Game.cpu.bucket, 'CPU in bucket.')
    }
    if (room.memory === undefined) {
        room.memory = {};
    };

    let plans = room.memory.plans;

    //if (plans === undefined) {

    if (Game.time % 10 === 0 && Game.cpu.bucket > 100) {

        plans = getRoomPlans(room);

    };

    if (plans && Game.time % 20 === 0 && Game.cpu.bucket > 100) {
        //placeSites(room, plans);
    };

    visualizeStructures(plans, room)

};

/**
 * Generates build plans for a room
 * @param {Room} room 
 */
function getRoomPlans(room) {


    let terrain = new Room.Terrain(room.name);
    let tiles = [];
    let buildOrders = [];

    // Create a 50x50 grid.
    // Mark all terrain walls as unavailable, open spaces as available.

    for (let x = 1; x < 49; x++) {
        for (let y = 1; y < 49; y++) {

            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                tiles.push(new Tile(x, y, false));
            } else {
                tiles.push(new Tile(x, y, true));
            };

        };
    };

    const sources = room.find(FIND_SOURCES)
    const controller = room.controller
    const mineral = room.find(FIND_MINERALS)[0]
    const hubX = Math.round(sources.map(s => s.pos.x).concat(controller.pos.x).concat(mineral.pos.x).reduce((a, b) => a + b) / (2 + sources.length))
    const hubY = Math.round(sources.map(s => s.pos.y).concat(controller.pos.y).concat(mineral.pos.y).reduce((a, b) => a + b) / (2 + sources.length))
    const hubCenter = new RoomPosition(hubX, hubY, room.name)
    const spawnX = Math.round(sources.map(s => s.pos.x).concat(hubX).reduce((a, b) => a + b) / (1 + sources.length))
    const spawnY = Math.round(sources.map(s => s.pos.y).concat(hubY).reduce((a, b) => a + b) / (1 + sources.length))
    const spawnCenter = new RoomPosition(spawnX, spawnY, room.name)

    let costMatrix = getPlannerCostMatrix(tiles, sources, mineral)

    // Set source containers
    setStamp.container(room, tiles, hubCenter, sources, mineral, costMatrix);
    setStamp.controller(room, tiles, hubCenter)

    setStamp.hub(room, tiles, hubCenter);
    setStamp.lab(room, tiles);
    setStamp.extension(room, tiles, hubCenter);
    setStamp.spawn(room, tiles, hubCenter);



    setIndividualStructures(tiles, room)

    //TODO: place ramparts
    // Place Roads
    // Place Towers

    tiles.sort((a, b) => a.level - b.level)

    for (let tile of tiles) {

        if (tile.structure === undefined) {
            continue;
        }

        buildOrders.push(new BuildOrder(tile.x, tile.y, tile.structure, tile.level));

    };

    room.memory.plans = buildOrders;

    return buildOrders;

};

/**
 * Plans positions for 6 Towers, 1 Observer closest to defined start point.
 * @param {Tile[]} tiles 
 * @param {Room} room 

 */
function setIndividualStructures(tiles, room) {

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

    let centers = [];
    for (let tile of tiles) {
        if (tile.structure === STRUCTURE_EXTENSION && tile.center) {
            centers.push(tile);
        };
    };
    console.log('A',centers.map(t => t.x))
    const startX = centers.map(t => t.x).reduce((a, b) => a + b) / centers.length
    const startY = centers.map(t => t.y).reduce((a, b) => a + b) / centers.length
    const start = new RoomPosition(startX, startY, room.name)

    let availablePos = tiles.filter(t => {
        if (!t.available) {
            return false;
        };
        let nearRoad = false
        for (let x = -1; x <= 1; x++) {
            if (nearRoad) break;
            for (let y = -1; y <= 1; y++) {
                if (nearRoad) break;
                let tile = tiles.find(tile => tile.x === x + t.x && tile.y === y + t.y);
                if (tile && tile.structure === STRUCTURE_ROAD) {
                    nearRoad = true;
                };
            }
        }
        return nearRoad;
    }).map(t => new RoomPosition(t.x, t.y, room.name));

    for (let building of BUILDINGS) {
        const pos = _.min(availablePos, p => p.getRangeTo(start));
        availablePos.splice(availablePos.findIndex(p => p.x === pos.x && p.y === pos.y), 1);
        updateTile(pos.x, pos.y, building[0], tiles, false, building[1]);
    };
};



/**
 * 
 * @param {RoomPosition} origin 
 * @param {RoomPosition} destination 
 * @param {number} range 
 * @returns {PathFinderPath}
 */
function getPath(origin, destination, range, costMatrix) {
    let target = { pos: destination, range: range };

    let ret = PathFinder.search(
        origin, target, {
        plainCost: 3,
        swampCost: 3,
        roomCallback: function (roomName) {
            const costs = costMatrix;
            return costs;
        },
    });

    return ret.path;
};

/**
 * Builds the initial costmatrix for road placement.
 * @param {Tile[]} tiles 
 * @param {Source[]} sources
 * @param {Mineral} mineral
 * @returns {CostMatrix}
 */
function getPlannerCostMatrix(tiles, sources, mineral) {
    let costs = new PathFinder.CostMatrix;
    for (let tile of tiles) {
        if (tile.available == false) {
            costs.set(tile.x, tile.y, 0xff);
        }
    };

    for (let source of sources) {
        for (let x = -1 + source.pos.x; x <= 1 + source.pos.x; x++) {
            for (let y = -1 + source.pos.y; y <= 1 + source.pos.y; y++) {
                costs.set(x, y, 0xff);
            }
        }
    }

    for (let x = -1 + mineral.pos.x; x <= 1 + mineral.pos.x; x++) {
        for (let y = -1 + mineral.pos.y; y <= 1 + mineral.pos.y; y++) {
            costs.set(x, y, 0xff);
        }
    }

    return costs
}

/**
 * Finds an available area for a stamp of structures.
 * @param {Array[]} BUILDINGS 
 * @param {RoomPosition} start Position to start search from
 * @param {Tile[]} tiles 
 * @returns {RoomPosition} Available center position.
 */
function getStampStart(BUILDINGS, start, tiles, room) {

    if (DEBUG === 1) {
        console.log('Entering getStampStart with', Game.cpu.getUsed(), 'CPU used.')
    }
    let found = false;
    let visited = new Set();
    let queue = [];

    queue.push({
        x: start.x,
        y: start.y,
    });
    let arr = [start.x, start.y];
    visited.add(JSON.stringify(arr));

    while (queue.length > 0) {
        if (queue.length > 200) {
            console.log('Queue Length > 200. getStampStart() failed.')
            return undefined;
        }


        const center = queue.shift();


        const x = center.x;
        const y = center.y;


        if (DEBUG === 1) {
            console.log('Checking next in queue with', 100 - Game.cpu.getUsed(), 'CPU remaining. Queue length:', queue.length)
            console.log('Start position:', x, ',', y)
        }

        if (x < 3 || x > 47 || y < 3 || y > 47 || room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) {
            if (DEBUG === 1) {
                console.log(x, y, 'out of bounds or is a terrain wall.')
            }
            continue;
        }

        found = true;

        for (let building of BUILDINGS) {

            const lookX = x + building[0];
            const lookY = y + building[1];

            // Verify position is in bounds.
            if (lookX < 3 || lookX > 47 || lookY < 3 || lookY > 47) {
                if (DEBUG === 1) {
                    console.log(lookX, lookY, 'out of bounds')
                }
                found = false;
                break;
            }

            const tile = tiles.find(t => t.x === lookX && t.y === lookY);

            if (!tile) {
                if (DEBUG === 1) {
                    console.log(lookX, lookY, 'not found in tiles')
                }
                found = false;
                break;
            }
            if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                continue;
            };
            if (tile.available === false) {
                if (DEBUG === 1) {
                    console.log(lookX, lookY, 'tile is not available')
                }
                found = false;
                break;
            };
        };
        if (found) {

            return new RoomPosition(x, y, room.name);

        } else {

            // Add unvisited adjacent start positions to queue
            const nextCenter = [
                [x, y + 1],
                [x, y - 1],
                [x + 1, y],
                [x - 1, y],
            ];

            for (let n of nextCenter) {
                const nStr = JSON.stringify(n); // Convert to a string
                if (DEBUG === 2) {
                    console.log('Checking if visited has', nStr, visited.has(nStr));
                    console.log(JSON.stringify(visited));
                }
                if (!visited.has(nStr)) {
                    visited.add(nStr);
                    queue.push({
                        x: n[0],
                        y: n[1],
                    });
                };
            };
        };
    };


    return undefined;
};


/*
    **** OLD getStampStart() ****
{
let range = 0;
let found = false;
 
while (!found && range < 25) {
    for (let x = start.x - range; x <= start.x + range; x++) {
        for (let y = start.y - range; y <= start.y + range; y++) {
 
            found = true;
 
            for (let building of BUILDINGS) {
 
                const lookX = x + building[0];
                const lookY = y + building[1];
 
 
                const tile = tiles.find(t => t.x == lookX && t.y == lookY);
                if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                    continue;
                };
                if (tile.available === false) {
                    found === false;
                    break;
                };
            };
            if (found) {
                return new RoomPosition(x, y, room.name);
            };
        };
    };
    range++;
};
return undefined;
}
*/


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
    let tile = tiles.find(t => t.x === x && t.y === y);

    if (tile && tile.available === false && structure === STRUCTURE_RAMPART) {

        let newTile = new Tile(x, y, tile.roomName, false);
        newTile.structure = structure;
        newTile.available = false;
        newTile.center = false;
        newTile.level = level;
        tiles.push(newTile);

    } else if (tile) {

        tile.structure = structure;
        tile.available = false;
        tile.center = center;
        tile.level = Math.min(level, tile.level);

    };
};

function visualizeStructures(plans, room) {

    const reqDisplayLevel = 8;

    if (plans === undefined) {
        return;
    };
    for (let order of plans) {

        if (order.structure && !order.placed && order.level <= reqDisplayLevel && order.structure != STRUCTURE_RAMPART) {//room.controller.level
            // Visualize the tile based on its structure type
            room.visual.structure(order.x, order.y, order.structure);
        };
    };
    room.visual.connectRoads();
};

let setStamp = {

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter 
     * @param {Source[]} sources
     * @param {Mineral} mineral
     * @param {CostMatrix} costMatrix
     */
    container: function (room, tiles, hubCenter, sources, mineral, costMatrix) {
        const BUILDINGS = [
            [-1, -1, undefined, 9],
            [0, -1, undefined, 9],
            [1, -1, undefined, 9],
            [-1, 0, undefined, 9],
            [0, 0, STRUCTURE_CONTAINER, 2],
            [1, 0, undefined, 9],
            [-1, 1, undefined, 9],
            [0, 1, undefined, 9],
            [1, 1, undefined, 9],
        ];


        for (let source of sources) {
            let openTiles = [];
            for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
                for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
                    let tile = tiles.find(t => t.x === x && t.y === y);
                    if (tile.available) {
                        openTiles.push(tile);
                    }
                }
            }

            let minDist = Infinity;
            let closest = undefined;
            for (let tile of openTiles) {
                const pos = new RoomPosition(tile.x, tile.y, room.name);
                const path = getPath(pos, hubCenter, 1, costMatrix);
                const dist = path.length;
                console.log(source.id, JSON.stringify(path))
                if (dist < minDist) {
                    closest = tile;
                    minDist = dist;
                }
            }

            BUILDINGS.forEach(b => {
                let isCenter = (b[0] == 0 && b[1] == 0)
                updateTile(closest.x + b[0], closest.y + b[1], b[2], tiles, isCenter, b[3])
            });

        }

        let openTiles = [];
        for (let x = mineral.pos.x - 1; x <= mineral.pos.x + 1; x++) {
            for (let y = mineral.pos.y - 1; y <= mineral.pos.y + 1; y++) {
                let tile = tiles.find(t => t.x === x && t.y === y);
                if (tile.available) {
                    openTiles.push(tile);
                }
            }
        }
        let minDist = Infinity;
        let closest = undefined;
        for (let tile of openTiles) {
            const pos = new RoomPosition(tile.x, tile.y, room.name);
            const path = getPath(pos, hubCenter, 1, costMatrix);
            const dist = path.length;
            if (dist < minDist) {
                closest = tile;
                minDist = dist;
            }
        }
        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(closest.x + b[0], closest.y + b[1], b[2], tiles, isCenter, 6)
        });
    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter
     */
    controller: function (room, tiles, hubCenter) {
        const BUILDINGS = [
            [-1, -1, undefined, 9],
            [0, -1, undefined, 9],
            [1, -1, undefined, 9],
            [-1, 0, undefined, 9],
            [0, 0, STRUCTURE_LINK, 5],
            [1, 0, undefined, 9],
            [-1, 1, undefined, 9],
            [0, 1, undefined, 9],
            [1, 1, undefined, 9],
        ];

        let availablePos = [];
        // Find all tiles at range 2 from controller
        const cX = room.controller.pos.x;
        const cY = room.controller.pos.y;
        console.log('cX cY', cX, cY)

        // x-2
        for (let y = cY - 2; y <= cY + 2; y++) {
            const x = cX - 2;
            const tile = tiles.find(t => t.x === x && t.y === y);
            if (tile && tile.available) {
                availablePos.push(new RoomPosition(x, y, room.name));
            };
        };

        // x+2
        for (let y = cY - 2; y <= cY + 2; y++) {
            const x = cX + 2;
            const tile = tiles.find(t => t.x === x && t.y === y);
            if (tile && tile.available) {
                availablePos.push(new RoomPosition(x, y, room.name));
            };
        };

        // y-2
        for (let x = cX - 2; x <= cX + 2; x++) {
            const y = cY - 2;
            const tile = tiles.find(t => t.x === x && t.y === y);
            if (tile && tile.available) {
                availablePos.push(new RoomPosition(x, y, room.name));
            };
        };

        // y+2
        for (let x = cX - 2; x <= cX + 2; x++) {
            const y = cY + 2;
            const tile = tiles.find(t => t.x === x && t.y === y);
            if (tile && tile.available) {
                availablePos.push(new RoomPosition(x, y, room.name));
            };
        };
        console.log('availablePos', JSON.stringify(availablePos))
        // sort by closest tile to hub
        availablePos = availablePos.sort((a, b) => a.getRangeTo(hubCenter) - b.getRangeTo(hubCenter))
        // check for 3x3 available and place buildings if found
        console.log('availablePos sorted', JSON.stringify(availablePos))

        for (let pos of availablePos) {
            let found = true;

            for (let building of BUILDINGS) {

                const lookX = pos.x + building[0];
                const lookY = pos.y + building[1];

                // Verify position is in bounds.
                if (lookX < 3 || lookX > 47 || lookY < 3 || lookY > 47) {
                    if (DEBUG === 1) {
                        console.log(lookX, lookY, 'out of bounds')
                    }
                    found = false;
                    break;
                }

                const tile = tiles.find(t => t.x === lookX && t.y === lookY);

                if (!tile) {
                    if (DEBUG === 1) {
                        console.log(lookX, lookY, 'not found in tiles')
                    }
                    found = false;
                    break;
                }
                if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                    continue;
                };
                if (tile.available === false) {
                    if (DEBUG === 1) {
                        console.log(lookX, lookY, 'tile is not available')
                    }
                    found = false;
                    break;
                };
            };
            if (found) {

                BUILDINGS.forEach(b => {
                    let isCenter = (b[0] == 0 && b[1] == 0)
                    updateTile(pos.x + b[0], pos.y + b[1], b[2], tiles, isCenter, b[3])
                });
                console.log('Found controller link pos', pos.x, pos.y)
                return;
            }


        }
    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} spawnCenter
     */
    extension: function (room, tiles, spawnCenter) {

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
        ];
        const RCL = [4, 5, 5, 6, 6];
        let start = spawnCenter;

        // Iterate through the rounds to set build level for each stamp.
        for (let i = 0; i < 5; i++) {


            const center = getStampStart(BUILDINGS, start, tiles, room)
            start = center;

            BUILDINGS.forEach(b => {
                let isCenter = (b[0] == 0 && b[1] == 0)
                updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
            });
        }
    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter
     */
    hub: function (room, tiles, hubCenter) {
        const BUILDINGS = [
            [-1, -2, STRUCTURE_ROAD, 4],
            [0, -2, STRUCTURE_ROAD, 4],
            [1, -2, STRUCTURE_ROAD, 4],
            [-2, -1, STRUCTURE_ROAD, 4],
            [-1, -1, STRUCTURE_TERMINAL, 6],
            [0, -1, STRUCTURE_LINK, 5],
            [1, -1, STRUCTURE_STORAGE, 4],
            [2, -1, STRUCTURE_ROAD, 4],
            [-2, 0, STRUCTURE_ROAD, 4],
            [-1, 0, STRUCTURE_NUKER, 8],
            [0, 0, undefined, 9],
            [1, 0, STRUCTURE_FACTORY, 7],
            [2, 0, STRUCTURE_ROAD, 4],
            [-1, 1, STRUCTURE_ROAD, 4],
            [0, 1, STRUCTURE_POWER_SPAWN, 8],
            [1, 1, STRUCTURE_ROAD, 4],
            [0, 2, STRUCTURE_ROAD, 4],
        ];

        const center = getStampStart(BUILDINGS, hubCenter, tiles, room)

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
        });
    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     */
    lab: function (room, tiles) {

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
        ];

        const storageTile = tiles.find(t => t.structure === STRUCTURE_STORAGE);
        const storagePos = new RoomPosition(storageTile.x, storageTile.y, room.name)

        const center = getStampStart(BUILDINGS, storagePos, tiles, room)

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
        });


    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} spawnCenter
     */
    spawn: function (room, tiles, spawnCenter) {
        const BUILDINGS = [
            [-2, -3, STRUCTURE_ROAD, 2],
            [-1, -3, STRUCTURE_ROAD, 2],
            [0, -3, STRUCTURE_ROAD, 2],
            [1, -3, STRUCTURE_ROAD, 2],
            [2, -3, STRUCTURE_ROAD, 2],

            [-3, -2, STRUCTURE_ROAD, 2],
            [-2, -2, STRUCTURE_EXTENSION, 2],
            [-1, -2, STRUCTURE_EXTENSION, 2],
            [0, -2, STRUCTURE_SPAWN, 1],
            [1, -2, STRUCTURE_EXTENSION, 2],
            [2, -2, STRUCTURE_EXTENSION, 2],
            [3, -2, STRUCTURE_ROAD, 2],

            [-3, -1, STRUCTURE_ROAD, 2],
            [-2, -1, STRUCTURE_EXTENSION, 2],
            [-1, -1, undefined, 9],
            [0, -1, STRUCTURE_EXTENSION, 3],
            [1, -1, undefined, 9],
            [2, -1, STRUCTURE_EXTENSION, 3],
            [3, -1, STRUCTURE_ROAD, 2],

            [-3, 0, STRUCTURE_ROAD, 2],
            [-2, 0, STRUCTURE_CONTAINER, 6],
            [-1, 0, STRUCTURE_EXTENSION, 3],
            [0, 0, STRUCTURE_LINK, 6],
            [1, 0, STRUCTURE_EXTENSION, 3],
            [2, 0, STRUCTURE_CONTAINER, 6],
            [3, 0, STRUCTURE_ROAD, 2],

            [-3, 1, STRUCTURE_ROAD, 2],
            [-2, 1, STRUCTURE_SPAWN, 7],
            [-1, 1, undefined, 9],
            [0, 1, STRUCTURE_EXTENSION, 3],
            [1, 1, undefined, 9],
            [2, 1, STRUCTURE_SPAWN, 8],
            [3, 1, STRUCTURE_ROAD, 2],

            [-3, 2, STRUCTURE_ROAD, 2],
            [-2, 2, STRUCTURE_EXTENSION, 4],
            [-1, 2, STRUCTURE_EXTENSION, 4],
            [0, 2, STRUCTURE_EXTENSION, 4],
            [1, 2, STRUCTURE_EXTENSION, 4],
            [2, 2, STRUCTURE_EXTENSION, 4],
            [3, 2, STRUCTURE_ROAD, 2],

            [-2, 3, STRUCTURE_ROAD, 2],
            [-1, 3, STRUCTURE_ROAD, 2],
            [0, 3, STRUCTURE_ROAD, 2],
            [1, 3, STRUCTURE_ROAD, 2],
            [2, 3, STRUCTURE_ROAD, 2],
        ]

        const center = getStampStart(BUILDINGS, spawnCenter, tiles, room)

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
        })


    },

};

/**
 * 
 * @param {Room} room 
 * @param {Tile[]} tiles 
 * @param {RoomPosition} hubCenter 
 * @param {Source[]} sources
 * @param {Mineral} mineral
 */
function setMiningContainers(room, tiles, hubCenter, sources, mineral) {

    console.log(sources.length)
    for (let source of sources) {
        let openTiles = [];
        for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
            for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
                let tile = tiles.find(t => t.x === x && t.y === y);
                if (tile.available) {
                    openTiles.push(tile);
                }
            }
        }

        console.log(openTiles.length)
        let minDist = Infinity;
        let closest = undefined;
        for (let tile of openTiles) {
            let pos = new RoomPosition(tile.x, tile.y, room.name);
            let dist = hubCenter.getRangeTo(pos);
            if (dist < minDist) {
                closest = tile;
                minDist = dist;
            }
        }

        updateTile(closest.x, closest.y, STRUCTURE_CONTAINER, tiles, true, 2);

    }

    let openTiles = [];
    for (let x = mineral.pos.x - 1; x <= mineral.pos.x + 1; x++) {
        for (let y = mineral.pos.y - 1; y <= mineral.pos.y + 1; y++) {
            let tile = tiles.find(t => t.x === x && t.y === y);
            if (tile.available) {
                openTiles.push(tile);
            }
        }
    }
    let minDist = Infinity;
    let closest = undefined;
    for (let tile of openTiles) {
        let pos = new RoomPosition(tile.x, tile.y, room.name);
        let dist = hubCenter.getRangeTo(pos);
        if (dist < minDist) {
            closest = tile;
            minDist = dist;
        }
    }

    updateTile(closest.x, closest.y, STRUCTURE_CONTAINER, tiles, true, 6);


};

module.exports = roomPlanner;