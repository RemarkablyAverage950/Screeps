let MEMORY = {
    creeps: {}, // Store creep memory data here. Path, tasks, moving, requests.
    processes: [],
    rooms: {},
    username: getUserName(),
}


function initializeMemory() {
    console.log('initializing MEMORY')
    const obj = {
        rooms: {},
        username: getUserName(),
    }
    return obj;

}

function getUserName() {
    for (const i in Game.rooms) {
        const room = Game.rooms[i];
        if (room.controller && room.controller.my) {
            return room.controller.owner.username;
        }
    }
    return null;

}

module.exports =  MEMORY ;