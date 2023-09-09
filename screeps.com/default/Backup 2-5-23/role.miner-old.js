let {moveCreep} = require('movecreep');

let roleMiner = {
    run: function (creep) {
        let moveTarget = Game.getObjectById(creep.memory.moveTarget);
        let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);
        if (!moveTarget || !harvestTarget) {
            creep.memory.harvestTarget = undefined
            creep.memory.moveTarget = undefined
            creep.memory.needTask = true
            creep.memory.targetRoom = undefined
            creep.memory.clearPath = true
        }
        if (creep.pos.getRangeTo(moveTarget) > 0) {
            let ret = moveCreep(creep, moveTarget, 0, 5)
            if (ret == 0) {
                creep.memory.moving = true
            } else {
                creep.memory.moving = false
            }
        } else {
            creep.harvest(harvestTarget);
            creep.memory.moving = false
        }
    }
}
module.exports = roleMiner