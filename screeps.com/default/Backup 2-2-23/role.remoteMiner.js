let scoutData = require('expansionManager').scoutData
let roleMiner = require('role.miner')
const { moveCreep, moveToTargetRoom } = require("movecreep")
let roleRemoteMiner = {
    run: function (creep) {
        if (creep.memory.needTask == true) {
            findRemoteMinerTarget(creep)

        }
        if (creep.room.name != creep.memory.targetRoom && !creep.memory.harvestTarget) {

            moveToTargetRoom(creep)

        } else {

            roleMiner.run(creep)
        }
    }
}

module.exports = roleRemoteMiner

function findRemoteMinerTarget(creep) {
    let outposts = Memory.rooms[creep.memory.home].outposts
    for (let outpost in outposts) {
        let room = Game.rooms[outpost]
        if (!room) {
            creep.memory.targetRoom = outpost
            moveToTargetRoom(creep)
            return
        }
        const containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER && !s.assignedCreeps().some(c => Game.creeps[c].memory.role == 'remoteMiner'))
        const sources = room.find(FIND_SOURCES).filter(s => !s.assignedCreeps().some(c => Game.creeps[c].memory.role == 'remoteMiner'))

        let availableSourceGroups = []
        for (let source of sources) {
            let count = 0
            containers.forEach(c => { if (c.pos.isNearTo(source)) count++ })
            if(count >1){
                continue
            }
            for (let container of containers) {

                if (availableSourceGroups.some(g => g[0] == source.id)) {
                    continue
                }
                if (container.pos.isNearTo(source)) {
                    availableSourceGroups.push([source.id, container.id, source.pos.roomName])
                }
            }
        }
        //console.log(JSON.stringify(availableSourceGroups))
        if (availableSourceGroups.length > 0) {
            let group = availableSourceGroups[0]
            creep.memory.harvestTarget = group[0]
            creep.memory.moveTarget = group[1]
            creep.memory.resource = RESOURCE_ENERGY
            creep.memory.needTask = false
            creep.memory.targetRoom = group[2]
            return
        } else {
            //creep.moveTo(sources[0])
        }
    }
}



