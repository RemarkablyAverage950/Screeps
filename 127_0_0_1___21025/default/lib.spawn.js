let MEMORY = require('memory');
const lib = require('lib');

const DEBUG = 1;

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
        this.boosts = {};
    }
}

/**
 * Checks if we can load a body from heap.
 * If not, generates a new body and sets TTL (reset time) for body.
 * 
 * Returns a body part array. 
 * 
 * @param {string} role 
 * @param {Object} roomHeap 
 * @returns {BodyPartConstant[]}
 */
function getBody(role, roomHeap,room) {

    if (!roomHeap.spawnData.bodies[role]) {
        roomHeap.spawnData.bodies[role] = {
            body: [],
            resetTime: Game.time,
        }
    }

    if (Game.time >= roomHeap.spawnData.bodies[role].resetTime) {
        if (DEBUG) {
            console.log('role', role)
        }
        roomHeap.spawnData.bodies[role].body = generateBody[role](roomHeap, room);
        roomHeap.spawnData.bodies[role].resetTime = Game.time + 500;
    }

    return roomHeap.spawnData.bodies[role].body

}

const generateBody = {

    /**
     * Generates a body for a filler.
     * @param {Object} roomHeap 
     * @returns {BodyPartConstant[]}
     */
    filler: function (roomHeap) {

        const budget = roomHeap.energyCapacityAvailable;

        let carryParts = 2;
        let moveParts = 1;
        const blockCost = 150;

        let targetCapacity = budget / 2;

        if (roomHeap.links && roomHeap.links.spawn) {

            if (room.controller.level === 8) {
                targetCapacity = (budget - 3000 - (300 * roomHeap.structures[STRUCTURE_SPAWN].length)) / 5
            }
            if (room.controller.level === 7) {
                targetCapacity = (budget - 1500 - (300 * roomHeap.structures[STRUCTURE_SPAWN].length)) / 5
            } else {
                targetCapacity = (budget - 750 - (300 * roomHeap.structures[STRUCTURE_SPAWN].length)) / 2
            }
        }
        let cost = 150;
        let capacity = 0;
        let body = []

        while (cost + blockCost <= budget && capacity < targetCapacity && carryParts + moveParts < 48) {
            carryParts += 2
            moveParts++;

            cost += blockCost;
            capacity += 100;
        }

        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY)
        }
        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE)
        }

        return body;

    },

    /**
     * Generates a body for a miner.
     * @param {Object} roomHeap 
     * @returns {BodyPartConstant[]}
     */
    miner: function (roomHeap) {

        const budget = roomHeap.energyAvailable
        let cost = 250;
        let workCount = 2;
        let moveCount = 1;
        let body = [];

        if (cost + 150 <= budget) {
            workCount++;
            moveCount++;
            cost += 150;
        }
        if (cost + 100 <= budget) {
            workCount++;
            cost += 100;
        }
        if (cost + 150 <= budget) {
            workCount++;
            moveCount++;
            cost += 150;
        }

        for (let i = 0; i < workCount; i++) {
            body.push(WORK);
        }
        for (let i = 0; i < moveCount; i++) {
            body.push(MOVE);
        }



        return body;

    },

    /**
     * @param {Object} roomHeap
     * @param {number} budget
     * @param {Room} room 
     * @param {number} storedEnergy
     * @returns {BodyPartConstant[]}
     */
    upgrader: function (roomHeap, room) {
        console.log('B',room.name)
        /*if ((room.controller.level === 8 && room.storage && room.storage.store[RESOURCE_ENERGY] < 300000) || room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 || (!room.storage && conserveEnergy) || (room.storage && room.storage.store[RESOURCE_ENERGY] < 10000)) {
            return [WORK, CARRY, MOVE]
        }*/

        /*
            Most effecient upgrader can complete the most upgrades in its life.
            Note we are going to increase the number of upgraders as we acquire more energy.
        */
        const conserveEnergy = false;
        const budget = roomHeap.energyCapacityAvailable;
        let averageDistance = 0;
        console.log(JSON.stringify(roomHeap.sources))
        const sourcePositions = Object.values(roomHeap.sources).map(s => s.pos)
        console.log('sourcePositions:', JSON.stringify(sourcePositions))
        let controllerLink = undefined;//MEMORY.rooms[room.name].links.controller;
        let spawn = lib.getStructures(room, [STRUCTURE_SPAWN])[0];
        if (!spawn) {
            return undefined;
        }
        let maxCarryParts = 40
        let maxWorkParts = room.controller.level === 8 ? 15 : 40;

        if (controllerLink) {
            averageDistance = spawn.pos.getRangeTo(Game.getObjectById(controllerLink))
            maxCarryParts = 15;
        } else if (!room.storage) {

            for (let s of sourcePositions) {
                averageDistance += s.getRangeTo(room.controller);
            };

            averageDistance /= sourcePositions.length;

        } else {
            averageDistance = room.storage.pos.getRangeTo(room.controller);
        };

        let bestBody = [];
        let max = 0;
        let minCost = Infinity;

        for (let workParts = 1; workParts <= maxWorkParts; workParts++) {
            for (let carryParts = 1; carryParts <= maxCarryParts; carryParts++) {
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

                    if (workPerLife > max || (workPerLife === max && cost < minCost)) {
                        bestBody = [workParts, carryParts, moveParts];
                        max = workPerLife;
                        minCost = cost;
                    };


                };
            };
        };

        if (conserveEnergy || (room.controller.level === 8 && room.storage && room.storage.store[RESOURCE_ENERGY] < 300000)) {
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
}


function getTargetCounts(room, roomHeap) {

    if (DEBUG) {
        console.log('Entering getTargetCounts')
    }

    if (!roomHeap.spawnData.targetCounts) {
        roomHeap.spawnData.targetCounts = {
            miner: getTargetCount.miner(roomHeap),
            filler: getTargetCount.filler(),
            upgrader: getTargetCount.upgrader(room, roomHeap),
        }

    }

    let targetCounts = roomHeap.spawnData.targetCounts;



    return targetCounts

}


/**
 * Returns target counts, seperated by role.
 */
const getTargetCount = {

    filler: function () {
        return 1;
    },

    /**
        * Returns the target number of miners.
        * @param {Object} roomHeap
        * @returns {number}
        */
    miner: function (roomHeap) {

        let count = 0;

        // Largest size of harvester we can make.
        let maxWorkParts = 2;
        if (roomHeap.energyCapacityAvailable >= 650) {
            maxWorkParts = 5;
        } else if (roomHeap.energyCapacityAvailable >= 500) {
            maxWorkParts = 4
        } else if (roomHeap.energyCapacityAvailable >= 400) {
            maxWorkParts = 3
        }

        const neededPerSource = Math.ceil(5 / maxWorkParts)

        for (const s of Object.values(roomHeap.sources)) {

            count += Math.min(s.maxCreeps, neededPerSource);
        }

        return count;

    },

    upgrader: function (room, roomHeap) {
 
        if (roomHeap.constructionSiteCount) {
            return 0;
        }
        const energyAvailable = lib.getResourceQtyAvailable(room, RESOURCE_ENERGY);


        switch (room.controller.level) {
            case 1:
                return 4;

            case 2:
            case 3:
                return Math.ceil(energyAvailable / 1000)
            case 4:

            case 5:
                return Math.ceil(energyAvailable / 20000)
            case 6:
                return Math.ceil(energyAvailable / 50000)
            case 7:
                return Math.ceil(energyAvailable / 75000)
            case 8:
                return 1;

        }



    },

}

SPAWN_PRIORITY = {
    'miner': 1,
    'filler': 2,
    'scout': 3,
    'builder': 4,
    'upgrader': 5,
}

module.exports = { getBody, getTargetCounts, SPAWN_PRIORITY, SpawnOrder };