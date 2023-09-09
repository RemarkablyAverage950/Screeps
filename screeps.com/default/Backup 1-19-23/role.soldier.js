let roleSoldier = {
    run: function (creep) {
        
        if (creep.room.find(FIND_MY_CREEPS).filter(c => c.memory.role == 'soldier').length < 3) {
            creep.memory.moving = false
            //return
        }
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
        if (hostiles.length == 0) {
            creep.memory.moving = false
            return
        }
        let target = _.min(hostiles, h => h.hits)
        console.log(target.name)

        if (creep.attack(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target)
            creep.memory.moving = true
        }
    }
}

module.exports = roleSoldier