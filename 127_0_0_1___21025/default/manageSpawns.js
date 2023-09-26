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
        if (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) {
            storedEnergy += s.store[RESOURCE_ENERGY];
        };
    };

    let spawnQueue = [];

    let creepsCount = _.countBy(creeps, c => c.memory.role);
    let workerCount = creepsCount['worker'] || 0;
    let minerCount = creepsCount['miner'] || 0;
    let fillerCount = creepsCount['filler'] || 0;
    let fastFillerCount = creepsCount['fastFiller'] || 0;
    let hubCount = creepsCount['hub'] || 0;
    let haulerCount = creepsCount['hauler'] || 0;

    const targetWorkerCount = getTargetCount.worker(minerCount, fillerCount, room, storedEnergy);
    const targetMinerCount = getTargetCount.miner(room);
    const targetFillerCount = getTargetCount.filler(creeps);
    const targetFastFillerCount = getTargetCount.fastFiller(room);
    const targetHubCount = getTargetCount.hub(room, storedEnergy);
    const targetHaulerCount = getTargetCount.hauler(room);
    const targetMineralMinerCount = getTargetCount.mineralMiner(room);

    for (let order of existingSpawnQueue) {

        const role = order.role;

        if (role === 'worker') {

            workerCount++;

        } else if (role === 'miner') {

            minerCount++;

        } else if (role === 'filler') {

            fillerCount++;

        }else if (role === 'hub') {

            hubCount++;

        } else if (role === 'fastFiller') {
            fastFillerCount++;
        } else if (role === 'hauler') {

            haulerCount++;

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

    body = [];
    while (fastFillerCount < targetFastFillerCount) {
        if (body.length === 0) {
            body = getBody.fastFiller()
        }

        options = {
            memory: {
                role: 'fastFiller',
                home: room.name,
            },
        };
        spawnQueue.push(new SpawnOrder('fastFiller', 4, body, options));
        fastFillerCount++;
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
    while (haulerCount < targetHaulerCount) {

        if (body.length === 0) {
            body = getBody.hauler(energyBudget, room, targetMineralMinerCount);
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

    if (onlyEssential) return spawnQueue;

    const outpostRooms = room.memory.outposts;

    let upgraderCount = creepsCount['upgrader'] || 0;
    let builderCount = creepsCount['builder'] || 0;
    let maintainerCount = creepsCount['maintainer'] || 0;
    let wallBuilderCount = creepsCount['wallBuilder'] || 0;

    let scoutCount = creepsCount['scout'] || 0;

    let remoteBuilderCount = creepsCount['remoteBuilder'] || 0;
    let remoteMaintainerCount = creepsCount['remoteMaintainer'] || 0;

    let mineralMinerCount = creepsCount['mineralMiner'] || 0;

    const targetUpgraderCount = getTargetCount.upgrader(room);
    let targetBuilderCount = getTargetCount.builder(room);
    const targetMaintainerCount = getTargetCount.maintainer(room);
    const targetWallBuilderCount = getTargetCount.wallBuilder(room);
    const targetScoutCount = getTargetCount.scout(room);
    const targetRemoteBuilderCount = getTargetCount.remoteBuilder(room, outpostRooms);
    const targetRemoteMaintainerCount = getTargetCount.remoteMaintainer(room, outpostRooms);

    

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

        } else if (role === 'scout') {

            scoutCount++;

        }  else if (role === 'remoteBuilder') {
            remoteBuilderCount++;
        }
        else if (role === 'remoteMaintainer') {
            remoteMaintainerCount++;
        } else if (role === 'mineralMiner') {
            mineralMinerCount++;
        }

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

        spawnQueue.push(new SpawnOrder('upgrader', 6, body, options));
        upgraderCount++;
    };

    body = [];

    while (builderCount < targetBuilderCount) {

        if (body.length === 0) {
            let ret = getBody.builder(energyBudget, room, storedEnergy);
            body = ret[0];

            if (ret[1] > 2 && storedEnergy > CONSERVE_ENERGY_VALUE) {
                targetBuilderCount = 2;
            }
            options = {
                memory: {
                    role: 'builder',
                    home: room.name,
                },
            };

        };

        spawnQueue.push(new SpawnOrder('builder', 6, body, options));
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

        spawnQueue.push(new SpawnOrder('maintainer', 5, body, options));
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

        spawnQueue.push(new SpawnOrder('wallBuilder', 6, body, options));
        wallBuilderCount++;
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
    while (remoteBuilderCount < targetRemoteBuilderCount) {
        body = getBody.remoteBuilder(energyBudget, room, storedEnergy)

        options = {
            memory: {
                role: 'remoteBuilder',
                home: room.name,
                assignedRoom: undefined,
            },
        };
        spawnQueue.push(new SpawnOrder('remoteBuilder', 6, body, options));
        remoteBuilderCount++;
    }

    body = [];
    while (remoteMaintainerCount < targetRemoteMaintainerCount) {
        body = getBody.remoteMaintainer()

        options = {
            memory: {
                role: 'remoteMaintainer',
                home: room.name,
                assignedRoom: undefined,
            },
        };
        spawnQueue.push(new SpawnOrder('remoteMaintainer', 5, body, options));
        remoteMaintainerCount++;
    }

    

    body = [];
    while (mineralMinerCount < targetMineralMinerCount) {
        body = getBody.mineralMiner(energyBudget, room);
        options = {
            memory: {
                role: 'mineralMiner',
                home: room.name,
            },
        };
        spawnQueue.push(new SpawnOrder('mineralMiner', 6, body, options));
        mineralMinerCount++;
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

        if (room.storage && storedEnergy < 5000) {
            return [WORK, CARRY, MOVE]
        }

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
     * 
     * @param {number} budget 
     * @param {Creep[]} hostiles 
     */
    defender: function (budget, hostiles) {
        let enemyAttackParts = 0;
        for (let hCreep of hostiles) {

            let body = hCreep.body;

            for (let part of body) {
                if (part.type === ATTACK || part.type === RANGED_ATTACK) {
                    enemyAttackParts++;
                }
            }
        }

        let attackParts = 1;
        let moveParts = 1;
        let toughParts = 1;
        let healParts = 0;
        let rangedAttackParts = 0;
        let cost = 140;

        while (cost + 140 <= budget && attackParts < enemyAttackParts && attackParts + moveParts + toughParts < 47) {
            attackParts++;
            moveParts++;
            toughParts++;
            cost += 140
        }

        if (cost + 450 <= budget && attackParts + moveParts + toughParts < 44) {
            moveParts++
            healParts++
            rangedAttackParts++;
        }

        let body = [];

        for (let i = 0; i < toughParts; i++) {
            body.push(TOUGH);
        };
        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        };

        for (let i = 0; i < attackParts; i++) {
            body.push(ATTACK);
        };

        for (let i = 0; i < rangedAttackParts; i++) {
            body.push(RANGED_ATTACK);
        };



        for (let i = 0; i < healParts; i++) {
            body.push(HEAL);
        };
        return body;

    },

    fastFiller: function () {
        return [CARRY, MOVE]
    },

    /**
     * Generates a body for a filler.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    filler: function (budget, room) {

        const bodyPartBlock = [CARRY, CARRY, MOVE];
        const blockCost = 150;

        let targetCapacity = budget / 2;

        if (MEMORY.rooms[room.name].links.spawn) {
            targetCapacity = (budget - 750) / 2
        }

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

    /**
     * 
     * @param {number} budget 
     * @param {Room} room 
     * @param {boolean} haulMinerals 
     * @returns {BodyPartConstant[]}
     */
    hauler: function (budget, room, haulMinerals) {

        const sources = room.find(FIND_SOURCES);

        let distance = 0;
        for (let s of sources) {
            distance += s.pos.getRangeTo(room.storage);
        };
        if (haulMinerals) {
            const mineral = room.find(FIND_MINERALS)[0]
            distance += mineral.pos.getRangeTo(room.storage)
        }

        distance /= (sources.length + haulMinerals);


        let energyGeneratedPerLife = 15000 * sources.length;
        if (haulMinerals) {
            energyGeneratedPerLife *= 1.25
        }

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

        let averageRoadDistance = 0;
        let averageContainerDistance = 0;

        for (let s of structures) {
            if (s.structureType === STRUCTURE_ROAD) {
                if (room.storage) {
                    averageRoadDistance += s.pos.getRangeTo(room.storage);
                } else {
                    for (let source of sources) {
                        averageRoadDistance += s.pos.getRangeTo(source);
                    }
                }
                roadCount++;
            } else if (s.structureType === STRUCTURE_CONTAINER) {
                if (room.storage) {
                    averageContainerDistance += s.pos.getRangeTo(room.storage);
                } else {
                    for (let source of sources) {
                        averageContainerDistance += s.pos.getRangeTo(source);
                    }
                }
                containerCount++;
            };
        };

        if (room.storage) {
            averageRoadDistance /= roadCount;
        } else {
            averageContainerDistance /= (containerCount * sources.length);
        }
        const roadWorkNeededPerLife = (roadCount * 150) * 2; // 2x extra to account for any non road/container buildings that need repairs + road damage from movement.
        const conatinerWorkNeededPerLife = (containerCount * 15000) * 1.1

        let bodyFound = false;
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

                    const moveTimeEmpty = Math.ceil(workParts / (1.75 * moveParts));
                    const moveTimeFull = Math.ceil((workParts + carryParts) / (1.75 * moveParts));

                    const totalMoveTimeRoad = (averageRoadDistance * moveTimeEmpty) + (averageRoadDistance * moveTimeFull)
                    const totalMoveTimeContainer = (averageContainerDistance * moveTimeEmpty) + (averageContainerDistance * moveTimeFull)

                    const timePerTripRoad = totalMoveTimeRoad + workTime + 1;
                    const timePerTripContainer = totalMoveTimeContainer + workTime + 1;

                    const tripsNeededRoad = roadWorkNeededPerLife / workPerTrip;
                    const tripsNeededContainer = conatinerWorkNeededPerLife / workPerTrip;

                    const tripsPerLife = 1500 / (timePerTripRoad + timePerTripContainer);



                    if (!bodyFound && tripsPerLife >= tripsNeededRoad + tripsNeededContainer) {
                        bestBody = [workParts, carryParts, moveParts];
                        minCost = cost;
                        bodyFound = true;
                    } else if (bodyFound && cost < minCost && tripsPerLife >= tripsNeededRoad + tripsNeededContainer) {
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
     * @param {number} energyBudget 
     * @param {Room} room 
     * @return {BodyPartConstant[]}
     */
    mineralMiner: function (energyBudget, room) {
        let mineral = room.find(FIND_MINERALS)[0]
        let mineralAmountRemaining = mineral.mineralAmount
        let distance = room.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(mineral);


        let bestBody = [];


        for (let workParts = 1; workParts < 33; workParts++) {
            let moveParts = Math.ceil(workParts / 2)

            let cost = (workParts * 100) + (moveParts * 50);
            if (cost > energyBudget) {
                break;
            }

            let travelTime = distance;

            let workPerTick = workParts / 5
            bestBody = [workParts, moveParts]
            let workPerLife = (1500 - travelTime) * workPerTick
            if (workPerLife >= mineralAmountRemaining) {
                break;
            }
        }

        let body = [];

        for (let i = 0; i < bestBody[0]; i++) {
            body.push(WORK);
        };
        for (let i = 0; i < bestBody[1]; i++) {
            body.push(MOVE);
        };

        return body;
    },

    remoteBuilder: function (energyBudget, room, storedEnergy) {

        if (room.storage && storedEnergy < 5000) {
            return [WORK, CARRY, MOVE]
        }

        let workParts = 1;
        let moveParts = 1;
        let carryParts = 1;

        if (energyBudget >= 350) {
            moveParts += 1 // 2
            carryParts += 2 // 3

        }

        if (energyBudget >= 550) {
            workParts++;
            carryParts++;
            moveParts++;
        }

        if (energyBudget >= 700) {
            carryParts += 2;
            moveParts++;
        }
        let body = [];
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

    remoteHauler: function (energyBudget, capacityRequired) {
        let moveParts = 1;
        let carryParts = 2;
        let cost = 150;
        let capacity = 100;

        while (cost + 150 <= energyBudget && capacity <= capacityRequired) {
            moveParts += 1;
            carryParts += 2;
            cost += 150
            capacity += 100;
        }

        let body = [];
        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        };
        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        };
        return body;
    },

    remoteMaintainer: function () {

        const body = [WORK, CARRY, MOVE];
        return body;
    },

    /**
     * Generates a body for a miner.
     * @param {number} budget Energy budget.
     * @returns {BodyPartConstant[]}
     */
    remoteMiner: function (budget) {

        let cost = 200; // Includes 1 carry part
        let workCount = 1;
        let moveCount = 1;

        let body = [];



        if (cost + 250 <= budget) {
            workCount++;
            workCount++;
            moveCount++;
            cost += 250;
        };
        if (cost + 350 <= budget) {
            workCount++;
            workCount++;
            workCount++;
            moveCount++;
            cost += 350;
        }

        for (let i = 0; i < workCount; i++) {
            body.push(WORK);
        };

        body.push(CARRY)

        for (let i = 0; i < moveCount; i++) {
            body.push(MOVE);
        };

        return body;

    },

    reserver: function (budget) {
        let body = [];

        let claimParts = 1;
        let moveParts = 1

        if (budget >= 1300) {
            claimParts++;
            moveParts++;
        }

        for (let i = 0; i < claimParts; i++) {
            body.push(CLAIM)
        }
        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE)
        }

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

        if (room.storage && storedEnergy < 5000) {
            return [WORK, CARRY, MOVE]
        }

        /*
            Most effecient upgrader can complete the most upgrades in its life.
            Note we are going to increase the number of upgraders as we acquire more energy.
        */
        let averageDistance = 0;
        const sources = room.find(FIND_SOURCES)
        let controllerLink = MEMORY.rooms[room.name].links.controller
        let spawn = room.find(FIND_MY_SPAWNS)[0];

        if (controllerLink) {
            averageDistance = spawn.pos.getRangeTo(Game.getObjectById(controllerLink))
        } else if (!room.storage) {

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

                    let workPerLife;

                    if (controllerLink) {

                        const moveTime = moveTimeEmpty * averageDistance;
                        const timeToRefill = workTime + 1;
                        const refillsPerLife = (1500 - moveTime) / timeToRefill;
                        workPerLife = workPerTrip * refillsPerLife;

                    } else {
                        const avgMoveTime = (averageDistance * moveTimeEmpty) + (averageDistance * moveTimeFull);

                        const timePerTrip = avgMoveTime + workTime + 1;

                        const tripsPerLife = 1500 / timePerTrip;


                        workPerLife = tripsPerLife * workPerTrip;
                    }

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

        if (room.storage && storedEnergy < 5000) {
            return [WORK, CARRY, MOVE]
        }


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

    fastFiller: function (room) {
        if (MEMORY.rooms[room.name].links.spawn) {
            return 4;
        }
        return 0;
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

    /**
     * 
     * @param {Room} room 
     * @returns {number}
     */
    mineralMiner: function (room) {

        if (room.controller.level < 6) {
            return 0;
        } else {
            const extractor = room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_EXTRACTOR)[0]
            if (extractor) {
                let mineral = room.find(FIND_MINERALS)[0]
                if (mineral.mineralAmount > 0) {
                    return 1;
                }
            }
            return 0;
        }

    },

    remoteBuilder: function (room, outpostRooms) {


        for (let outpostName of outpostRooms) {


            if (MEMORY.rooms[room.name].outposts[outpostName] && MEMORY.rooms[room.name].outposts[outpostName].constructionComplete === false) {

                return 1;
            }
        }


        return 0;
    },

    remoteMiner: function (room, outposts) {

        let count = 0;

        for (let outpostName of outposts) {


            if (MEMORY.rooms[room.name].outposts[outpostName]) {
                let mr = MEMORY.rooms[room.name].outposts[outpostName].minersReq

                count += mr
            }
        }


        return count;

    },

    remoteMaintainer: function (room, outpostRooms) {

        let roomCount = outpostRooms.length;
        return 1;

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


module.exports = { manageSpawns, getBody, SpawnOrder };