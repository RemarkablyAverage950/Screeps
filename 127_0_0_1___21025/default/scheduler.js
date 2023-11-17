const roomManager = require('roomManager');

function* main() {
    const myRooms = getMyRooms();
    yield* roomManagerGenerator(myRooms);
}

const loop = function () {
    const generator = main();

    function run(result) {
        const { value, done } = generator.next(result);

        if (!done) {
            run(value);
        }
    }

    run();
};

function* roomManagerGenerator(myRooms) {
    for (const roomName of myRooms) {
        if (limitReached(50)) {
            return;
        }
        yield roomManager(roomName);
    }
}

function limitReached(requiredBucket = 0) {

    if (Game.cpu.getUsed() / this.limit > 0.8 && this.bucket < requiredBucket) {
        console.log('CPU limit reached.');
        return true;
    }

    return false;
}

function getMyRooms() {
    let myRooms = [];

    for (const roomName in Game.rooms) {
        if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {
            myRooms.push(roomName);
        }
    }

    for (const roomName of Object.keys(Memory.rooms)) {
        if (!myRooms.includes(roomName)) {
            delete Memory.rooms[roomName];
        }
    }

    return myRooms;
}

module.exports = { loop };