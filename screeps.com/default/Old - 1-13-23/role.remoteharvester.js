var roleRemoteHarvester = {
    run: function (creep) {
        if (creep.memory.target == undefined || creep.memory.task == undefined) {
            return
        }
        var target = undefined

        if (creep.memory.task == 'move') {
            target = JSON.parse(creep.memory.target)
            try {
                creep.moveTo(target.x, target.y,)
            } catch (e) { console.log('error', creep.name, creep.pos) }
            return
        } else {

            var ret = undefined
            if (creep.room.name != creep.memory.home) {

                let tombstones = creep.room.find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity() > 0)
                if (tombstones.length > 0 && creep.store.getFreeCapacity() > 0) {
                    target = creep.pos.findClosestByPath(tombstones)
                    let stored_resources = Object.keys(target.store)
                    ret = creep.withdraw(target, stored_resources[0])
                    if (ret == -9) {
                        creep.moveTo(target)
                    }
                    return
                }
                let resources = creep.room.find(FIND_DROPPED_RESOURCES)
                if (resources.length > 0) {
                    target = creep.pos.findClosestByRange(resources)
                    ret = creep.pickup(target)
                    if (ret == -9) {
                        creep.moveTo(target)
                    }
                    return
                }
            }
            //63a75984b453dd77ee3b2431

            target = Game.getObjectById(creep.memory.target)

            switch (creep.memory.task) {
                case 'harvest':
                    ret = creep.harvest(target)
                    break
                case 'transferTo':
                   
                      
                            for (const resourceType in creep.carry) {
                                ret = creep.transfer(target, resourceType);
                            }
                        

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
                case 'attackController':
                    if (creep.room.name == creep.memory.targetRoom) {
                        ret = creep.attackController(creep.room.controller)
                        break
                    } else {
                        creep.memory.task = undefined
                        creep.memory.target = undefined
                    }
                    break

                case 'reserve':
                    if (creep.room.name == creep.memory.targetRoom) {
                        ret = creep.reserveController(creep.room.controller)

                        break
                    } else {
                        creep.memory.task = undefined
                        creep.memory.target = undefined
                    }
                    break
                case 'build':
                    ret = creep.build(target)
                    break
                case 'dismantle':
                    if (target == undefined) {
                        creep.memory.target = undefined
                        creep.memory.task = undefined
                    }

                    ret = creep.dismantle(target)

                    break
            }
        }
        if (ret == -9 || ret == -6) {
            creep.moveTo(target)
        }
    }
}
module.exports = roleRemoteHarvester;

/* 

Game.spawns['Spawn1'].memory.remoteHarvestTargets = JSON.stringify([{id: 'a06f077240e9885',room: 'W8N2',harvesters: 2},{id: '9263077296e02bb',room: 'W7N3',harvesters: 2},{id: 'c12d077296e6ac9',room: 'W7N3',harvesters: 2}])

*/