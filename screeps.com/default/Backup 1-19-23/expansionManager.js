let scoutData = {};

module.exports = {
    scoutData,
    expansionManager: function (room) {
        if (!scoutData[room.name]) {
            scoutData[room.name] = {
                explored: [],
                neighbors: {}
            }
        }
        if (scoutData[room.name].explored.length > 100) {
            scoutData[room.name].explored.shift()
        }
        if (room.memory.expansionTask == undefined) {
            findOutpostTarget(room)
        }

        if (room.memory.expansionTask == undefined) {
            return
        }

    }
}

function findOutpostTarget(room) {
    if (!room.memory.outposts) {
        room.memory.outposts = [];
    }
    let outpostTarget;
    for (const neighbor in scoutData[room.name].neighbors) {
        if (scoutData[room.name].neighbors[neighbor].distance == 1
            && scoutData[room.name].neighbors[neighbor].safeToTravel
            && scoutData[room.name].neighbors[neighbor].type == 'available'
            && !room.memory.outposts.some(outpost => outpost.roomName == neighbor)) {
            outpostTarget = neighbor;
            break;
        }
    }
    // find outpost that does not exist in room.memory.outpost    
    console.log(outpostTarget)
    if (!outpostTarget) {
        return
    }
    console.log('FOUND OUTPOST TARGET: ' + outpostTarget)
    let data = {
        roomName: outpostTarget,
        meta: scoutData[room.name].neighbors[outpostTarget],
        status: 'SETUP'
    }
    room.memory.outposts.push(data)
    room.memory.expansionTask = {
        targetRoom: outpostTarget,
        currentTask: 'BLUEPRINT_INFRASTRUCTURE',
        type: 'REMOTE_HARVEST',
    }
}
