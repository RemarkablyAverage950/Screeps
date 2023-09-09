let scoutData = {};

module.exports = {
    scoutData,
    expansionManager: function (room) {
        //delete room.memory.expansionTask
        //delete room.memory.outposts
        //console.log(JSON.stringify(scoutData))
        if (!scoutData[room.name] || !scoutData[room.name].explored) {
            initialize(room)
        }
        const claimRoom = room.memory.claimRoom
        if(claimRoom && Game.rooms[claimRoom].find(FIND_MY_SPAWNS).length >0){
            delete room.memory.claimRoom
        }


        if (scoutData[room.name].explored.length > 100) {
            scoutData[room.name].explored.shift()
        }
        if (Game.time % 10 == 0) {
            findOutpostTarget(room)
        }
    }
}

function initialize(room) {
    console.log('Initializing scoutData.' + room.name)
    scoutData[room.name] = {
        explored: [],
        neighbors: {}
    }
}

function findOutpostTarget(room) {
    if (!room.memory.outposts) {
        room.memory.outposts = {};
    }
    // Start with homeroom neighbors
    let neighbors = scoutData[room.name].connected
    if (!neighbors) { return }
    for (const neighbor of neighbors) {
        if (!scoutData[room.name].neighbors[neighbor]) {
            continue
        }
        if (scoutData[room.name].neighbors[neighbor].safeToTravel
            && scoutData[room.name].neighbors[neighbor].type == 'available'
            && !room.memory.outposts[neighbor]) {
            console.log('FOUND OUTPOST TARGET: ' + neighbor)
            let data = {
                roomName: neighbor,
                meta: scoutData[room.name].neighbors[neighbor],
                status: 'SETUP',
                workAssignedOnTick: Game.time
            }
            room.memory.outposts[neighbor] = data
        }
    }
    // Then check neighbors neighbors
}
