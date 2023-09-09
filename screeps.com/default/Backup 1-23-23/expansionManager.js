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
       

        
        if (scoutData[room.name].explored.length > 100) {
            scoutData[room.name].explored.shift()
        }
        if (room.memory.expansionTask == undefined) {
            findOutpostTarget(room)
        }
    }
}

function initialize(room) {
    console.log('Initializing scoutData.'+room.name)
    scoutData[room.name] = {
        explored: [],
        neighbors: {}
    }
}

function findOutpostTarget(room) {
    if (!room.memory.outposts) {
        room.memory.outposts = {};
    }
    let outpostTarget;
    for (const neighbor in scoutData[room.name].neighbors) {
        if (scoutData[room.name].neighbors[neighbor].distance == 1
            && scoutData[room.name].neighbors[neighbor].safeToTravel
            && scoutData[room.name].neighbors[neighbor].type == 'available'
            && !room.memory.outposts[neighbor]) {
            outpostTarget = neighbor;
            break;
        }
    }
    // find outpost that does not exist in room.memory.outpost    

    if (!outpostTarget) {
        return
    }
    console.log('FOUND OUTPOST TARGET: ' + outpostTarget)
    let data = {
        roomName: outpostTarget,
        meta: scoutData[room.name].neighbors[outpostTarget],
        status: 'SETUP'
    }
    room.memory.outposts[outpostTarget] = data
    room.memory.expansionTask = {
        targetRoom: outpostTarget,
        currentTask: 'BLUEPRINT_INFRASTRUCTURE',
        type: 'REMOTE_HARVEST',
    }
}
