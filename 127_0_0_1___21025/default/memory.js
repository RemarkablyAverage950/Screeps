let MEMORY = {
    rooms: {},
    username: getUserName()
};

function getUserName() {
    for (const i in Game.rooms) {
        const room = Game.rooms[i];
        if (room.controller && room.controller.my) {
            return room.controller.owner.username;
        }
    }
    return null;

}

module.exports = MEMORY;