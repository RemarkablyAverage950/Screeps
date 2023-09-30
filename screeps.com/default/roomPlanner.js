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


    //room.memory.plans = undefined;

    let plans = room.memory.plans;

    //if (plans === undefined) {

    if ((!plans || !plans[room.name]) && Game.cpu.bucket > 500) {

        plans = getRoomPlans(room);

    };





    if (Game.time % 20 === 0 && room.memory.outposts.length > 0 && Game.cpu.bucket > 100 && plans) {
        outpostPlanner(room, plans)
    }

    if (plans && Game.time % 1000 == 0 && Game.cpu.bucket > 100) {
        console.log('validating structures', room.name)
        validateStructures(room, plans)
    }


    if (plans && Game.time % 20 === 0 && Game.cpu.bucket > 100) {
        placeSites(room, plans);
    };

    if (plans) visualizeStructures(plans, room);

};

/**
 * 
 * @param {Room} room 
 * @param {Object[]} plans 
 */
function validateStructures(room, plans) {
    const structures = room.find(FIND_STRUCTURES);
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    let spawnCount = room.find(FIND_MY_SPAWNS).length;


    for (let s of structures) {
        if (s.structureType === STRUCTURE_CONTROLLER) {
            continue;
        }
        // Find a co-relating build order
        const pos = s.pos
        const plan = plans[room.name].find(bo => bo.x === pos.x && bo.y === pos.y && s.structureType === bo.structure)

        // If no plan exists, remove structure
        if (!plan) {

            // Except if structure is a spawn. Then make sure there is > 1 spawns first.
            if (s.structureType === STRUCTURE_SPAWN) {

                if (spawnCount > 1) {
                    console.log('removing structure', s.structureType, JSON.stringify(s.pos))
                    s.destroy()
                    spawnCount--;

                }

            } else {
                console.log('removing structure', s.structureType, JSON.stringify(s.pos))
                s.destroy()

            }
        }
    }

    // Repeat for construction sites

    for (let s of sites) {

        // Find a co-relating build order
        const pos = s.pos
        const plan = plans[room.name].find(bo => bo.x === pos.x && bo.y === pos.y && s.structureType === bo.structure)

        // If no plan exists, remove structure
        if (!plan) {

            console.log('removing construction site', JSON.stringify(s.pos))

            s.remove()

        }
    }
}

function outpostPlanner(homeRoom) {
    //console.log('Entering outpostPlanner', homeRoom.name)
    if (!homeRoom) {
        return;
    }

    let outposts = homeRoom.memory.outposts;
    if (!outposts) {
        return;
    }
    for (let outpostName of outposts) {

        // Check if we are in the room.
        let outpostRoom = Game.rooms[outpostName];
        if (!outpostRoom) {
            //console.log('not in outpost room')
            continue;
        }
   
        let outpostPlans = homeRoom.memory.plans[outpostName]


        if (!outpostPlans || outpostPlans.length === 0) {
            getOutpostPlans(outpostRoom, homeRoom);
        }

    }

}

/**
 * 
 * @param {Room} outpostRoom 
 * @param {Room} homeRoom
 * @param {BuildOrder[]} plans 
 */
function getOutpostPlans(outpostRoom, homeRoom) {
    console.log('Entering getOutpostPlans', outpostRoom.name)
    const sources = outpostRoom.find(FIND_SOURCES);
    const storageTile = homeRoom.memory.plans[homeRoom.name].find(bo => bo.structure === STRUCTURE_STORAGE);
    const route = Game.map.findRoute(outpostRoom.name, homeRoom.name).map(r => r.room);
    const destination = new RoomPosition(storageTile.x, storageTile.y, homeRoom.name)
    const plans = homeRoom.memory.plans
    console.log('plans', JSON.stringify(plans))
    for (let roomName of route) {
        if (!plans[roomName]) {

        }
    }

    plans[outpostRoom.name] = [];

    for (let s of sources) {


        let path = PathFinder.search(s.pos, destination, {
            ignoreCreeps: true,
            plainCost: 3,
            swampCost: 5,
            roomCallback: function (roomName) {


                // In this example `room` will always exist, but since 
                // PathFinder supports searches which span multiple rooms 
                // you should be careful!

                let costs = new PathFinder.CostMatrix;


                let structures = plans[roomName]


                if (structures) {
                    structures.forEach(function (struct) {
                        if (struct.structure === STRUCTURE_RAMPART) {
                            return;
                        }
                        if (struct.structure === STRUCTURE_ROAD) {
                            // Favor roads over plain tiles
                            costs.set(struct.x, struct.y, 1);
                        } else {
                            costs.set(struct.x, struct.y, 0xff);
                        }
                    });
                }

                return costs;
            },

        }).path

        console.log('plans keys', Object.keys(plans))
        for (let i = 0; i < path.length; i++) {

            let pos = path[i];


            if (pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49) {
                continue;
            }

            if (i === 0) {
                plans[pos.roomName].push(new BuildOrder(pos.x, pos.y, STRUCTURE_CONTAINER, 4));
                continue;
            }

            let bo = plans[pos.roomName].find(b => b.x === pos.x && b.y === pos.y)
            if (bo) {
                bo.level = Math.min(4, bo.level);
            } else {
                plans[pos.roomName].push(new BuildOrder(pos.x, pos.y, STRUCTURE_ROAD, 4));
            }

        }
    }

    homeRoom.memory.plans = plans;



    /*let outPostPlans = [];
 
    for (let r of route) {
 
 
 
        for (let s of sources) {
            const path = PathFinder.search(s.pos, destination, { range: 1 }, {
                plainCost: 2,
                swampCost: 4,
                maxOps: 4000,
                maxRooms: 16,
                roomCallback: function (roomName) {
                    if (roomName = homeRoom.name) {
                        return buildOutpostCostmatrix(plans)
                    } else {
                        return buildOutpostCostmatrix(outPostPlans)
                    }
                },
            }).path.filter(p => r.roomName === p.roomName)
 
            for (let p of path) {
                const buildOrder =
                    updateTile()
            }
 
        }
    }*/
}

function getTiles(room) {
    let terrain = new Room.Terrain(room.name);
    let tiles = [];

    for (let x = 2; x < 49; x++) {
        for (let y = 1; y < 49; y++) {

            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                tiles.push(new Tile(x, y, false));
            } else {
                tiles.push(new Tile(x, y, true));
            };



        };
    };

    return tiles;
}

/**
 * Generates build plans for a room
 * @param {Room} room 
 */
function getRoomPlans(room) {



    let tiles = getTiles(room);
    let buildOrders = [];

    // Create a 50x50 grid.
    // Mark all terrain walls as unavailable, open spaces as available.


    const sources = room.find(FIND_SOURCES)
    const controller = room.controller
    const mineral = room.find(FIND_MINERALS)[0]
    const hubX = Math.round(sources.map(s => s.pos.x).concat(controller.pos.x).concat(mineral.pos.x).reduce((a, b) => a + b) / (2 + sources.length))
    const hubY = Math.round(sources.map(s => s.pos.y).concat(controller.pos.y).concat(mineral.pos.y).reduce((a, b) => a + b) / (2 + sources.length))
    const hubCenter = new RoomPosition(hubX, hubY, room.name)
    const spawnX = Math.round(sources.map(s => s.pos.x).concat(hubCenter.x).reduce((a, b) => a + b) / (1 + sources.length))
    const spawnY = Math.round(sources.map(s => s.pos.y).concat(hubCenter.y).reduce((a, b) => a + b) / (1 + sources.length))
    const spawnCenter = new RoomPosition(spawnX, spawnY, room.name)
    // Set source containers
    setStamp.container(room, tiles, hubCenter, sources, mineral);

    setStamp.controller(room, tiles, hubCenter)

    const storagePos = setStamp.hub(room, tiles, hubCenter); // Roads from containers & controller link to storage @ lvl 2

    setStamp.lab(room, tiles, storagePos); // roads from lab center to storage @ lvl 6
    setStamp.spawn(room, tiles, spawnCenter, storagePos); // roads from each spawn to storage @ lvl 2
    setStamp.extension(room, tiles, hubCenter, storagePos); // Roads from each extension block center to storage @ extension block lvl


    setIndividualStructures(tiles, room)

    setRamparts(room, tiles, storagePos)

    tiles.sort((a, b) => a.level - b.level)

    for (let tile of tiles) {

        if (tile.structure === undefined || tile.structure === 'BUFFER') {
            continue;
        } else

            buildOrders.push(new BuildOrder(tile.x, tile.y, tile.structure, tile.level));

    };
    room.memory.plans = {}
    room.memory.plans[room.name] = buildOrders;

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
    let centers = [];
    let found = false
    while (output.length > 0) {

        let block = [];

        let o = output.pop();

        let queue = [o]
        while (queue.length) {

            let qPop = queue.pop()
            let qp = new RoomPosition(qPop.x, qPop.y, room.name)
            block.push(qp)
            for (let p of output) {
                let pos = new RoomPosition(p.x, p.y, room.name)
                if (pos.isNearTo(qp)) {
                    queue.push(p)
                    let idx = output.findIndex(x => x.x === p.x && x.y === p.y)
                    output.splice(idx, 1)
                }
            }
        }

        blocks.push(block)
    }

    /*for (let o of output) {
        let placed = false;
        let thisPos = new RoomPosition(o.x, o.y, room.name)
        
        for (let block of blocks) {
            if (placed) {
                break
            }
            for (let pos of block) {
                if (pos.isNearTo(thisPos)) {
                    console.log(JSON.stringify(thisPos),'is near to',JSON.stringify(pos))
                    block.push(thisPos)
                    console.log(block)
                    placed = true;
                    break;
                }
            }
        }
        if (placed) {

            continue;

        } else {

            blocks.push([thisPos])

        }
    }*/




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
            if (BUILDINGS.length === 0) {
                break;
            }
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
                            if (!tile) {
                                console.log('Tile', x, y, room.name, 'unavailable')
                            }
                            try {
                                if (tile && tile.available) {
                                    updateTile(x, y, building[0], tiles, false, building[1]);
                                    updateTile(x, y, STRUCTURE_RAMPART, tiles, false, building[1]);
                                    placed = true;
                                    break;
                                }
                            } catch (e) {
                                console.log('Failed', e, x, y, building[0])
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
 * @returns {PathFinderPath}
 */
function getPath(origin, destination, range, tiles, maxRooms = 0) {
    let target = { pos: destination, range: range };

    let ret = PathFinder.search(
        origin, target, {
        plainCost: 2,
        swampCost: 2,
        maxRooms: maxRooms,
        roomCallback: function (roomName) {
            if (!Game.rooms[roomName]) {
                return;
            }
            //console.log(roomName, JSON.stringify(Game.rooms[roomName]))
            const costs = getPlannerCostMatrix(tiles, Game.rooms[roomName]);
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
                if (tile && tile.available) {
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
function getStampStart(BUILDINGS, start, tiles, room, ignoreWalls = false) {


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
            console.log(queue.length, '200')
            return undefined;
        }


        const center = queue.shift();


        const x = center.x;
        const y = center.y;




        if (x < 3 || x > 47 || y < 3 || y > 47 || (!ignoreWalls && room.getTerrain().get(x, y) === TERRAIN_MASK_WALL)) {

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




function visualizeStructures(plans, room) {

    const reqDisplayLevel = room.controller.level;

    if (plans === undefined) {
        return;
    };
    let roomPlans = plans[room.name];
    if (!roomPlans) {
        return;
    }
    for (let order of roomPlans) {



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
            [0, 0, STRUCTURE_RAMPART, 3],
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

        updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR, tiles, false, 6);

    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter
     */
    controller: function (room, tiles, hubCenter) {
        console.log('Entering setStamp.controller')

        const BUILDINGS = [
            [-1, -1, 'BUFFER', 9],
            [0, -1, 'BUFFER', 9],
            [1, -1, 'BUFFER', 9],
            [-1, 0, 'BUFFER', 9],
            [0, 0, STRUCTURE_LINK, 6],
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

        let found = false;
        for (let pos of availablePos) {
            if (found) break;

            found = true;

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

                break;
            }
        }

        if (!found) {
            for (let pos of availablePos) {
                if (found) break;
                let blockedCount = 0;

                found = true;

                for (let building of BUILDINGS) {
                    if (blockedCount > 2) { found = false; break; }
                    const lookX = pos.x + building[0];
                    const lookY = pos.y + building[1];

                    // Verify position is in bounds.
                    if (lookX < 3 || lookX > 47 || lookY < 3 || lookY > 47) {
                        blockedCount++

                        break;
                    }

                    const tile = tiles.find(t => t.x === lookX && t.y === lookY);

                    if (!tile) {
                        blockedCount++

                        break;
                    }
                    if (tile.structure === STRUCTURE_ROAD && building[2] === STRUCTURE_ROAD) {
                        continue;
                    };
                    if (tile.available === false) {
                        blockedCount++

                        break;
                    };
                };
                if (found) {

                    BUILDINGS.forEach(b => {
                        let isCenter = (b[0] == 0 && b[1] == 0)
                        updateTile(pos.x + b[0], pos.y + b[1], b[2], tiles, isCenter, b[3])
                    });

                    break;
                }
            }
        }

        console.log('Placing controller Ramparts')
        const controller = room.controller
        console.log(JSON.stringify(controller.pos))
        let terrain = room.getTerrain(room.name)
        console.log(JSON.stringify(terrain))

        for (let x = controller.pos.x - 1; x <= controller.pos.x + 1; x++) {
            let y = -1 + controller.pos.y
            console.log(x, y, terrain.get(x, y))

            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                console.log('placing rampart at', x, y)
                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4)
            }
            y = 1 + controller.pos.y
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                console.log('placing rampart at', x, y)
                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4)
            }
        }

        for (let y = controller.pos.y - 1; y <= controller.pos.y + 1; y++) {
            let x = -1 + controller.pos.x

            console.log(x, y, terrain.get(x, y))
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                console.log('placing rampart at', x, y)

                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4)
            }
            x = 1 + controller.pos.x
            console.log(x, y, terrain.get(x, y))
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                console.log('placing rampart at', x, y)
                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4)
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
        start = storagePos
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


            const center = getStampStart(BUILDINGS, start, tiles, room, true)
            console.log('CENTER', center)
            let x = 0
            let y = 0
            extensionBlocks = tiles.filter(t => t.center && t.structure === STRUCTURE_EXTENSION)
            if (extensionBlocks.length) {
                extensionBlocks.forEach(e => {
                    x += e.x;
                    y += e.y;
                })

                x = Math.round(x / (extensionBlocks.length))
                y = Math.round(y / (extensionBlocks.length))

                console.log('starting at', x, y)
                start = new RoomPosition(x, y, room.name)

            }

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
            [1, -2, STRUCTURE_ROAD, 2],
            [-2, -1, STRUCTURE_ROAD, 4],
            [-1, -1, STRUCTURE_TERMINAL, 6],
            [-1, -1, STRUCTURE_RAMPART, 6],
            [0, -1, STRUCTURE_LINK, 5],
            [1, -1, STRUCTURE_STORAGE, 4],
            [1, -1, STRUCTURE_RAMPART, 4],
            [2, -1, STRUCTURE_ROAD, 2],
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


        const center = getStampStart(BUILDINGS, hubCenter, tiles, room, true)

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
            [0, -2, STRUCTURE_RAMPART, 3],
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
            [-2, 0, STRUCTURE_CONTAINER, 2],
            [-1, 0, STRUCTURE_EXTENSION, 3],
            [0, 0, STRUCTURE_LINK, 5],
            [1, 0, STRUCTURE_EXTENSION, 3],
            [2, 0, STRUCTURE_CONTAINER, 2],
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

        const center = getStampStart(BUILDINGS, spawnCenter, tiles, room, true)
        let spawns = [];

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3])
            if (b[2] === STRUCTURE_SPAWN) {
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
function placeSites(homeRoom, plans) {
    const RCL = homeRoom.controller.level
    let rooms = [homeRoom.name, ...homeRoom.memory.outposts]

    //console.log('rooms', JSON.stringify(rooms))
    for (let roomName of rooms) {
        let room = Game.rooms[roomName]
        if (!room) {
            continue;
        }
        let roomPlans = plans[roomName]
        if (!roomPlans) {
            console.log('No roomPlans found for', roomName)
            continue;
        }

        for (let order of roomPlans) {
            updatePlacedStatus(order, room)

            if (order.level <= RCL && !order.placed) {
                room.createConstructionSite(order.x, order.y, order.structure)
            }
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

    if (tile && tile.available === false && (structure === STRUCTURE_RAMPART || structure === STRUCTURE_ROAD)) {

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

module.exports = roomPlanner;