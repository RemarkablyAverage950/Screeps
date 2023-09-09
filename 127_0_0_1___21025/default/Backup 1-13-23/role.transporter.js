let roleTransporter = {
    run: function (creep) {
        let preReqTask = creep.memory.preReq.task;
        let taskTarget = Game.getObjectById(creep.memory.target);
        let ret;
        if (preReqTask != 'withdraw') {

            ret = creep.transfer(taskTarget, RESOURCE_ENERGY)
            if (ret == -9) {
                creep.moveTo(taskTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                creep.memory.moving = true
            } else if (ret == 0) {
                creep.memory.preReq.task = undefined;
                creep.memory.preReq.target = undefined;
                creep.memory.task = undefined
                creep.memory.target = undefined
                creep.memory.needTask = true
                creep.memory.moving = false
            };
            return;
        }
        let preReqTarget = Game.getObjectById(creep.memory.preReq.target);
        if(preReqTarget == undefined){
            creep.memory.needTask = true
            return
        }
        ret = creep.withdraw(preReqTarget, RESOURCE_ENERGY)
        if (ret == -9) {
            creep.moveTo(preReqTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
            creep.memory.moving = true
        } else if (ret == 0) {
            creep.memory.preReq.task = undefined;
            creep.memory.preReq.target = undefined;
        }
    }
}
module.exports = roleTransporter