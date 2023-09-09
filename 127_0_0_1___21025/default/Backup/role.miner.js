var roleMiner = {

    /** @param {Creep} creep **/
    run: function (creep, creepPaths) {

        if (creep.memory.target == undefined || creep.memory.task == undefined) {
            return
        }
        const target = Game.getObjectById(creep.memory.target)

        if (target == undefined) {
            creep.memory.target = undefined
            creep.memory.task = undefined
            return
        }
        if(target.mineralType != undefined && target.mineralAmount == 0){
            creep.memory.target = undefined
            creep.memory.task = undefined
            return
        }
        
        var ret = undefined
        const task = creep.memory.task
        
        ret = creep.harvest(target)
        if(ret == -9){
            const container = creep.room.find(FIND_STRUCTURES).filter(s=> s.structureType == STRUCTURE_CONTAINER && s.pos.isNearTo(target))
            creep.moveTo(container[0])
        }

        /*
        //console.log('creep name: ' + creep.name)
        

        //console.log('creepArr: ' + creepArr)
        for (let i = 0; i < creepArr.length; i++) {
            if (creepArr[i] == creep.name) {
                //console.log('splicing '+creeps[i]+ ' from creeps')
                creepArr.splice(i, 1)
                i--
            }
        }
        //console.log('creeps: '+creeps)

        //console.log('Pos of creeps[0]: '+Game.creeps[creepArr[0]].pos)

        let sources = creep.room.find(FIND_SOURCES)
        let closestSource = creep.pos.findClosestByPath(sources);
        let destStructures = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_CONTAINER);
            }
        });

        for (let i = 0; i < destStructures.length; i++) {
            var valid = false
            for (let source of sources) {
                if (destStructures[i].pos.inRangeTo(source, 1)) {
                    //console.log(destStructures[i] + ' in range to ' + source)
                    valid = true
                }

            }
            if (valid == false) {
                destStructures.splice(i, 1)
                i--
            }
        }
        //console.log('destStructures: '+destStructures)
        for (let i = 0; i < destStructures.length; i++) {

            // console.log(destStructures[i]+' position: '+destStructures[i].pos)
            for (let name of creepArr) {

                //console.log(destStructures[i].pos)
                if (destStructures[i].pos.inRangeTo(Game.creeps[name], 0)) {
                    //console.log('Splicing ' + destStructures[i] + ' from destStructures')
                    destStructures.splice(i, 1)
                    i--
                }
                if (destStructures[i] == undefined) {
                    break
                }
            }
        }

        

        if (destStructures.length > 0) {
            target = creep.pos.findClosestByPath(destStructures)
            if(target == null){
                return
            }
            const path = creep.room.findPath(creep.pos, target.pos);
            if (path.length > 0) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            } else {
                creep.memory.moving = false

                creep.harvest(closestSource)
            }
        }*/


    }
};

module.exports = roleMiner;