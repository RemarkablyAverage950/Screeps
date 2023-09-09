function towers(room) {
    //console.log('test',room)
    var target;
    let towers = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_TOWER);
        }
    });
    let enemies = Game.rooms[room].find(FIND_HOSTILE_CREEPS);
    for (let tower of towers) {
        if (enemies.length > 0) {
            target = tower.pos.findClosestByRange(enemies)

            tower.attack(target)
        }
        else {
            let repairSites = Game.rooms[room].find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL)
            if(repairSites.length != 0){
                target = tower.pos.findClosestByRange(repairSites)
                tower.repair(target)
            }

            
        }


    }

}

module.exports = towers;