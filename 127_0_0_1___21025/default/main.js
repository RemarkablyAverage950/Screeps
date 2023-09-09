const manageSpawns = require('manageSpawns')


module.exports.loop = function () {

    const myRooms = getMyRooms()

    for(const roomName of myRooms){

        const room = Game.rooms[roomName];

        manageSpawns(room);

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


