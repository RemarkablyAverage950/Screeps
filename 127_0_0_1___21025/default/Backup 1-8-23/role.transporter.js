let roleTransporter = {
    run: function (creep) {
        let preReqTask = creep.memory.preReq.task;
        let taskTarget = Game.getObjectById(creep.memory.target);

        if (preReqTask != 'withdraw') {
            creep.memory.moving = false
            creep.transfer(taskTarget, RESOURCE_ENERGY);
            return;
        }
        let preReqTarget = Game.getObjectById(creep.memory.preReq.target);
        console.log('prereqtarget', preReqTarget.id)
        let ret = creep.withdraw(preReqTarget, RESOURCE_ENERGY)
        console.log('ret', ret)
        if (ret == -9) {
            creep.moveTo(preReqTarget, { visualizePathStyle: { stroke: '#ffaa00' } });

        } else if (ret == 0) {
            console.log('Clearing preReqs')
            creep.memory.preReq.task = undefined;
            creep.memory.preReq.target = undefined;
            console.log(creep.memory.preReq.target)
        }
    }
}
module.exports = roleTransporter