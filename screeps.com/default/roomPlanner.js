let MEMORY = require('memory');

const util_mincut = require('minCutRamparts');


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
     * @param {boolean} available 
     * @param {boolean} nearExit
     */
    constructor(x, y, available, nearExit) {
        this.x = x;
        this.y = y;
        this.available = available;
        this.structure = undefined;
        this.center = false;
        this.level = 8;
        this.nearExit = nearExit;
        this.inside = false;
        this.protect = false;
    };
};

/**
 * 
 * @param {Room} room 
 */
function roomPlanner(room) {

    //room.memory.plans = undefined;
    if (room.name === 'W7N3') {
        //room.memory.plans = undefined;
    }
    let plans = room.memory.plans;

    //if (plans === undefined) {

    if ((!plans || !plans[room.name]) && Game.cpu.bucket > 500) {

        plans = getRoomPlans(room);
        try {
            validateStructures(room, plans)
            placeSites(room, plans);
        } catch (e) { }
    };
    //placeSites(room, plans);




    if (Game.time % 500 === 0 && room.memory.outposts.length > 0 && Game.cpu.bucket > 100 && plans) {
        outpostPlanner(room, plans)
    }

    if (plans && Game.time % 1000 == 0 && Game.cpu.bucket > 100) {
        //console.log('validating structures', room.name)
        validateStructures(room, plans)
    }



    if (plans && Game.time % 100 === 0 && Game.cpu.bucket > 20) {

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
    const enemyStructures = room.find(FIND_HOSTILE_STRUCTURES)
    const enemySites = room.find(FIND_HOSTILE_CONSTRUCTION_SITES)
    let spawnCount = room.find(FIND_MY_SPAWNS).length;
    for (let s of enemySites) {
        s.remove()
    }
    for (let s of enemyStructures) {
        s.destroy()
    }

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
    //console.log('Entering getOutpostPlans', outpostRoom.name)
    const sources = outpostRoom.find(FIND_SOURCES);
    const storageTile = homeRoom.memory.plans[homeRoom.name].find(bo => bo.structure === STRUCTURE_STORAGE);
    const route = Game.map.findRoute(outpostRoom.name, homeRoom.name).map(r => r.room);
    const destination = new RoomPosition(storageTile.x, storageTile.y, homeRoom.name)
    const plans = homeRoom.memory.plans
    //console.log('plans', JSON.stringify(plans))
    for (let roomName of route) {
        if (!plans[roomName]) {
            return;
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
                    for (let struct of structures) {
                        if (struct.structure === STRUCTURE_RAMPART) {
                            continue;
                        }
                        if (struct.structure === STRUCTURE_ROAD) {
                            // Favor roads over plain tiles
                            costs.set(struct.x, struct.y, 1);
                        } else {
                            costs.set(struct.x, struct.y, 0xff);
                        }

                    }

                }

                return costs;
            },

        }).path

        //console.log('plans keys', Object.values(plans))
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
                plans[pos.roomName].push(new BuildOrder(pos.x, pos.y, STRUCTURE_ROAD, 3))
            } else {
                plans[pos.roomName].push(new BuildOrder(pos.x, pos.y, STRUCTURE_ROAD, 3));
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
    let exits = Object.values(Game.map.describeExits(room.name))

    let topExits = room.find(FIND_EXIT_TOP)
    let bottomExits = room.find(FIND_EXIT_BOTTOM)
    let leftExits = room.find(FIND_EXIT_LEFT)
    let rightExits = room.find(FIND_EXIT_RIGHT)

    for (let x = 1; x < 49; x++) {
        for (let y = 1; y < 49; y++) {



            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                tiles.push(new Tile(x, y, false));
            } else {

                if (topExits.length && y < 5) {

                    let pos = new RoomPosition(x, y, room.name)
                    let closest = pos.findClosestByRange(topExits)
                    if (closest.getRangeTo(pos) < 5) {
                        tiles.push(new Tile(x, y, true, true));
                        continue;
                    }
                }
                if (bottomExits.length && y > 44) {
                    let pos = new RoomPosition(x, y, room.name)
                    let closest = pos.findClosestByRange(bottomExits)
                    if (closest.getRangeTo(pos) < 5) {
                        tiles.push(new Tile(x, y, true, true));
                        continue;
                    }
                }
                if (leftExits.length && x < 5) {
                    let pos = new RoomPosition(x, y, room.name)
                    let closest = pos.findClosestByRange(leftExits)
                    if (closest.getRangeTo(pos) < 5) {
                        tiles.push(new Tile(x, y, true, true));
                        continue;
                    }
                }
                if (rightExits.length && x > 44) {

                    let pos = new RoomPosition(x, y, room.name)
                    let closest = pos.findClosestByRange(rightExits)
                    if (closest.getRangeTo(pos) < 5) {
                        tiles.push(new Tile(x, y, true, true));
                        continue;
                    }

                }


                tiles.push(new Tile(x, y, true, false));
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

    console.log('Getting room plans for', room.name)


    let tiles = getTiles(room);
    let buildOrders = [];
    //console.log('A', room.name, tiles.length)
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
    //console.log('B', tiles.length)
    setStamp.controller(room, tiles, hubCenter)
    //console.log('C', tiles.length)

    const storagePos = setStamp.hub(room, tiles, hubCenter); // Roads from containers & controller link to storage @ lvl 2
    //console.log('D', tiles.length)
    setStamp.lab(room, tiles, storagePos); // roads from lab center to storage @ lvl 6
    //console.log('E', tiles.length)
    setStamp.spawn(room, tiles, spawnCenter, storagePos); // roads from each spawn to storage @ lvl 2
    //console.log('F', tiles.length)
    setStamp.extension(room, tiles, hubCenter, storagePos); // Roads from each extension block center to storage @ extension block lvl
    //console.log('G', tiles.length)
    setRoads(room, tiles, storagePos, sources, mineral)
    //console.log('H', tiles.length)
    setIndividualStructures(tiles, room)
    //console.log('I', tiles.length)
    setRamparts(room, tiles, storagePos)
    //console.log('J', tiles.length)
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
    let searched = [];
    for (let center of centers) {
        let centerPos = new RoomPosition(center.x, center.y, room.name)

        let availableTiles = tiles.filter(t => {
            if (!t.available) {
                return false;
            }
            let tPos = new RoomPosition(t.x, t.y, room.name)
            if (tPos.getRangeTo(centerPos) === 2) {
                return true;
            }
            return false;
        })

        while (BUILDINGS.length && availableTiles.length) {
            let tile = availableTiles.pop()
            let building = BUILDINGS.shift()


            updateTile(tile.x, tile.y, building[0], tiles, false, building[1], true);

        }

    }

    if (BUILDINGS.length) {

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
            updateTile(pos.x, pos.y, building[0], tiles, false, building[1], true);
        };
    }
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

    let output = util_mincut.test(room.name, tiles).map(o => new RoomPosition(o.x, o.y, room.name))

    // Build a block of grouped positions
    let blocks = [];
    let centers = [];
    let found = false
    while (output.length > 0) {

        let o = output[0]

        let searched = [];

        let block = [o];

        let queue = [o]

        while (queue.length) {

            let next = queue.pop()

            searched.push(next)

            let idx = output.findIndex(o => o.x === next.x && o.y === next.y)

            if (idx > -1) {
                output.splice(idx, 1)
            }

            for (let pos of output) {
                if (block.some(s => s.x === pos.x && s.y === pos.y)) {
                    continue;
                }

                if (pos.isNearTo(next)) {
                    queue.push(pos)
                    block.push(pos)
                }
            }

        }

        blocks.push(block)

        /*let o = output.pop();
        let oPos = new RoomPosition(o.x, o.y, room.name)
        let found = false;
 
        for (let i = 0; i < blocks.length; i++) {
            if (found) {
                break;
            }
            for (let pos of blocks[i]) {
                if (pos.isNearTo(oPos)) {
                    blocks[i].push(oPos)
                    found = true;
                    break;
                }
 
            }
        }
 
        if (!found) {
            // Go through each block and roll through a 
 
 
 
            blocks.push([oPos])
        }
        */
    }
    console.log('A Blocks', JSON.stringify(blocks))
    console.log('Block Count', blocks.length)
    updateInsideTiles(room, tiles, blocks, storagePos)

    for (let i = blocks.length - 1; i >= 0; i--) {
        if (!blocks[i].some(pos => {
            let tile = tiles.find(t => t.x === pos.x && t.y === pos.y)

            if (tile.inside) {
                return true;
            } else {
                return false;
            }

        })) {

            console.log('Splicing an entire block')

            blocks.splice(i, 1)

        }
    }
    //console.log("!!")
    for (let block of blocks) {
        //console.log('newBlock')
        for (let i = block.length - 1; i >= 0; i--) {
            let pos = block[i];

            let tile = tiles.find(t => t.x === pos.x && t.y === pos.y)
            //console.log('CHECKING', JSON.stringify(pos), JSON.stringify(tile))
            if (!tile.inside) {
                console.log('Splicing', JSON.stringify(block[i]), 'from rampart block')
                block.splice(i, 1)
            }


        }

    }


    blocks = blocks.sort((a, b) => b.length - a.length)

    console.log('B Blocks', JSON.stringify(blocks))

    console.log('Block Count', blocks.length)

    for (let block of blocks) {

        let tester = block

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
                console.log('Setting road to', JSON.stringify(destination))
                setRoad(room, tiles, storagePos, destination, 0, 4)
            }
            updateTile(r.x, r.y, STRUCTURE_RAMPART, tiles, center, 4, false);


        }
    }

    for (let center of centers) {
        const path = getPath(center, storagePos, 1, tiles, 1)

        for (let i = 0; i < 2; i++) {
            let pos = path[i]
            updateTile(pos.x, pos.y, STRUCTURE_RAMPART, tiles, center, 4, false)
        }

    }


    /*for (let center of centers) {
        let centerDist = getPath(center, storagePos, 1, tiles, room).length;
 
        for (let tile of tiles) {
            if (tile.structure === STRUCTURE_ROAD) {
                let pos = new RoomPosition(tile.x, tile.y, room.name);
                if (pos.getRangeTo(center) <= 2) {
                    let posDist = getPath(pos, storagePos, 1, tiles, room).length;
                    if (posDist < centerDist) {
                        updateTile(pos.x, pos.y, STRUCTURE_RAMPART, tiles, center, 4, false);
                    }
                }
            }
        }
    }*/

    while (BUILDINGS.length > 0) {

        for (let center of centers) {
            if (BUILDINGS.length === 0) {
                break;
            }

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
                                    let building = BUILDINGS.shift()
                                    updateTile(x, y, building[0], tiles, false, building[1], false);
                                    updateTile(x, y, STRUCTURE_RAMPART, tiles, false, building[1], false);
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

    let containerTiles = tiles.filter(t => t.structure === STRUCTURE_CONTAINER)

    for (let t of containerTiles) {
        if (!t.inside || t.nearExit) {
            updateTile(t.x, t.y, STRUCTURE_RAMPART, tiles, false, Math.max(3, t.level), false)
        }

    }

    let linkTiles = tiles.filter(t => t.structure === STRUCTURE_LINK)

    for (let t of linkTiles) {
        if (!t.inside || t.nearExit) {
            updateTile(t.x, t.y, STRUCTURE_RAMPART, tiles, false, Math.max(6, t.level), false)
        }
    }


}


function updateInsideTiles(room, tiles, blocks, storagePos) {

    let terrain = new Room.Terrain(room.name)
    let insideTiles = [storagePos];
    let queue = [storagePos]

    while (queue.length) {

        let pos = queue.pop()

        const offsets = [
            [0, 1],
            [0, - 1],
            [1, 0],
            [- 1, 0],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],

        ];

        for (let offset of offsets) {

            let x = pos.x + offset[0]
            let y = pos.y + offset[1]

            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                continue;
            }

            if (insideTiles.some(t => t.x === x && t.y === y)) {

                continue;
            }

            let inside = true;
            let edgeRampart = false;

            for (let block of blocks) {
                if (!inside) {
                    break;
                }
                for (let ramPos of block) {
                    if (ramPos.x === x && ramPos.y === y) {
                        edgeRampart = true;
                    }
                }
            }

            if (inside) {
                let nextPos = new RoomPosition(x, y, room.name)
                insideTiles.push(nextPos)
                if (!edgeRampart) {
                    queue.push(nextPos)
                }
            }
        }
    }

    for (let it of insideTiles) {
        let tile = tiles.find(t => t.x === it.x && t.y === it.y)

        tile.inside = true;

    }

    //console.log('insideTiles for', room.name, JSON.stringify(insideTiles))

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
function setRoad(room, tiles, origin, destination, range, level) {

    let path = getPath(origin, destination, range, tiles, room)

    for (let p of path) {
        updateTile(p.x, p.y, STRUCTURE_ROAD, tiles, false, level, false);
    }

};



/**
 * 
 * @param {Room} room 
 * @param {Tile[]} tiles 
 * @param {RoomPosition} storagePos 
 * @param {Source[]} sources
 * @param {Mineral} mineral
 */
function setRoads(room, tiles, storagePos, sources, mineral) {

    let sourceContainerTiles = [];
    let mineralContainerTile = undefined;
    let spawnContainerTiles = [];
    let extensionCenterTiles = [];
    let controllerLinkTile = undefined;

    for (let t of tiles) {
        let next = false;
        if (t.structure === STRUCTURE_EXTENSION) {
            if (t.center) {
                extensionCenterTiles.push(t);
            }
        } else if (t.structure === STRUCTURE_LINK) {
            let pos = new RoomPosition(t.x, t.y, room.name)
            if (pos.getRangeTo(room.controller) === 2) {
                controllerLinkTile = t;
            }
        } else if (t.structure === STRUCTURE_CONTAINER) {

            let tPos = new RoomPosition(t.x, t.y, room.name)

            for (let s of sources) {
                if (tPos.isNearTo(s)) {
                    sourceContainerTiles.push(t)
                    next = true;
                    break;
                }
            }

            if (next) {
                continue;
            }

            if (tPos.isNearTo(mineral)) {
                mineralContainerTile = t
            } else {
                spawnContainerTiles.push(t)
            }

        }

    }

    // Sources to storage
    for (let s of sourceContainerTiles) {
        let startPos = new RoomPosition(s.x, s.y, room.name)
        setRoad(room, tiles, startPos, storagePos, 1, 4)
    }

    // Mineral to storage
    let minPos = new RoomPosition(mineralContainerTile.x, mineralContainerTile.y, room.name)
    setRoad(room, tiles, minPos, storagePos, 1, 6)

    // Spawn to sources, spawn to storage
    for (let spawnContainer of spawnContainerTiles) {
        let startPos = new RoomPosition(spawnContainer.x, spawnContainer.y, room.name);
        for (let sc of sourceContainerTiles) {
            let destPos = new RoomPosition(sc.x, sc.y, room.name);
            setRoad(room, tiles, startPos, destPos, 1, 3);
        }
        setRoad(room, tiles, startPos, storagePos, 1, 3);
    }

    // Extensions to storage
    for (let e of extensionCenterTiles) {
        let startPos = new RoomPosition(e.x, e.y, room.name);
        setRoad(room, tiles, startPos, storagePos, 1, e.level)
    }

    // Controller to storage
    let clPos = new RoomPosition(controllerLinkTile.x, controllerLinkTile.y, room.name)
    setRoad(room, tiles, clPos, storagePos, 1, 3)

}

/**
 * 
 * @param {RoomPosition} origin 
 * @param {RoomPosition} destination 
 * @param {number} range 
 * @param {Tile[]} tiles
 * @returns {PathFinderPath}
 */
function getPath(origin, destination, range, tiles, maxRooms = 1) {
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
    if (mineral) {
        for (let x = -1 + mineral.pos.x; x <= 1 + mineral.pos.x; x++) {
            for (let y = -1 + mineral.pos.y; y <= 1 + mineral.pos.y; y++) {
                costs.set(x, y, 10);
            }
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
            // console.log(queue.length, '200')
            return undefined;
        }


        const center = queue.shift();


        const x = center.x;
        const y = center.y;




        if (x < 3 || x > 47 || y < 3 || y > 47 || (!ignoreWalls && room.getTerrain().get(x, y) === TERRAIN_MASK_WALL)) {

            continue;
        }

        let found = checkStampPositions(BUILDINGS, tiles, x, y)

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

function checkStampPositions(BUILDINGS, tiles, x, y) {
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
        if (tile.nearExit) {
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
    return found;
}
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
    let reqDisplayLevel = room.controller.level

    if (plans === undefined) {
        return;
    };
    let roomPlans = plans[room.name];
    if (!roomPlans) {
        return;
    }
    for (let order of roomPlans) {
        if (room.name === 'W7N3' && order.x === 35 && order.y === 14) {
            //console.log(JSON.stringify(order))


        }


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
            //[0, 0, STRUCTURE_RAMPART, 3],
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
                updateTile(closest.x + b[0], closest.y + b[1], b[2], tiles, isCenter, b[3], false)
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
            updateTile(closest.x + b[0], closest.y + b[1], b[2], tiles, isCenter, 6, false)
        });

        updateTile(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR, tiles, false, 6, false);

    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} hubCenter
     */
    controller: function (room, tiles, hubCenter) {
        // console.log('Entering setStamp.controller')

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
                    updateTile(pos.x + b[0], pos.y + b[1], b[2], tiles, isCenter, b[3], false)
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
                        updateTile(pos.x + b[0], pos.y + b[1], b[2], tiles, isCenter, b[3], false)
                    });

                    break;
                }
            }
        }

        // console.log('Placing controller Ramparts')
        const controller = room.controller
        // console.log(JSON.stringify(controller.pos))
        let terrain = room.getTerrain(room.name)
        //  console.log(JSON.stringify(terrain))

        for (let x = controller.pos.x - 1; x <= controller.pos.x + 1; x++) {
            let y = -1 + controller.pos.y
            // console.log(x, y, terrain.get(x, y))

            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                //console.log('placing rampart at', x, y)
                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4, false)
            }
            y = 1 + controller.pos.y
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                //console.log('placing rampart at', x, y)
                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4, false)
            }
        }

        for (let y = controller.pos.y - 1; y <= controller.pos.y + 1; y++) {
            let x = -1 + controller.pos.x

            //console.log(x, y, terrain.get(x, y))
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                //console.log('placing rampart at', x, y)

                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4, false)
            }
            x = 1 + controller.pos.x
            //console.log(x, y, terrain.get(x, y))
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                //console.log('placing rampart at', x, y)
                updateTile(x, y, STRUCTURE_RAMPART, tiles, false, 4, false)
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
        const range2 = [
            [2, 2],
            [2, -2],
            [-2, 2],
            [-2, -2],
        ];
        const range3 = [
            [1, 3],
            [1, -3],
            [-1, 3],
            [-1, -3],
            [3, 1],
            [3, -1],
            [-3, 1],
            [-3, -1],
        ]


        let centerPositions = [];
        // Iterate through the rounds to set build level for each stamp.
        for (let i = 0; i < 5; i++) {
            let center = undefined;
            let found = false;
            if (centerPositions.length) {
                for (let cp of centerPositions) {
                    if (found) {
                        break;
                    }

                    // Check centers at range 2:
                    let checkPositions = [];
                    for (let offset of range2) {
                        let pos = new RoomPosition(cp.x + offset[0], cp.y + offset[1], room.name)
                        checkPositions.push(pos)
                    }

                    checkPositions = checkPositions.sort((a, b) => a.getRangeTo(storagePos) - b.getRangeTo(storagePos))


                    for (let pos of checkPositions) {
                        found = checkStampPositions(BUILDINGS, tiles, pos.x, pos.y)
                        if (found) {
                            center = new RoomPosition(pos.x, pos.y, room.name)
                            break;
                        }
                    }
                    if (found) {
                        break;
                    }
                    checkPositions = [];
                    for (let offset of range3) {
                        let pos = new RoomPosition(cp.x + offset[0], cp.y + offset[1], room.name)
                        checkPositions.push(pos)
                    }

                    checkPositions = checkPositions.sort((a, b) => a.getRangeTo(storagePos) - b.getRangeTo(storagePos))


                    for (let pos of checkPositions) {
                        found = checkStampPositions(BUILDINGS, tiles, pos.x, pos.y)
                        if (found) {
                            center = new RoomPosition(pos.x, pos.y, room.name)
                            break;
                        }
                    }




                }
            }
            if (!found) {
                center = getStampStart(BUILDINGS, start, tiles, room, true)
            }

            centerPositions.push(center)
            //console.log('CENTER', center)

            let x = 0
            let y = 0


            centerPositions.forEach(e => {
                x += e.x;
                y += e.y;
            })

            x = Math.round(x / (centerPositions.length))
            y = Math.round(y / (centerPositions.length))

            //console.log('starting at', x, y)
            start = new RoomPosition(x, y, room.name)



            BUILDINGS.forEach(b => {
                let isCenter = (b[0] == 0 && b[1] == 0)
                updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, RCL[i], true)
            });


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
            [1, -2, STRUCTURE_ROAD, 3],
            [-2, -1, STRUCTURE_ROAD, 4],
            [-1, -1, STRUCTURE_TERMINAL, 6],
            [-1, -1, STRUCTURE_RAMPART, 6],
            [0, -1, STRUCTURE_LINK, 5],
            [1, -1, STRUCTURE_STORAGE, 4],
            [1, -1, STRUCTURE_RAMPART, 4],
            [2, -1, STRUCTURE_ROAD, 3],
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

        let storagePos = undefined;
        const center = getStampStart(BUILDINGS, hubCenter, tiles, room, true)

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)

            if (b[2] === STRUCTURE_STORAGE) {

                storagePos = new RoomPosition(center.x + b[0], center.y + b[1], room.name)
            }

            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3], true)
        });



        return storagePos

    },

    /**
     * 
     * @param {Room} room 
     * @param {Tile[]} tiles 
     * @param {RoomPosition} storagePos
     */
    lab: function (room, tiles, storagePos) {

        const BUILDINGS = [
            [0, -2, STRUCTURE_LAB, 8],
            [1, -2, STRUCTURE_LAB, 8],
            [2, -2, 'BUFFER', 9],
            [-1, -1, STRUCTURE_LAB, 6],
            [0, -1, STRUCTURE_LAB, 7],
            [1, -1, STRUCTURE_ROAD, 6],
            [2, -1, STRUCTURE_LAB, 7],
            [-1, 0, STRUCTURE_LAB, 7],
            [0, 0, STRUCTURE_ROAD, 6],
            [1, 0, STRUCTURE_LAB, 6],
            [2, 0, STRUCTURE_LAB, 8],
            [-1, 1, 'BUFFER', 9],
            [0, 1, STRUCTURE_LAB, 6],
            [1, 1, STRUCTURE_LAB, 8],
        ];

        let startPos = new RoomPosition(storagePos.x + 2, storagePos.y - 2, room.name)
        if (room.getTerrain().get(startPos.x, startPos.y) === 'wall') {
            startPos = storagePos
        }

        let center = getStampStart(BUILDINGS, startPos, tiles, room)
        if (!center) {
            center = getStampStart(BUILDINGS, startPos, tiles, room, true)
        }
        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3], true)
        });


        setRoad(room, tiles, center, storagePos, 1, 6);

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
            [-2, -3, STRUCTURE_ROAD, 3],
            [-1, -3, STRUCTURE_ROAD, 3],
            [0, -3, STRUCTURE_ROAD, 3],
            [1, -3, STRUCTURE_ROAD, 3],
            [2, -3, STRUCTURE_ROAD, 3],

            [-3, -2, STRUCTURE_ROAD, 3],
            [-2, -2, STRUCTURE_EXTENSION, 2],
            [-1, -2, STRUCTURE_EXTENSION, 2],
            [0, -2, STRUCTURE_SPAWN, 1],
            [0, -2, STRUCTURE_RAMPART, 3],
            [1, -2, STRUCTURE_EXTENSION, 2],
            [2, -2, STRUCTURE_EXTENSION, 2],
            [3, -2, STRUCTURE_ROAD, 3],

            [-3, -1, STRUCTURE_ROAD, 3],
            [-2, -1, STRUCTURE_EXTENSION, 2],
            [-1, -1, undefined, 9],
            [0, -1, STRUCTURE_EXTENSION, 3],
            [1, -1, undefined, 9],
            [2, -1, STRUCTURE_EXTENSION, 3],
            [3, -1, STRUCTURE_ROAD, 3],

            [-3, 0, STRUCTURE_ROAD, 3],
            [-2, 0, STRUCTURE_CONTAINER, 2],
            [-1, 0, STRUCTURE_EXTENSION, 3],
            [0, 0, STRUCTURE_LINK, 5],
            [1, 0, STRUCTURE_EXTENSION, 3],
            [2, 0, STRUCTURE_CONTAINER, 2],
            [3, 0, STRUCTURE_ROAD, 3],

            [-3, 1, STRUCTURE_ROAD, 3],
            [-2, 1, STRUCTURE_SPAWN, 7],
            [-2, 1, STRUCTURE_RAMPART, 7],
            [-1, 1, undefined, 9],
            [0, 1, STRUCTURE_EXTENSION, 3],
            [1, 1, undefined, 9],
            [2, 1, STRUCTURE_SPAWN, 8],
            [2, 1, STRUCTURE_RAMPART, 8],
            [3, 1, STRUCTURE_ROAD, 3],

            [-3, 2, STRUCTURE_ROAD, 3],
            [-2, 2, STRUCTURE_EXTENSION, 4],
            [-1, 2, STRUCTURE_EXTENSION, 4],
            [0, 2, STRUCTURE_EXTENSION, 4],
            [1, 2, STRUCTURE_EXTENSION, 4],
            [2, 2, STRUCTURE_EXTENSION, 4],
            [3, 2, STRUCTURE_ROAD, 3],

            [-2, 3, STRUCTURE_ROAD, 3],
            [-1, 3, STRUCTURE_ROAD, 3],
            [0, 3, STRUCTURE_ROAD, 3],
            [1, 3, STRUCTURE_ROAD, 3],
            [2, 3, STRUCTURE_ROAD, 3],
        ]

        const center = getStampStart(BUILDINGS, spawnCenter, tiles, room, true)
        let spawns = [];

        BUILDINGS.forEach(b => {
            let isCenter = (b[0] == 0 && b[1] == 0)
            updateTile(center.x + b[0], center.y + b[1], b[2], tiles, isCenter, b[3], true)
            if (b[2] === STRUCTURE_SPAWN) {
                spawns.push(new RoomPosition(center.x + b[0], center.y + b[1], room.name))
            }

        })




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

    //console.log('Placing construction sites for',homeRoom.name)
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
        //console.log('Placing construction sites for',homeRoom.name)
        for (let order of roomPlans) {
            updatePlacedStatus(order, room)

            if (order.level <= RCL && !order.placed) {
                let ret = room.createConstructionSite(order.x, order.y, order.structure)
                if (ret === -8) {
                    return;
                }

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
 * @param {bool} protect True if structure should be inside ramparts
 */
function updateTile(x, y, structure, tiles, center, level, protect) {



    let tile = tiles.find(t => t.x === x && t.y === y);


    if (tile && tile.available === false && (structure === STRUCTURE_RAMPART || structure === STRUCTURE_ROAD)) {

        tileSameStructure = tiles.find(t => t.x === x && t.y === y && t.structure === structure)

        if (!tileSameStructure) {



            let newTile = new Tile(x, y, tile.roomName, false, tile.nearExit);
            newTile.structure = structure;
            newTile.available = false;
            newTile.center = false;
            newTile.level = level;
            newTile.protect = protect

            tiles.push(newTile);
            return;
        } else {

            tile.structure = structure;
            tile.available = false;
            tile.center = center;
            tile.level = Math.min(level, tile.level);
            tile.protect = protect
        }

    }
    if (tile) {

        tile.structure = structure;
        tile.available = false;
        tile.center = center;
        tile.level = Math.min(level, tile.level);
        tile.protect = protect

    } else {


        let newTile = new Tile(x, y, tiles[0].roomName, false, false);
        newTile.structure = structure;
        newTile.available = false;
        newTile.center = false;
        newTile.level = level;
        newTile.protect = protect


        tiles.push(newTile);
    };
};

module.exports = roomPlanner;