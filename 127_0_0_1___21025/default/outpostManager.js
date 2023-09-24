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
 * @param {Creep[]} creeps
 */
function outpostManager(homeRoom, creeps) {

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
                haulerCapacityReq: undefined,


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

                    }


                    for (let c of creeps) {
                        if (c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id) {
                            assignedMiner = c.id
                        }
                    }

                    heap.sources[s.id] = new SO(s.id, s.pos, containerPos, distance, assignedMiner);
                }

            }

            for (let s of Object.values(heap.sources)) {


                if (!creeps.some(c => c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id)) {

                    heap.sources[s.id].assignedMiner = undefined;

                    let creepNeeded = true;

                    MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                        if (spawnOrder.options.memory.assignedSource === s.id) {

                            creepNeeded = false;
                            return;
                        }

                    })
                    if (creepNeeded) {

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

            if (!heap.haulerCapacityReq) {


                let totalDistance = 0;
                let energyGeneratedPerLife;
                if (outpostRoom.controller.reservation) {
                    energyGeneratedPerLife = (15000 - 750) * Object.keys(heap.sources).length
                } else {
                    energyGeneratedPerLife = energyGeneratedPerLife = (7500 - 750) * Object.keys(heap.sources).length
                }

                for (let s of Object.values(heap.sources)) {

                    totalDistance += s.distance

                }

                let timePerTrips = ((totalDistance * 2) + 4) * 1.1;
                let tripsPerLife = Math.floor(1500 / timePerTrips)

                heap.haulerCapacityReq = Math.ceil(energyGeneratedPerLife / tripsPerLife);

            }

            // get haulersCount required;

            let energyCapacityAvailable = homeRoom.energyCapacityAvailable;

            let maxCapacity = Math.floor(energyCapacityAvailable/150) * 100;

            let haulerCountRequired = Math.ceil(heap.haulerCapacityReq / maxCapacity);
            let capacityRequiredPerHauler = Math.ceil(heap.haulerCapacityReq / haulerCountRequired)



            // Find out how many haulers we have;
            let haulerCount = 0;
            for (let c of creeps) {
                if (c.memory.role === 'remoteHauler' && c.memory.assignedRoom === outpostName) {
                    haulerCount++;
                }
            }
            MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                if (spawnOrder.options.memory.assignedRoom === outpostName) {
                    haulerCount++;
                }

            })

            body = [];
            while (haulerCount < haulerCountRequired) {
                if (body.length === 0) {
                    body = getBody.remoteHauler(homeRoom.energyCapacityAvailable, capacityRequiredPerHauler)
                }
                options = {
                    memory: {
                        role: 'remoteHauler',
                        home: homeRoom.name,
                        assignedRoom: outpostName,
                    },
                };
                MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('remoteHauler', 5, body, options));
                haulerCount++;
            }



            MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
        }
    }
}

module.exports = outpostManager;