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
function getBody(role, roomHeap) {
    
    if (!roomHeap.bodies[role]) {
        roomHeap.bodies[role] = {
            body: [],
            resetTime: Game.time,
        }
    }

    if (Game.time >= roomHeap.bodies[role].resetTime) {
        console.log('role', role)
        roomHeap.bodies[role].body = generateBody[role](roomHeap);
        roomHeap.bodies[role].resetTime = Game.time + 500;
    }

    return roomHeap.bodies[role].body

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


}

/**
 * Returns target counts, seperated by role.
 */
getTargetCount = {
    /**
        * Returns the target number of miners.
        * @param {Object} roomHeap
        * @returns {number}
        */
    miner: function (roomHeap) {
        let maxHarvesters = 0;
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

}

SPAWN_PRIORITY = {
    'miner': 1,
    'filler': 2,
    'scout': 3,
    'builder': 4,
    'upgrader': 5,
}

module.exports = { getBody, getTargetCount, SPAWN_PRIORITY, SpawnOrder };