let MEMORY = require('memory')

const roomManager = require('roomManager');

function* main() {
    const myRooms = getMyRooms();
    yield* roomManagerGenerator(myRooms);
}

const loop = function () {
    let generator;
    let iteration = 0;
    const lastTick = MEMORY.lastTickData;
    if (lastTick) {
        iteration = lastTick.iteration;
        generator = lastTick.generator;
    } else {
        generator = main();
    }

    function run(iteration) {
        const { value, done } = generator.next(iteration);

        if (value) {
            MEMORY.lastTickData = {
                generator: generator,
                iteration: value.iteration,
            };
        } else if (!done) {
            iteration++;
            run(iteration);
        }
    }

    run(iteration);
};

function* roomManagerGenerator(myRooms) {
    for (const roomName of myRooms) {

        yield limitReached(50)

        roomManager(roomName);
    }
}

function limitReached(requiredBucket = 0) {

    if (Game.cpu.getUsed() / Game.cpu.limit > 0.8 && Game.cpu.bucket < requiredBucket) {
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