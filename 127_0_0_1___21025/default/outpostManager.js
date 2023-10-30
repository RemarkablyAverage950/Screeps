let MEMORY = require('memory')
let { getBody, SpawnOrder } = require('manageSpawns');
let { getPath } = require('pathfinder')

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
    if (!homeRoom) {
        return;
    }
    let outposts = homeRoom.memory.outposts;

    if (!outposts) {
        return;
    }
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
                occupied: false,


            }
            MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
        }

        let outpostRoom = Game.rooms[outpostName];
        if (!outpostRoom) {
            continue;
        }

        let occupied = false
        let hostileStructures = outpostRoom.find(FIND_HOSTILE_STRUCTURES)
        if (hostileStructures.length) {
            occupied = true;
        }
        let hostiles = outpostRoom.find(FIND_HOSTILE_CREEPS)
        let hostileOccupied = false;
        if (hostiles.length) {
            if (!occupied) {
                for (let hCreep of hostiles) {
                    if (occupied) break;
                    if (hCreep.hits === 0) {
                        continue;
                    }

                    let body = hCreep.body;

                    for (let part of body) {
                        if (part.type === WORK || part.type === CARRY || part.type === CLAIM) {
                            occupied = true;

                        } else if (part.type === ATTACK || part.type === RANGED_ATTACK) {
                            hostileOccupied = true;
                        }
                    }

                }
            }
        }


        if (occupied) {

            // defend room.
            const defenderCountRequired = 1
            let defenderCount = 0;
            for (let c of creeps) {
                if (c.memory.role === 'defender' && c.memory.assignedRoom === outpostName) {
                    defenderCount++;
                }
            }
            MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                if (spawnOrder.options.memory.role === 'defender' && spawnOrder.options.memory.assignedRoom === outpostName) {
                    defenderCount++;
                }

            })

            let body = [];
            while (defenderCount < defenderCountRequired) {
                if (body.length === 0) {
                    body = getBody.defender(homeRoom.energyCapacityAvailable, hostiles)
                }
                options = {
                    memory: {
                        role: 'defender',
                        home: homeRoom.name,
                        assignedRoom: outpostName,
                    },
                };
                console.log(homeRoom.name, 'spawning defender to defend', outpostName)
                MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('defender', 4, body, options));
                defenderCount++;
            }






        }

        heap.occupied = occupied
        heap.hostileOccupied = hostileOccupied
        MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
    }
    if (Game.time % 10 === 0) {

        // get haulersCount required;
        let energyCapacityAvailable = homeRoom.energyCapacityAvailable;
        let maxCapacity = Math.min(Math.floor(energyCapacityAvailable / 150) * 100, 1600);
        let haulerCapacityReq = 0
        for (let outpostName of outposts) {


            if (MEMORY.rooms[homeRoom.name].outposts[outpostName] && MEMORY.rooms[homeRoom.name].outposts[outpostName].haulerCapacityReq) {

                haulerCapacityReq += MEMORY.rooms[homeRoom.name].outposts[outpostName].haulerCapacityReq
            }
        }

        let haulerCountRequired = Math.min(Math.ceil(haulerCapacityReq / maxCapacity), 10);
        let capacityRequiredPerHauler = Math.min(maxCapacity, Math.ceil(haulerCapacityReq / haulerCountRequired))
        let spawnTime = Math.ceil(1.5 * capacityRequiredPerHauler / 50) * 3

        // Find out how many haulers we have;
        let haulerCount = 0;
        for (let c of creeps) {
            if (c.memory.role === 'remoteHauler' && c.memory.home === homeRoom.name && (c.spawning || c.ticksToLive > spawnTime)) {
                haulerCount++;
            }
        }
        MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

            if (spawnOrder.options.memory.role === 'remoteHauler') {
                haulerCount++;
            }

        })

        let body = [];
        while (haulerCount < haulerCountRequired) {
            if (body.length === 0) {

                body = getBody.remoteHauler(homeRoom.energyCapacityAvailable, capacityRequiredPerHauler)
            }
            options = {
                memory: {
                    role: 'remoteHauler',
                    home: homeRoom.name,

                },
            };
            MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('remoteHauler', 5, body, options));
            haulerCount++;
        }


        for (let outpostName of outposts) {

            // Check if we are in the room.
            let outpostRoom = Game.rooms[outpostName];
            if (!outpostRoom) {
                continue;
            }

            let heap = MEMORY.rooms[homeRoom.name].outposts[outpostName];
            if (!heap || heap.hostileOccupied) {
                continue;
            }


            if (outpostRoom.controller.reservation && outpostRoom.controller.reservation.username !== MEMORY.username) {
                // Enemy has reserved controller
                // Spawn a reserver to take down enemy controller
                // Spawn a defender to defend the reserver
                const defenderCountRequired = 1
                let defenderCount = 0;
                for (let c of creeps) {
                    if (c.memory.role === 'defender' && c.memory.assignedRoom === outpostName) {
                        defenderCount++;
                    }
                }
                MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                    if (spawnOrder.options.memory.role === 'defender' && spawnOrder.options.memory.assignedRoom === outpostName) {
                        defenderCount++;
                    }

                })

                let body = [];
                while (defenderCount < defenderCountRequired) {
                    if (body.length === 0) {
                        body = getBody.defender(homeRoom.energyCapacityAvailable, undefined)
                    }
                    options = {
                        memory: {
                            role: 'defender',
                            home: homeRoom.name,
                            assignedRoom: outpostName,
                        },
                    };
                    MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('defender', 4, body, options));
                    defenderCount++;
                }






                MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;


                let targetReserverCount = 1;
                let reserverCount = 0;
                for (let c of creeps) {
                    if (c.memory.role === 'reserver' && c.memory.assignedRoom === outpostName) {
                        reserverCount++;
                    }
                }

                MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                    if (spawnOrder.options.memory.role === 'reserver' && spawnOrder.options.memory.assignedRoom === outpostName) {
                        reserverCount++;
                    }

                })


                if (reserverCount < targetReserverCount && homeRoom.energyCapacityAvailable >= 650) {

                    body = getBody.reserver(homeRoom.energyCapacityAvailable)

                    options = {
                        memory: {
                            role: 'reserver',
                            home: homeRoom.name,
                            assignedRoom: outpostName,
                        },
                    };
                    MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('reserver', 6, body, options));
                    reserverCount++;
                }


            }

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

                    
                    let length;
                    if (homeRoom.storage) {
                        length = getPath(undefined, homeRoom.storage.pos, s.pos, 1, 16).length

                    } else {
                        let spawn = homeRoom.find(FIND_MY_SPAWNS)[0]
                        if (spawn) {
                            length = getPath(undefined, spawn.pos, s.pos, 1, 16).length
                        }
                    }
                  
                    if (length && length > 250) {
                        continue;
                    }



                    let containerPos = undefined;
                    let path = undefined;
                    let distance = undefined;
                    let assignedMiner = undefined;

                    for (let c of containers) {
                        if (c.pos.isNearTo(s)) {
                            containerPos = c.pos;
                        }
                    }


                    distance = getRemoteSourceDistance(homeRoom, s);

                    for (let c of creeps) {
                        if (c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id) {
                            assignedMiner = c.id
                        }
                    }

                    heap.sources[s.id] = new SO(s.id, s.pos, containerPos, distance, assignedMiner);


                }
            }

            for (let s of Object.values(heap.sources)) {

                if (!s.distance) {
                    s.distance = getRemoteSourceDistance(homeRoom, s)
                }
                let creepNeeded = false;
                if (s.distance) {
                    if (!creeps.some(c => c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id && (c.spawning || c.ticksToLive > 30 + s.distance))) {
                        creepNeeded = true;
                    }
                } else {
                    if (!creeps.some(c => c.memory.role === 'remoteMiner' && c.memory.assignedSource === s.id && (c.spawning || c.ticksToLive > 30))) {
                        creepNeeded = true;
                    }
                }




                MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                    if (spawnOrder.options.memory.assignedSource === s.id) {

                        creepNeeded = false;
                        return;
                    }

                })

                /*if (Game.rooms[heap.name]) {
                    let source = Game.getObjectById(s.id)
                    let structures = Game.rooms[heap.name].find(FIND_STRUCTURES)
                    for (let struct of structures) {
                        if (struct.structureType === STRUCTURE_CONTAINER && struct.pos.isNearTo(source)) {
                            if (struct.forecast(RESOURCE_ENERGY) === 2000) {
                                creepNeeded = false;

                            }
                            break;
                        }
                    }


                }*/

                if (creepNeeded) {
                    heap.sources[s.id].assignedMiner = undefined;

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
                    MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('remoteMiner', 4, body, options));
                }

            }

            const sites = outpostRoom.find(FIND_CONSTRUCTION_SITES)
            if (sites.length > 0) {
                heap.constructionComplete = false;
                heap.constructionPositions = sites.map(s => s.pos)
            } else {
                heap.constructionComplete = true;

            }

            MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
            if (!heap.haulerCapacityReq) {


                let totalDistance = 0;
                let energyGeneratedPerLife;
                if (outpostRoom.controller.reservation) {
                    energyGeneratedPerLife = (15000) - 750 * Object.keys(heap.sources).length
                } else {
                    energyGeneratedPerLife = energyGeneratedPerLife = (7500) - 750 * Object.keys(heap.sources).length
                }

                for (let s of Object.values(heap.sources)) {

                    totalDistance += (s.distance * 2)

                }

                //totalDistance /= Object.keys(heap.sources).length

                let timePerTrips = (totalDistance);
                let tripsPerLife = 1500 / timePerTrips

                heap.haulerCapacityReq = Math.ceil(energyGeneratedPerLife / tripsPerLife);

            }




            let targetReserverCount = 0;
            if (!outpostRoom.controller.reservation) {
                targetReserverCount = 1;
            } else if (outpostRoom.controller.reservation.ticksToEnd < 4000) {
                targetReserverCount = 1
            }

            let reserverCount = 0;
            for (let c of creeps) {
                if (c.memory.role === 'reserver' && c.memory.assignedRoom === outpostName) {
                    reserverCount++;
                }
            }

            MEMORY.rooms[homeRoom.name].spawnQueue.forEach(spawnOrder => {

                if (spawnOrder.options.memory.role === 'reserver' && spawnOrder.options.memory.assignedRoom === outpostName) {
                    reserverCount++;
                }

            })


            if (reserverCount < targetReserverCount && homeRoom.energyCapacityAvailable >= 650) {

                body = getBody.reserver(homeRoom.energyCapacityAvailable)

                options = {
                    memory: {
                        role: 'reserver',
                        home: homeRoom.name,
                        assignedRoom: outpostName,
                    },
                };
                MEMORY.rooms[homeRoom.name].spawnQueue.push(new SpawnOrder('reserver', 6, body, options));
                reserverCount++;
            }

            MEMORY.rooms[homeRoom.name].outposts[outpostName] = heap;
        }
    }
}


/**
 * 
 * @param {Room} homeRoom 
 * @param {Source} s 
 * @returns {Number}
 */
function getRemoteSourceDistance(homeRoom, s) {
    if (!s || !s.pos) {
        return;
    }

    if (!homeRoom) {
        return;
    }
    if (homeRoom.find(FIND_MY_SPAWNS).length === 0) {

        return;
    }
    let startPos = homeRoom.find(FIND_MY_SPAWNS)[0].pos

    if (homeRoom.storage) {
        startPos = homeRoom.storage.pos
    }
    path = PathFinder.search(startPos, { pos: s.pos, range: 1 }, {
        plainCost: 2,
        maxOps: 16000,
        ignoreCreeps: true,
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


    return path.length;

}

module.exports = outpostManager;