let roleMiner = {
    run: function (creep) {
        let preReqTask = creep.memory.preReq.task;
        let taskTarget = Game.getObjectById(creep.memory.target);

        if (preReqTask != 'move') {
            creep.harvest(taskTarget);
            return;
        }
        let preReqTarget = Game.getObjectById(creep.memory.preReq.target);
        if (creep.pos.getRangeTo(preReqTarget) > 0) {
            creep.moveTo(preReqTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
            creep.memory.moving = true
        } else {
            creep.memory.preReq.task = undefined;
            creep.memory.preReq.target = undefined;
            creep.memory.moving = false
            creep.harvest(taskTarget);
        }
    }
}
module.exports = roleMiner