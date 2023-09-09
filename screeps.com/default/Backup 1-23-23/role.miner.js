let moveCreep = require('movecreep');

let roleMiner = {
    run: function (creep) {
        let moveTarget = Game.getObjectById(creep.memory.moveTarget);
        let harvestTarget = Game.getObjectById(creep.memory.harvestTarget);

        if (creep.pos.getRangeTo(moveTarget) > 0) {
            let ret = moveCreep(creep, moveTarget, 0)
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