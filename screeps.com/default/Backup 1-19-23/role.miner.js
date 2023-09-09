let moveCreep = require('movecreep');
let roleMiner2 = {
    run: function (creep) {
        let preReqTask = creep.memory.preReq.task;
        let taskTarget = Game.getObjectById(creep.memory.target);

        if (preReqTask != 'move') {
            creep.harvest(taskTarget);
            return;
        }
        let preReqTarget = Game.getObjectById(creep.memory.preReq.target);
        if (creep.pos.getRangeTo(preReqTarget) > 0) {
            let ret = moveCreep(creep, preReqTarget, 0)
            //creep.moveTo(preReqTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
            if (ret == 0) {
                creep.memory.moving = true
            } else {
                creep.memory.moving = false
            }
        } else {
            creep.memory.preReq.task = undefined;
            creep.memory.preReq.target = undefined;
            creep.memory.moving = false
            creep.harvest(taskTarget);
        }
    }
}


let roleMiner = {
    run: function (creep) {
        let task = creep.memory.task
        let target = Game.getObjectById(creep.memory.target);
        switch (task) {
            case 'move':
                console.log(creep.pos.getRangeTo(target))
                if (creep.pos.getRangeTo(target) > 0) {
                    let ret = moveCreep(creep, target, 0)
                    //creep.moveTo(preReqTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
                    if (ret == 0) {
                        creep.memory.moving = true
                    } else {
                        creep.memory.moving = false
                    }
                } else {
                    creep.memory.task = undefined;
                    creep.memory.target = undefined;
                    creep.memory.moving = false
                    creep.memory.needTask = true
                }
                break;
            case 'harvest':
                creep.harvest(target);
                break
        }
    }
}
module.exports = roleMiner