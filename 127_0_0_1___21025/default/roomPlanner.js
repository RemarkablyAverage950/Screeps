let MEMORY = require('memory');

const util_mincut = require('minicutRamparts')

const DEBUG = 1;


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
    const midX = Math.round(sources.map(s => s.pos.x).concat(controller.pos.x).concat(mineral.pos.x).reduce((a, b) => a + b) / (2 + sources.length))
    const midY = Math.round(sources.map(s => s.pos.y).concat(controller.pos.y).concat(mineral.pos.y).reduce((a, b) => a + b) / (2 + sources.length))
    const spawnCenter = new RoomPosition(midX, midY, room.name)

    setStamp.spawn(room, tiles, spawnCenter);

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

function placeSites(room, plans) {


};

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
    let arr = [start.x,start.y];
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
            if(DEBUG === 1){
                console.log(x,y,'out of bounds or is a terrain wall.')
            }
            continue;
        }

        found = true;

        for (let building of BUILDINGS) {

            const lookX = x + building[0];
            const lookY = y + building[1];

            // Verify position is in bounds.
            if (lookX < 3 || lookX > 47 || lookY < 3 || lookY > 47) {
                if(DEBUG === 1){
                    console.log(lookX,lookY,'out of bounds')
                }
                found = false;
                break;
            }

            const tile = tiles.find(t => t.x === lookX && t.y === lookY);

            if (!tile) {
                if(DEBUG === 1){
                    console.log(lookX,lookY,'not found in tiles')
                }
                found = false;
                break;
            }
            if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                continue;
            };
            if (tile.available === false) {
                if(DEBUG === 1){
                    console.log(lookX,lookY,'tile is not available')
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

        let center = getStampStart(BUILDINGS, spawnCenter, tiles, room)

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
        })


    },

};

module.exports = roomPlanner;