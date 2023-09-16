let MEMORY = require('memory');

const util_mincut = require('minCutRamparts')

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


    if (room.memory === undefined) {
        room.memory = {};
    };

    let plans = room.memory.plans;

    //if (plans === undefined) {

    if (!plans && Game.cpu.bucket > 100) {

        plans = getRoomPlans(room);

    };

    if (plans && Game.time % 20 === 0 && Game.cpu.bucket > 100) {
        placeSites(room, plans);
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

    // Set source containers
    setStamp.container(room, tiles, hubCenter, sources, mineral);

    setStamp.controller(room, tiles, hubCenter)

    const storagePos = setStamp.hub(room, tiles, hubCenter); // Roads from containers & controller link to storage @ lvl 2

    setStamp.lab(room, tiles, storagePos); // roads from lab center to storage @ lvl 6

    setStamp.extension(room, tiles, hubCenter, storagePos); // Roads from each extension block center to storage @ extension block lvl

    setStamp.spawn(room, tiles, hubCenter, storagePos); // roads from each spawn to storage @ lvl 2

    setIndividualStructures(tiles, room)

    setRamparts(room, tiles, storagePos)

    //TODO: 
    //place ramparts
    // Place Towers

    tiles.sort((a, b) => a.level - b.level)

    for (let tile of tiles) {

        if (tile.structure === undefined || tile.structure === 'BUFFER') {
            continue;
        } else if (tile.structure === STRUCTURE_RAMPART) {
            console.log('Rampart:', tile.x, tile.y)
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

function setRamparts(room, tiles, storagePos) {

    let BUILDINGS = [
        [STRUCTURE_TOWER, 3],
        [STRUCTURE_TOWER, 5],
        [STRUCTURE_TOWER, 7],
        [STRUCTURE_TOWER, 8],
        [STRUCTURE_TOWER, 8],
        [STRUCTURE_TOWER, 8]
    ]

    let output = util_mincut.test(room.name, tiles)

    // Build a block of grouped positions
    let blocks = [];
    let lastPos = new RoomPosition(output[0].x, output[0].y, room.name);
    let thisBlock = [];
    let centers = [];

    for (let o of output) {

        let thisPos = new RoomPosition(o.x, o.y, room.name)

        if (thisPos.isNearTo(lastPos)) {

            thisBlock.push(thisPos);
            lastPos = thisPos;

        } else {

            blocks.push(thisBlock)
            thisBlock = [];
            thisBlock.push(thisPos);
            lastPos = thisPos;

        }
    }
    blocks.push(thisBlock)

    blocks = blocks.sort((a, b) => b.length - a.length)

    for (let block of blocks) {
        // Get block center
        let x = 0;
        let y = 0;

        for (let r of block) {
            x += r.x;
            y += r.y;
        }
        x /= block.length;
        y /= block.length;
        x = Math.round(x);
        y = Math.round(y);

        let centerPos = new RoomPosition(x, y, room.name)
        let centerRampart = block[0];
        let min = Infinity;


        for (let r of block) {
            let thisPos = new RoomPosition(r.x, r.y, room.name)
            let range = thisPos.getRangeTo(centerPos)
            if (range < min) {
                min = range;
                centerRampart = r
            }
        }

        for (let r of block) {
            let center = false;
            if (centerRampart.x === r.x && centerRampart.y === r.y) {
                center = true;
                centers.push(new RoomPosition(r.x, r.y, room.name))

            }
            if (center) {
                let destination = new RoomPosition(r.x, r.y, room.name)
                setRoads(room, tiles, storagePos, destination, 0, 4)
            }
            updateTile(r.x, r.y, STRUCTURE_RAMPART, tiles, center, 4);


        }
    }


    for (let center of centers) {
        let centerDist = getPath(center, storagePos, 1, tiles, room).length;

        for (let tile of tiles) {
            if (tile.structure === STRUCTURE_ROAD) {
                let pos = new RoomPosition(tile.x, tile.y, room.name);
                if (pos.getRangeTo(center) <= 2) {
                    let posDist = getPath(pos, storagePos, 1, tiles, room).length;
                    if (posDist < centerDist) {
                        updateTile(pos.x, pos.y, STRUCTURE_RAMPART, tiles, center, 4);
                    }
                }
            }
        }
    }

    while (BUILDINGS.length > 0) {
        for (let center of centers) {

            let building = BUILDINGS.pop()
            // get roadPath from center to storage
            let path = getPath(center, storagePos, 1, tiles, room)
            let placed = false;
            for (let p of path) {
                if (placed) break;
                let pos = new RoomPosition(p.x, p.y, room.name)
                if (pos.getRangeTo(center) > 2) {
                    for (let x = p.x - 1; x <= p.x + 1; x++) {
                        if (placed) break;
                        for (let y = p.y - 1; y <= p.y + 1; y++) {

                            let tile = tiles.find(t => t.x === x && t.y === y)
                            if (tile.available) {
                                updateTile(x, y, building[0], tiles, false, building[1])
                                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, building[1])
                                placed = true;
                                break;
                            }


                        }
                    }
                }
            }
        }

    }
}

/**
 * 
 * @param {Room} room 
 * @param {Tile[]} tiles 
 * @param {RoomPosition} origin 
 * @param {RoomPosition} destination 
 * @param {number} range 
 * @param {number} level 
 */
function setRoads(room, tiles, origin, destination, range, level) {

    let path = getPath(origin, destination, range, tiles, room)

    for (let p of path) {
        updateTile(p.x, p.y, STRUCTURE_ROAD, tiles, false, level);
    }

};

/**
 * 
 * @param {RoomPosition} origin 
 * @param {RoomPosition} destination 
 * @param {number} range 
 * @param {Tile[]} tiles
 * @param {Room} room
 * @returns {PathFinderPath}
 */
function getPath(origin, destination, range, tiles, room) {
    let target = { pos: destination, range: range };

    let ret = PathFinder.search(
        origin, target, {
        plainCost: 2,
        swampCost: 2,
        roomCallback: function (roomName) {
            const costs = getPlannerCostMatrix(tiles, room);
            return costs;
        },
    });

    return ret.path;
};

/**
 * Builds the initial costmatrix for road placement.
 * @param {Tile[]} tiles 
 * @param {Room} room
 * @returns {CostMatrix}
 */
function getPlannerCostMatrix(tiles, room) {
    let sources = room.find(FIND_SOURCES);
    const mineral = room.find(FIND_MINERALS)[0];
    let costs = new PathFinder.CostMatrix;
    for (let tile of tiles) {
        if (tile.structure === STRUCTURE_ROAD) {
            costs.set(tile.x, tile.y, 1)
        } else if (tile.structure === 'BUFFER' || tile.structure === STRUCTURE_RAMPART) {
            continue;
        } else if (tile.available === false) {
            costs.set(tile.x, tile.y, 0xff);
        }
    };

    for (let source of sources) {
        for (let x = -1 + source.pos.x; x <= 1 + source.pos.x; x++) {
            for (let y = -1 + source.pos.y; y <= 1 + source.pos.y; y++) {
                const tile = tiles.find(t => t.x === x && t.y === y)
                if (tile.available) {
                    costs.set(x, y, 10);
                }
            }
        }
    }

    for (let x = -1 + mineral.pos.x; x <= 1 + mineral.pos.x; x++) {
        for (let y = -1 + mineral.pos.y; y <= 1 + mineral.pos.y; y++) {
            costs.set(x, y, 10);
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
            return undefined;
        }


        const center = queue.shift();


        const x = center.x;
        const y = center.y;




        if (x < 3 || x > 47 || y < 3 || y > 47 || room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) {

            continue;
        }

        found = true;

        for (let building of BUILDINGS) {

            const lookX = x + building[0];
            const lookY = y + building[1];

            // Verify position is in bounds.
            if (lookX < 3 || lookX > 47 || lookY < 3 || lookY > 47) {

                found = false;
                break;
            }

            const tile = tiles.find(t => t.x === lookX && t.y === lookY);

            if (!tile) {

                found = false;
                break;
            }
            if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                continue;
            };
            if (tile.available === false) {

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

    const reqDisplayLevel = room.controller.level;

    if (plans === undefined) {
        return;
    };
    for (let order of plans) {

        if (order.structure && !order.placed && order.level <= reqDisplayLevel) {//order.structure != STRUCTURE_RAMPART
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
     */
    container: function (room, tiles, hubCenter, sources, mineral) {
        const BUILDINGS = [
            [-1, -1, 'BUFFER', 9],
            [0, -1, 'BUFFER', 9],
            [1, -1, 'BUFFER', 9],
            [-1, 0, 'BUFFER', 9],
            [0, 0, STRUCTURE_CONTAINER, 2],
            [0, 0, STRUCTURE_RAMPART, 2],
            [1, 0, 'BUFFER', 9],
            [-1, 1, 'BUFFER', 9],
            [0, 1, 'BUFFER', 9],
            [1, 1, 'BUFFER', 9],
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
                const path = getPath(pos, hubCenter, 1, tiles, room);
                const dist = path.length;

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
            const path = getPath(pos, hubCenter, 1, tiles, room);
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

        updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR, tiles, false, 6)
        updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_RAMPART, tiles, false, 6)

    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter
     */
    controller: function (room, tiles, hubCenter) {
        const BUILDINGS = [
            [-1, -1, 'BUFFER', 9],
            [0, -1, 'BUFFER', 9],
            [1, -1, 'BUFFER', 9],
            [-1, 0, 'BUFFER', 9],
            [0, 0, STRUCTURE_LINK, 5],
            [1, 0, 'BUFFER', 9],
            [-1, 1, 'BUFFER', 9],
            [0, 1, 'BUFFER', 9],
            [1, 1, 'BUFFER', 9],
        ];

        let availablePos = [];
        // Find all tiles at range 2 from controller
        const cX = room.controller.pos.x;
        const cY = room.controller.pos.y;


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

        // sort by closest tile to hub
        availablePos = availablePos.sort((a, b) => a.getRangeTo(hubCenter) - b.getRangeTo(hubCenter))
        // check for 3x3 available and place buildings if found


        for (let pos of availablePos) {
            let found = true;

            for (let building of BUILDINGS) {

                const lookX = pos.x + building[0];
                const lookY = pos.y + building[1];

                // Verify position is in bounds.
                if (lookX < 3 || lookX > 47 || lookY < 3 || lookY > 47) {

                    found = false;
                    break;
                }

                const tile = tiles.find(t => t.x === lookX && t.y === lookY);

                if (!tile) {

                    found = false;
                    break;
                }
                if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                    continue;
                };
                if (tile.available === false) {

                    found = false;
                    break;
                };
            };
            if (found) {

                BUILDINGS.forEach(b => {
                    let isCenter = (b[0] == 0 && b[1] == 0)
                    updateTile(pos.x + b[0], pos.y + b[1], b[2], tiles, isCenter, b[3])
                });

                return;
            }


        }
    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} start
     */
    extension: function (room, tiles, start, storagePos) {

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

        // Iterate through the rounds to set build level for each stamp.
        for (let i = 0; i < 5; i++) {


            const center = getStampStart(BUILDINGS, start, tiles, room)
            start = center;

            BUILDINGS.forEach(b => {
                let isCenter = (b[0] == 0 && b[1] == 0)
                updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, RCL[i])
            });

            setRoads(room, tiles, center, storagePos, 1, RCL[i]);
        }
    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter
     * @return {RoomPosition} Storage tile position.
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
            [1, -1, STRUCTURE_RAMPART, 4],
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

        const storageTile = tiles.find(t => t.structure === STRUCTURE_STORAGE)
        const destination = new RoomPosition(storageTile.x, storageTile.y, room.name)
        // Build roads from each container or link to storage
        for (let tile of tiles) {
            if (tile.structure === STRUCTURE_CONTAINER) {

                const origin = new RoomPosition(tile.x, tile.y, room.name);
                setRoads(room, tiles, origin, destination, 1, tile.level)

            } else if (tile.structure === STRUCTURE_LINK) {

                const origin = new RoomPosition(tile.x, tile.y, room.name);
                setRoads(room, tiles, origin, destination, 1, 2);

            };
        };

        return destination

    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} storagePos
     */
    lab: function (room, tiles, storagePos) {

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


        const center = getStampStart(BUILDINGS, storagePos, tiles, room)

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
        });


        setRoads(room, tiles, center, storagePos, 1, 6);

    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} spawnCenter
     * @param {RoomPosition} storagePos
     */
    spawn: function (room, tiles, spawnCenter, storagePos) {
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
            [0, -2, STRUCTURE_RAMPART, 4],
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
            [-2, 1, STRUCTURE_RAMPART, 7],
            [-1, 1, undefined, 9],
            [0, 1, STRUCTURE_EXTENSION, 3],
            [1, 1, undefined, 9],
            [2, 1, STRUCTURE_SPAWN, 8],
            [2, 1, STRUCTURE_RAMPART, 8],
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
        let spawns = [];

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
            if (b.structure === STRUCTURE_SPAWN) {
                spawns.push(new RoomPosition(center.x + b[0], center.y + b[1], room.name))
            }

        })

        for (let origin of spawns) {
            setRoads(room, tiles, origin, storagePos, 1, 2);
        }


    },

};

/**
 * 
 * @param {Room} room 
 * @param {BuildOrder[]} plans 
 */
function placeSites(room, plans) {
    const RCL = room.controller.level
    for (let order of plans) {
        updatePlacedStatus(order, room)
        if (order.level <= RCL && !order.placed) {

            room.createConstructionSite(order.x, order.y, order.structure)



        }
    }
}

/**
 * 
 * @param {BuildOrder} order 
 * @param {Room} room 
 */
function updatePlacedStatus(order, room) {

    let pos = new RoomPosition(order.x, order.y, room.name)

    let buildings = pos.lookFor(LOOK_STRUCTURES)
    let sites = pos.lookFor(LOOK_CONSTRUCTION_SITES)
    let placed = false;
    for (let building of buildings) {
        if (building.structureType === order.structure) {
            placed = true;
        }
    }
    for (let site of sites) {
        if (site.structureType === order.structure) {
            placed = true;
        }
    }

    order.placed = placed;

}

module.exports = roomPlanner;