let MEMORY = require('memory');


class SpawnOrder {
    /**
     * @constructor
     * @param {string} role 
     * @param {number} priority 
     * @param {BodyPartConstant[]} body 
     * @param {object} options 
     */
    constructor(role, priority, body, options) {
        this.role = role;
        this.priority = priority;
        this.body = body;
        this.options = options;
    }
}

const SPAWN_TIMER_SET_VALUE = 10;
const CONSERVE_ENERGY_VALUE = 50000;


/**
 * Sets target unit counts and spawns creeps.
 * @param {Room} room Room object.
 * @param {Creep[]} creeps Creeps belonging to the room.
 */
function manageSpawns(room, creeps) {

    // Check if spawns are available
    const availableSpawns = room.find(FIND_MY_SPAWNS).filter(s => s.spawning === null);

    if (availableSpawns.length === 0) return;

    let spawnQueue = MEMORY.rooms[room.name].spawnQueue;

    if (Game.time % 10 === 0) {

        spawnQueue.push(...getSpawnQueue(room, creeps, false, spawnQueue));

    } else {


        spawnQueue.push(...getSpawnQueue(room, creeps, true, spawnQueue));

    }

    MEMORY.rooms[room.name].spawnQueue = spawnQueue;

    for (let spawn of availableSpawns) {

        let ret = undefined;

        if (spawnQueue.length === 0) {
            return;
        }

        for (let priority = 1; priority <= 6; priority++) {

            if (ret == 0) {
                // Successful
                break;
            }

            for (let i = 0; i < spawnQueue.length; i++) {

                if (spawnQueue[i].priority === priority) {

                    // Attempt to spawn the order

                    const name = getCreepName(room.name, spawnQueue[i].role)

                    ret = spawn.spawnCreep(spawnQueue[i].body, name, spawnQueue[i].options)

                    if (ret == 0) {
                        // Successful
                        spawnQueue.splice(i, 1)
                        MEMORY.rooms[room.name].spawnQueue = spawnQueue;
                        break;

                    } else if (ret != 0) {

                        return;
                    }

                };

            };
        };

    };



};

/**
 * Generates spawn orders.
 * Essential creeps are workers,miners,fillers.
 * @param {Room} room 
 * @param {Creep[]} creeps 
 * @param {boolean} onlyEssential True if we are only checking essential creeps.
 * @param {SpawnOrder[]} existingSpawnQueue
 * @returns {SpawnOrder[]}
 */
function getSpawnQueue(room, creeps, onlyEssential, existingSpawnQueue) {

    const energyBudget = room.energyCapacityAvailable;
    const structures = room.find(FIND_STRUCTURES);
    let storedEnergy = 0;

    for (const s of structures) {
        if (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK) {
            storedEnergy += s.store[RESOURCE_ENERGY];
        };
    };

    let spawnQueue = [];

    let creepsCount = _.countBy(creeps, c => c.memory.role);
    let workerCount = creepsCount['worker'] || 0;
    let minerCount = creepsCount['miner'] || 0;
    let fillerCount = creepsCount['filler'] || 0;

    const targetWorkerCount = getTargetCount.worker(minerCount, fillerCount, room, storedEnergy);
    const targetMinerCount = getTargetCount.miner(room);
    const targetFillerCount = getTargetCount.filler(creeps);

    for (let order of existingSpawnQueue) {

        const role = order.role;

        if (role === 'worker') {

            workerCount++;

        } else if (role === 'miner') {

            minerCount++;

        } else if (role === 'filler') {

            fillerCount++;

        };

    };

    let body = [];
    let options = undefined;
    while (workerCount < targetWorkerCount) {

        if (workerCount == 0) {
            body = getBody.worker(room.energyAvailable)

            if (body.length === 0) return spawnQueue;

            options = {
                memory: {
                    role: 'worker',
                    home: room.name,
                },
            }

        } else if (body.length === 0) {
            body = getBody.worker(energyBudget)

            options = {
                memory: {
                    role: 'worker',
                    home: room.name,
                },
            }

        }

        spawnQueue.push(new SpawnOrder('worker', 1, body, options));
        workerCount++;

    };

    body = [];
    while (minerCount < targetMinerCount) {

        if (body.length === 0) {
            body = getBody.miner(energyBudget)
            options = {
                memory: {
                    role: 'miner',
                    home: room.name,
                },
            }

        }

        spawnQueue.push(new SpawnOrder('miner', 2, body, options));
        minerCount++;

    };

    body = [];
    while (fillerCount < targetFillerCount) {

        if (body.length === 0) {
            body = getBody.filler(energyBudget, room)
            options = {
                memory: {
                    role: 'filler',
                    home: room.name,
                },
            }

        }

        spawnQueue.push(new SpawnOrder('filler', 3, body, options));
        fillerCount++;
    };

    if (onlyEssential) return spawnQueue;

    const outpostRooms = room.memory.outposts;

    let upgraderCount = creepsCount['upgrader'] || 0;
    let builderCount = creepsCount['builder'] || 0;
    let maintainerCount = creepsCount['maintainer'] || 0;
    let wallBuilderCount = creepsCount['wallBuilder'] || 0;
    let haulerCount = creepsCount['hauler'] || 0;
    let scoutCount = creepsCount['scout'] || 0;
    let hubCount = creepsCount['hub'] || 0;
    let remoteMinerCount = creepsCount['remoteMiner'] || 0;

    const targetUpgraderCount = getTargetCount.upgrader(room);
    let targetBuilderCount = getTargetCount.builder(room);
    const targetMaintainerCount = getTargetCount.maintainer(room);
    const targetWallBuilderCount = getTargetCount.wallBuilder(room);
    const targetHaulerCount = getTargetCount.hauler(room);
    const targetScoutCount = getTargetCount.scout(room);
    const targetHubCount = getTargetCount.hub(room, storedEnergy);
    const targetRemoteMinerCount = getTargetCount.remoteMiner(room, outpostRooms);


    for (let order of existingSpawnQueue) {

        const role = order.role;

        if (role === 'upgrader') {

            upgraderCount++;

        } else if (role === 'builder') {

            builderCount++;

        } else if (role === 'maintainer') {

            maintainerCount++;

        } else if (role === 'wallBuilder') {

            wallBuilderCount++;

        } else if (role === 'hauler') {

            haulerCount++;

        } else if (role === 'scout') {

            scoutCount++;

        } else if (role === 'hub') {

            hubCount++;

        } else if (role === 'remoteMiner') {
            remoteMinerCount++;
        };

    };

    body = [];
    while (upgraderCount < targetUpgraderCount) {

        if (body.length === 0) {
            body = getBody.upgrader(energyBudget, room, storedEnergy);
            options = {
                memory: {
                    role: 'upgrader',
                    home: room.name,
                },
            };

        };

        spawnQueue.push(new SpawnOrder('upgrader', 5, body, options));
        upgraderCount++;
    };

    body = [];

    while (builderCount < targetBuilderCount) {

        if (body.length === 0) {
            let ret = getBody.builder(energyBudget, room, storedEnergy);
            body = ret[0];
            console.log('estCreepsNeeded', ret[1])
            if (ret[1] > 2) {
                targetBuilderCount = 2;
            }
            options = {
                memory: {
                    role: 'builder',
                    home: room.name,
                },
            };

        };

        spawnQueue.push(new SpawnOrder('builder', 4, body, options));
        builderCount++;
    };

    body = [];
    while (maintainerCount < targetMaintainerCount) {

        if (body.length === 0) {
            body = getBody.maintainer(energyBudget, room);
            options = {
                memory: {
                    role: 'maintainer',
                    home: room.name,
                },
            };

        };

        spawnQueue.push(new SpawnOrder('maintainer', 4, body, options));
        maintainerCount++;
    };

    body = [];
    while (wallBuilderCount < targetWallBuilderCount) {

        if (body.length === 0) {
            body = getBody.wallBuilder(energyBudget, room, storedEnergy);
            options = {
                memory: {
                    role: 'wallBuilder',
                    home: room.name,
                },
            };

        };

        spawnQueue.push(new SpawnOrder('wallBuilder', 4, body, options));
        wallBuilderCount++;
    };

    body = [];
    while (haulerCount < targetHaulerCount) {

        if (body.length === 0) {
            body = getBody.hauler(energyBudget, room);
            options = {
                memory: {
                    role: 'hauler',
                    home: room.name,
                },
            };

        };

        spawnQueue.push(new SpawnOrder('hauler', 4, body, options));
        haulerCount++;
    };

    body = [];
    while (scoutCount < targetScoutCount) {
        body = [MOVE]
        options = {
            memory: {
                role: 'scout',
                home: room.name,
            },
        };
        spawnQueue.push(new SpawnOrder('scout', 6, body, options));
        scoutCount++;
    }

    body = [];
    while (hubCount < targetHubCount) {
        body = getBody.hub(energyBudget, room)
        options = {
            memory: {
                role: 'hub',
                home: room.name,
            },
        };
        spawnQueue.push(new SpawnOrder('hub', 4, body, options));
        hubCount++;
    }

    body = [];
    while (remoteMinerCount < targetRemoteMinerCount) {
        body = getBody.miner(energyBudget)
        options = {
            memory: {
                role: 'remoteMiner',
                home: room.name,
                assignedRoom: undefined,
            },
        };
        spawnQueue.push(new SpawnOrder('remoteMiner', 4, body, options));
        remoteMinerCount++;
    }



    return spawnQueue;

};

/*  BODYPART_COSTS:
        move: 50,
        work: 100,
        attack: 80,
        carry: 50,
        heal: 250,
        ranged_attack: 150,
        tough: 10,
        claim: 600,
*/
const getBody = {

    /**
     * 
     * @param {number} budget
     * @param {Room} room 
     * @param {number} storedEnergy
     * @returns {BodyPartConstant[]}
     */
    builder: function (budget, room, storedEnergy) {
        /*
            Most effecient builder will complete all existing construction sites using the least amount of spawn cost.
            More than one builder can be used to complete construction.
        */



        const sources = room.find(FIND_SOURCES);
        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);

        let bestBody = [];
        let minCost = Infinity;
        let estCreepsNeeded = undefined;

        for (let workParts = 1; workParts < 40; workParts++) {
            for (let carryParts = 1; carryParts < 40; carryParts++) {
                for (let moveParts = 1; moveParts < 40; moveParts++) {

                    if (workParts + carryParts + moveParts > 50) {
                        continue;
                    };

                    const cost = (workParts * 100) + (carryParts * 50) + (moveParts * 50);

                    if (cost > budget) {
                        continue;
                    }

                    const workPerTrip = carryParts * 50;
                    const workTime = workPerTrip / (workParts * 5);

                    const moveTimeEmpty = Math.ceil(workParts / (2 * moveParts));
                    const moveTimeFull = Math.ceil((workParts + carryParts) / (2 * moveParts));

                    let totalTime = 0;

                    for (let site of sites) {

                        let workNeeded = site.progressTotal - site.progress;
                        let distance = 0;
                        if (room.controller) {

                            distance = room.controller.pos.getRangeTo(site);

                        } else {
                            for (let source of sources) {

                                distance += source.pos.getRangeTo(site);

                            }
                            distance /= sources.length;
                        }


                        const travelTimePerTrip = ((distance * moveTimeEmpty) + (distance * moveTimeFull)) * 1.2; // assume trips can take 20% longer than fastest possible.
                        const totalTimePerTrip = travelTimePerTrip + workTime + 1;

                        const tripsNeededToBuild = workNeeded / workPerTrip;

                        totalTime += (totalTimePerTrip * tripsNeededToBuild);

                    };

                    const creepsNeeded = Math.ceil(totalTime / 1500)

                    const totalCost = cost * creepsNeeded;


                    if (totalCost <= minCost) {
                        bestBody = [workParts, carryParts, moveParts];
                        minCost = totalCost;
                        estCreepsNeeded = creepsNeeded;
                    }

                };
            };
        };

        if (room.storage && storedEnergy < CONSERVE_ENERGY_VALUE) {

            bestBody[0] = Math.max(Math.floor(bestBody[0] / 2), 1)
            bestBody[1] = Math.max(Math.floor(bestBody[1] / 2), 1)
            bestBody[2] = Math.max(Math.floor(bestBody[2] / 2), 1)
        }
        // Build the body
        let body = [];

        for (let i = 0; i < bestBody[0]; i++) {
            body.push(WORK);
        };

        for (let i = 0; i < bestBody[1]; i++) {
            body.push(CARRY);
        };

        for (let i = 0; i < bestBody[2]; i++) {
            body.push(MOVE);
        };

        return [body, estCreepsNeeded];
    },

    /**
     * Generates a body for a filler.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    filler: function (budget) {

        const bodyPartBlock = [CARRY, CARRY, MOVE];
        const blockCost = 150;
        const targetCapacity = budget / 2;

        let cost = 0;
        let capacity = 0;
        let body = []

        while (cost + blockCost <= budget && capacity < targetCapacity) {
            body.push(...bodyPartBlock)
            cost += blockCost;
            capacity += 100;
        }

        return body;

    },

    hauler: function (budget, room) {

        const sources = room.find(FIND_SOURCES);

        let distance = 0;
        for (let s of sources) {
            distance += s.pos.getRangeTo(room.storage);
        };

        distance /= sources.length;

        const energyGeneratedPerLife = 15000 * sources.length;

        let bestBody = undefined;
        let minCost = Infinity;
        let closestBody = [1, 1];
        let closest = Infinity;

        for (let carryParts = 1; carryParts < 40; carryParts++) {
            for (let moveParts = 1; moveParts < 40; moveParts++) {

                if (carryParts + moveParts > 50) {
                    continue;
                };

                const cost = (carryParts * 50) + (moveParts * 50);

                if (cost > budget) {
                    continue;
                }

                const energyPerTrip = carryParts * 50;

                const moveTimeEmpty = 1;
                const moveTimeFull = Math.ceil(carryParts / (2 * moveParts));

                const timePerTrip = ((moveTimeEmpty * distance) + (moveTimeFull * distance) + 2) * 1.1; // 10% extra time

                const tripsPerLife = 1500 / timePerTrip;

                const energyPerLife = tripsPerLife * energyPerTrip;


                if (energyPerLife >= energyGeneratedPerLife && cost < minCost) {
                    bestBody = [carryParts, moveParts];
                    minCost = cost;
                } else if (energyPerLife < energyGeneratedPerLife && (energyGeneratedPerLife - energyPerLife) < closest) {
                    closestBody = [carryParts, moveParts];
                    closest = energyGeneratedPerLife - energyPerLife;
                };


            };
        };


        let body = [];
        if (bestBody) {

            for (let i = 0; i < bestBody[0]; i++) {
                body.push(CARRY);
            };

            for (let i = 0; i < bestBody[1]; i++) {
                body.push(MOVE);
            };

            return body;
        } else {

            for (let i = 0; i < closestBody[0]; i++) {
                body.push(CARRY);
            };

            for (let i = 0; i < closestBody[1]; i++) {
                body.push(MOVE);
            };

            return body;
        }



    },

    hub: function (energyBudget, room) {

        let carryParts = 5;
        let cost = 300;
        let maxCarry = undefined;
        let body = [];

        switch (room.controller.level) {
            case 5:

                maxCarry = 5;
                break;

            case 6:

                maxCarry = 8
                break;

            case 7:

                maxCarry = 10;
                break;

            case 8:

                maxCarry = 16
                break;

        }


        while (cost + 50 <= energyBudget && carryParts < maxCarry) {

            carryParts++;
            cost += 50;

        }

        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        };

        body.push(MOVE);

        return body;

    },

    maintainer: function (budget, room) {

        const structures = room.find(FIND_STRUCTURES);
        const sources = room.find(FIND_SOURCES);

        let roadCount = 0;
        let containerCount = 0;

        let averageDistance = 0;

        for (let s of structures) {
            if (s.structureType === STRUCTURE_ROAD) {
                if (room.controller) {
                    averageDistance += s.pos.getRangeTo(room.controller);
                } else {
                    for (let source of sources) {
                        averageDistance += s.pos.getRangeTo(source);
                    }
                }
                roadCount++;
            } else if (s.structureType === STRUCTURE_CONTAINER) {
                if (room.controller) {
                    averageDistance += s.pos.getRangeTo(room.controller);
                } else {
                    for (let source of sources) {
                        averageDistance += s.pos.getRangeTo(source);
                    }
                }
                containerCount++;
            };
        };

        if (room.controller) {
            averageDistance /= (containerCount + roadCount);
        } else {
            averageDistance /= ((containerCount + roadCount) * sources.length);
        }
        const workNeededPerLife = (containerCount * 15000) + (roadCount * 150) * 1.1; // 10% extra to account for any non road/container buildings that need repairs.


        let bestBody = [1, 1, 1];
        let minCost = Infinity;

        for (let workParts = 1; workParts < 40; workParts++) {
            for (let carryParts = 1; carryParts < 40; carryParts++) {
                for (let moveParts = 1; moveParts < 40; moveParts++) {

                    if (workParts + carryParts + moveParts > 50) {
                        continue;
                    };

                    const cost = (workParts * 100) + (carryParts * 50) + (moveParts * 50);

                    if (cost > budget) {
                        continue;
                    }


                    const workPerTrip = carryParts * 5000;
                    const workTime = workPerTrip / (workParts * 100);

                    const moveTimeEmpty = Math.ceil(workParts / (2 * moveParts));
                    const moveTimeFull = Math.ceil((workParts + carryParts) / (2 * moveParts));

                    const totalMoveTime = (averageDistance * moveTimeEmpty) + (averageDistance * moveTimeFull)

                    const timePerTrip = totalMoveTime + workTime + 1;

                    const tripsNeeded = workNeededPerLife / workPerTrip;

                    const tripsPerLife = 1500 / timePerTrip;


                    if (tripsPerLife > tripsNeeded && cost < minCost) {
                        bestBody = [workParts, carryParts, moveParts];
                        minCost = cost;
                    }

                };
            };
        };

        // Build the body
        let body = [];

        for (let i = 0; i < bestBody[0]; i++) {
            body.push(WORK);
        };

        for (let i = 0; i < bestBody[1]; i++) {
            body.push(CARRY);
        };

        for (let i = 0; i < bestBody[2]; i++) {
            body.push(MOVE);
        };

        return body;


    },

    /**
     * Generates a body for a miner.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    miner: function (budget) {

        let cost = 150;
        let workCount = 1;
        let moveCount = 1;
        let body = [];

        if (cost + 100 <= budget) {
            workCount++;
            cost += 100;
        };

        if (cost + 250 <= budget) {
            workCount++;
            workCount++;
            moveCount++;
            cost += 250;
        };
        if (cost + 150 <= budget) {
            workCount++;
            moveCount++;
            cost += 150;
        }

        for (let i = 0; i < workCount; i++) {
            body.push(WORK);
        };
        for (let i = 0; i < moveCount; i++) {
            body.push(MOVE);
        };



        return body;

    },

    /**
     * 
     * @param {number} budget
     * @param {Room} room 
     * @param {number} storedEnergy
     * @returns {BodyPartConstant[]}
     */
    upgrader: function (budget, room, storedEnergy) {

        /*
            Most effecient upgrader can complete the most upgrades in its life.
            Note we are going to increase the number of upgraders as we acquire more energy.
        */
        let averageDistance = 0;
        const sources = room.find(FIND_SOURCES)


        if (!room.storage) {

            for (let s of sources) {
                averageDistance += s.pos.getRangeTo(room.controller);
            };

            averageDistance /= sources.length;

        } else {
            averageDistance = room.storage.pos.getRangeTo(room.controller);
        };

        let bestBody = [];
        let max = 0;

        for (let workParts = 1; workParts < 40; workParts++) {
            for (let carryParts = 1; carryParts < 40; carryParts++) {
                for (let moveParts = 1; moveParts < 40; moveParts++) {

                    if (workParts + carryParts + moveParts > 50) {
                        continue;
                    };

                    const cost = (workParts * 100) + (carryParts * 50) + (moveParts * 50);

                    if (cost > budget) {
                        continue;
                    }
                    const workPerTrip = carryParts * 5000;
                    const workTime = workPerTrip / (workParts * 100);

                    const moveTimeEmpty = Math.ceil(workParts / (2 * moveParts));
                    const moveTimeFull = Math.ceil((workParts + carryParts) / (2 * moveParts));

                    const avgMoveTime = (averageDistance * moveTimeEmpty) + (averageDistance * moveTimeFull);

                    const timePerTrip = avgMoveTime + workTime + 1;

                    const tripsPerLife = 1500 / timePerTrip;

                    const workPerLife = tripsPerLife * workPerTrip;


                    if (workPerLife > max) {
                        bestBody = [workParts, carryParts, moveParts];
                        max = workPerLife;
                    };


                };
            };
        };

        if (room.storage && storedEnergy < CONSERVE_ENERGY_VALUE) {
            bestBody[0] = Math.max(Math.floor(bestBody[0] / 2), 1)
            bestBody[1] = Math.max(Math.floor(bestBody[1] / 2), 1)
            bestBody[2] = Math.max(Math.floor(bestBody[2] / 2), 1)
        }
        // Build the body
        let body = [];

        for (let i = 0; i < bestBody[0]; i++) {
            body.push(WORK);
        };

        for (let i = 0; i < bestBody[1]; i++) {
            body.push(CARRY);
        };

        for (let i = 0; i < bestBody[2]; i++) {
            body.push(MOVE);
        };

        return body;

    },

    wallBuilder: function (budget, room, storedEnergy) {

        let averageDistance = 0;
        const sources = room.find(FIND_SOURCES);
        const structures = room.find(FIND_STRUCTURES);
        let wallCount = 0;

        if (!room.storage) {

            for (let structure of structures) {

                if (structure.structureType == STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {

                    wallCount++;

                    for (let s of sources) {

                        averageDistance += s.pos.getRangeTo(room.controller);
                    };
                }
            }

            averageDistance /= (sources.length * wallCount);

        } else {

            for (let structure of structures) {

                if (structure.structureType == STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {

                    wallCount++;

                    averageDistance += room.storage.pos.getRangeTo(room.controller);

                }
            }

            averageDistance /= wallCount;
        };

        let bestBody = [];
        let max = 0;

        for (let workParts = 1; workParts < 40; workParts++) {
            for (let carryParts = 1; carryParts < 40; carryParts++) {
                for (let moveParts = 1; moveParts < 40; moveParts++) {

                    if (workParts + carryParts + moveParts > 50) {
                        continue;
                    };

                    const cost = (workParts * 100) + (carryParts * 50) + (moveParts * 50);

                    if (cost > budget) {
                        continue;
                    }

                    const workPerTrip = carryParts * 5000;
                    const workTime = workPerTrip / (workParts * 100);

                    const moveTimeEmpty = Math.ceil(workParts / (2 * moveParts));
                    const moveTimeFull = Math.ceil((workParts + carryParts) / (2 * moveParts));
                    const travelTimePerTrip = (averageDistance * moveTimeEmpty) + (averageDistance * moveTimeFull);

                    const totalTimePerTrip = travelTimePerTrip + workTime + 1;

                    const tripsPerLife = 1500 / totalTimePerTrip;

                    const workPerLife = workPerTrip * tripsPerLife;

                    if (workPerLife >= max) {
                        bestBody = [workParts, carryParts, moveParts];
                        max = workPerLife;
                    };

                };
            };
        };

        if (room.storage && storedEnergy < CONSERVE_ENERGY_VALUE) {
            bestBody[0] = Math.max(Math.floor(bestBody[0] / 2), 1)
            bestBody[1] = Math.max(Math.floor(bestBody[1] / 2), 1)
            bestBody[2] = Math.max(Math.floor(bestBody[2] / 2), 1)
        }
        // Build the body
        let body = [];

        for (let i = 0; i < bestBody[0]; i++) {
            body.push(WORK);
        };

        for (let i = 0; i < bestBody[1]; i++) {
            body.push(CARRY);
        };

        for (let i = 0; i < bestBody[2]; i++) {
            body.push(MOVE);
        };

        return body;


    },

    /**
     * Generates a body for a worker.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    worker: function (budget) {
        const blockCost = 200;
        let totalCost = 0;
        let workParts = 0;
        let carryParts = 0;
        let moveParts = 0;
        let body = [];

        while (totalCost + blockCost <= budget) {
            workParts++;
            carryParts++;
            moveParts++;
            totalCost += blockCost;
        };

        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        };

        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        };

        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        };

        return body;

    },

}

/**
 * Generates a name for a creep.
 * @param {string} roomName 
 * @param {string} role 
 * @returns {string}
 */
function getCreepName(roomName, role) {

    for (let i = 0; i < 10; i++) {

        const name = roomName + '_' + role + '_' + i;

        if (!Game.creeps[name]) {
            return name;
        };

    };

}

const getTargetCount = {

    /**
     * Returns the target number of builders.
     * @param {Room} room 
     * @returns {number}
     */
    builder: function (room) {
        if (room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return 1;

        return 0
    },

    /**
     * Returns the target number of fillers. 
     * @param {Creep[]} creeps
     * @returns {number} 
     */
    filler: function (creeps) {
        let count = 1;
        const fillers = creeps.filter(c => c.memory.role === 'filler')
        for (let creep of fillers) {
            if (creep.ticksToLive < 300) {
                count++;
            }
        }

        return count;

    },

    /**
     * Returns the target number of haulers. 
     * @returns {number}
     */
    hauler: function (room) {
        if (room.storage) {
            return 1;
        };
        return 0;
    },

    /**
     * Returns the target number of hub managers.
     * @param {Room} room
     * @param {number} storedEnergy
     */
    hub: function (room, storedEnergy) {
        if (room.controller.level < 5 || storedEnergy < 1000) {
            return 0;
        }
        if (MEMORY.rooms[room.name].links.hub) {
            return 1;
        }
        return 0;
    },

    /**
     * Returns the target number of maintainers.
     * @param {Room} room 
     * @returns {number}
     */
    maintainer: function (room) {

        const structures = room.find(FIND_STRUCTURES)

        for (let structure of structures) {

            if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
                return 1;
            }

        };

        return 0;

    },

    /**
     * Returns the target number of miners.
     * @param {Room} room 
     * @returns {number}
     */
    miner: function (room) {

        return room.find(FIND_SOURCES).length;

    },

    remoteMiner: function (room, outposts) {
        console.log('Entering getTargetCount.remoteMiner')
        let count = 0;
        console.log(JSON.stringify(outposts))
        for (let outpostName of outposts) {

            console.log(MEMORY.rooms[room.name].outposts[outpostName])

            if (MEMORY.rooms[room.name].outposts[outpostName]) {
                let mr = MEMORY.rooms[room.name].outposts[outpostName].minersReq

                count += mr
            }
        }


        return count;

    },

    scout: function (room) {

        if (room.storage) {
            return 1;
        };

        return 0;

    },

    /**
     * 
     * @param {Room} room 
     */
    upgrader: function (room) {

        // Count total energy available.
        const structures = room.find(FIND_STRUCTURES);
        const dropped = room.find(FIND_DROPPED_RESOURCES);
        let energy = 0;

        for (const s of structures) {
            if (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) {
                energy += s.store[RESOURCE_ENERGY];
            };
        };

        for (const d of dropped) {
            if (d.resourceType === RESOURCE_ENERGY) {
                energy += d.amount;
            };
        };

        if (room.controller.level === 8) {
            return 1;
        } else if (!room.storage) {
            return Math.ceil(energy / (1000 * room.controller.level));
        } else {
            return Math.ceil(energy / 100000);
        };



    },

    wallBuilder: function (room) {

        let structures = room.find(FIND_STRUCTURES)
        let hitsTarget = getWallHitsTarget(room) - 10000;

        for (let s of structures) {
            if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART && s.hits < hitsTarget) {
                return 1;
            }
        }

        return 0;

    },

    /**
    * Returns the target number of workers.
    * @param {number} minerCount 
    * @param {number} fillerCount 
    * @param {Room} room
    * @param {number} storedEnergy
    * @returns {number} 
    */
    worker: function (minerCount, fillerCount, room, storedEnergy) {

        let count = 0;


        if (minerCount === 0) {

            if (storedEnergy < 1000 || fillerCount === 0) {
                count++;
            }
        }

        if (fillerCount === 0 && room.energyAvailable < room.energyCapacityAvailable) {
            count++
        }

        return count;

    },

};

function getWallHitsTarget(room) {
    switch (room.controller.level) {
        case 8:
            return 20000000;
        case 7:
            return 4000000;
        case 6:
            return 3000000;
        case 5:
            return 2000000;
        default:
            return 1000000;
    };
};


module.exports = manageSpawns;