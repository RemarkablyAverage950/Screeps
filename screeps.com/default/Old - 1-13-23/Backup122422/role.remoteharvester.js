var roleRemoteHarvester = {
    run: function (creep) {
        if (creep.memory.target == undefined || creep.memory.task == undefined) {
            return
        }
        var target = undefined
        if (creep.memory.task == 'move') {
            target = JSON.parse(creep.memory.target)
            creep.moveTo(target.x, target.y)
            return
        } else {
            var ret = undefined
            target = Game.getObjectById(creep.memory.target)
            switch (creep.memory.task) {
                case 'harvest':
                    ret = creep.harvest(target)
                    break
                case 'transferTo':
                    ret = creep.transfer(target, RESOURCE_ENERGY)
                    break
                case 'claim':
                    if (creep.room.name == creep.memory.targetRoom) {
                        ret = creep.claimController(creep.room.controller)
                        break
                    } else {
                        creep.memory.task = undefined
                        creep.memory.target = undefined
                    }
                    break
                case 'build':
                    ret = creep.build(target)
                    break
            }
        }
        if (ret == -9) {

            creep.moveTo(target)
        }
    }
}
module.exports = roleRemoteHarvester;

/* 

Game.spawns['Spawn1'].memory.remoteHarvestTargets = JSON.stringify([{id: 'a06f077240e9885',room: 'W8N2',harvesters: 2},{id: '9263077296e02bb',room: 'W7N3',harvesters: 2},{id: 'c12d077296e6ac9',room: 'W7N3',harvesters: 2}])

*/