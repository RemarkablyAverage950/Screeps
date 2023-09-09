let roleHealer = {
    run: function (creep) {
        let soldiers = creep.room.find(FIND_MY_CREEPS).filter(c=> c.memory.role == 'soldier')
        if(soldiers.length == 0){
            creep.memory.moving = false
            return
        }
        let target = _.min(soldiers, h => h.hits)
        
        
        if(creep.heal(target) == ERR_NOT_IN_RANGE){
            creep.moveTo(target)
            creep.memory.moving = true
        }else{
            creep.memory.moving = false
        }
    }
}

module.exports = roleHealer