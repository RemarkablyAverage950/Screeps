let moveCreep = require('movecreep');

let roleTransporter = {
    run: function (creep) {
        let task = creep.memory.task;
        let target = Game.getObjectById(creep.memory.target);
        if(!target){
            creep.memory.task = undefined
            creep.memory.target = undefined
            creep.memory.needTask = true
            creep.memory.moving = false
            return
        }
        let ret;
        switch (task) {
            case 'withdraw':
                ret = creep.withdraw(target, RESOURCE_ENERGY)
                if (ret == -9) {
                    moveCreep(creep, target)
                    creep.memory.moving = true
                } else if (ret == 0) {
                    creep.memory.task = undefined
                    creep.memory.target = undefined
                    creep.memory.needTask = true
                    creep.memory.moving = false
                }
                break
            case 'pickup':
                ret = creep.pickup(target)
                if (ret == -9) {
                    moveCreep(creep, target)
                    creep.memory.moving = true
                } else if (ret == 0) {
                    creep.memory.task = undefined
                    creep.memory.target = undefined
                    creep.memory.needTask = true
                    creep.memory.moving = false
                };
                break;
            case 'transfer':
                ret = creep.transfer(target, RESOURCE_ENERGY)
                if (ret == -9) {
                    moveCreep(creep, target)
                    creep.memory.moving = true
                } else if (ret == 0) {
                    creep.memory.task = undefined
                    creep.memory.target = undefined
                    creep.memory.needTask = true
                    creep.memory.moving = false
                };
                break
        }
    }
}
module.exports = roleTransporter