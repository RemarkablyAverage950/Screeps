const manageSpawns = require('manageSpawns');
let MEMORY = require('memory');


module.exports.loop = function () {


    // Remove dead creeps from memory.
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            const room = Memory.creeps[name].home
            delete Memory.creeps[name];

            console.log('Cleared memory for '+name)
        }
    }


    const myRooms = getMyRooms()


    for (const roomName of myRooms) {

        const room = Game.rooms[roomName];
        const creeps = Object.values(Game.creeps).filter(c=> c.memory.home === roomName);

        manageMemory(room,creeps);
        manageSpawns(room,creeps);

    }

}

/**
 * Returns an array of names for rooms owned by me.
 * @returns {string[]}  
 */
function getMyRooms() {

    let myRooms = [];

    for (const roomName of Object.keys(Game.rooms)) {
        if (Game.rooms[roomName].controller.my) {

            myRooms.push(roomName);

        };
    };

    return myRooms;
}

/**
 * Initializes and maintains heap memory.
 * @param {Room} room 
 */
function manageMemory(room) {
    
    if (!MEMORY.ROOMS[room.name]) {
        MEMORY.ROOMS[room.name] = {
            spawnQueue: [],
            spawnTimer: 0,
        }

        console.log('Initialized MEMORY for '+room.name)

    }

}


