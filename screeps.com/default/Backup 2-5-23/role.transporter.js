let { moveCreep } = require('movecreep');

let roleTransporter = {
    run: function (creep) {
        let task = creep.memory.task;
        let target = Game.getObjectById(creep.memory.target);
        let resource = creep.memory.resource || RESOURCE_ENERGY
        if (!target) {
            creep.memory.task = undefined
            creep.memory.target = undefined
            creep.memory.needTask = true
            creep.memory.moving = false
            return
        }
        let ret;
        switch (task) {
            case 'withdraw':
                if (target.store[resource] == 0) {
                    creep.memory.task = undefined
                    creep.memory.target = undefined
                    creep.memory.needTask = true
                    creep.memory.moving = false
                }
                ret = creep.withdraw(target, resource)
                if (ret == -9) {
                    moveCreep(creep, target)
                    creep.memory.moving = true
                } else if (ret == 0) {
                    creep.memory.task = undefined
                    creep.memory.target = undefined
                    creep.memory.needTask = true
                    creep.memory.moving = false
                    creep.memory.refill = false
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
                for (let resource in creep.store) {
                    ret = creep.transfer(target, resource)
                }
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