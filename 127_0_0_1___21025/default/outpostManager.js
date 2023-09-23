let MEMORY = require('memory')
let { getBody, SpawnOrder } = require('manageSpawns');

class SO {
    constructor(id, sourcePos, containerPos, distance, assignedMiner) {
        this.id = id;
        this.sourcePos = sourcePos;
        this.containerPos = containerPos;
        this.distance = distance;
        this.assignedMiner = assignedMiner;
    }
}

/**
 * 
 * @param {Room} homeRoom 
 */
function outpostManager(homeRoom) {

    let outposts = homeRoom.memory.outposts;


    for (let outpostName of outposts) {

        let heap = MEMORY.rooms[homeRoom.name].outposts[outpostName];

        if (!heap) {

            heap = {
                sources: undefined,
                minersReq: 1,
                constructionComplete: true,
                constructionPositions: [],
                name: outpostName,
                lastMaintained: 0,
            }
            MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
        }
    }

    if (Game.time % 10 === 0) {

        for (let outpostName of outposts) {

            // Check if we are in the room.
            let outpostRoom = Game.rooms[outpostName];
            if (!outpostRoom) {
                continue;
            }

            let heap = MEMORY.rooms[homeRoom.name].outposts[outpostName];


            /* Update source data
                for each source create a source object.

                Source Object: 
                    id, 
                    path distance from storage to source,
                    container location,
                    assigned miner.
                


            */
            if (heap.sources === undefined) {
                heap.sources = {};
                const sources = outpostRoom.find(FIND_SOURCES);
                const containers = outpostRoom.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_CONTAINER);

                for (let s of sources) {

                    let containerPos = undefined;
                    let path = undefined;
                    let distance = undefined;
                    let assignedMiner = undefined;

                    for (let c of containers) {
                        if (c.pos.isNearTo(s)) {
                            containerPos = c.pos;
                        }
                    }

                    if (homeRoom.storage) {
                        path = PathFinder.search(homeRoom.storage.pos, { pos: s.pos, range: 1 }, {
                            plainCost: 2,
                            roomCallback: function (roomName) {

                                let room = Game.rooms[roomName];
                                // In this example `room` will always exist, but since 
                                // PathFinder supports searches which span multiple rooms 
                                // you should be careful!
                                if (!room) return;
                                let costs = new PathFinder.CostMatrix;

                                room.find(FIND_STRUCTURES).forEach(function (struct) {
                                    if (struct.structureType === STRUCTURE_ROAD) {
                                        // Favor roads over plain tiles
                                        costs.set(struct.pos.x, struct.pos.y, 1);
                                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                        (struct.structureType !== STRUCTURE_RAMPART ||
                                            !struct.my)) {
                                        // Can't walk through non-walkable buildings
                                        costs.set(struct.pos.x, struct.pos.y, 0xff);
                                    }
                                });

                                return costs;
                            },
                        }).path;
                        distance = path.length;

                    } else {
                        // Estimate, should not really be used but handles case storage is blown up.
                        distance = 25 * (1 + MEMORY.rooms[homeRoom.name].monitoredRooms[outpostName].distance);
                    }

                    let creeps = Object.values(Game.creeps);
                    for (let c of creeps) {
                        if (c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id) {
                            assignedMiner = c.id
                        }
                    }

                    heap.sources[s.id] = new SO(s.id, s.pos, containerPos, distance, assignedMiner);
                }
                console.log('heap.sources updated', JSON.stringify(heap.sources))
            }

            for (let s of Object.values(heap.sources)) {


                if (!Object.values(Game.creeps).some(c => c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id)) {

                    heap.sources[s.id].assignedMiner = undefined;

                    let creepNeeded = true;

                    MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                        if (spawnOrder.options.memory.assignedSource === s.id) {
                            console.log('spawn order found for miner assigned to', s.id)
                            creepNeeded = false;
                            return;
                        }

                    })
                    if (creepNeeded) {
                        console.log('miner needed for', s.id)
                        // add miner to spawnQueue;
                        let body = getBody.remoteMiner(homeRoom.energyCapacityAvailable)
                        options = {
                            memory: {
                                role: 'remoteMiner',
                                home: homeRoom.name,
                                assignedRoom: outpostName,
                                assignedSource: s.id,
                            },
                        };
                        MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('remoteMiner', 5, body, options));
                    }
                }
            }




            const sites = outpostRoom.find(FIND_MY_CONSTRUCTION_SITES)
            if (sites.length > 0) {
                heap.constructionComplete = false;
                heap.constructionPositions = sites.map(s => s.pos)
            } else {
                heap.constructionComplete = true;

            }

            MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
        }
    }
}

module.exports = outpostManager;