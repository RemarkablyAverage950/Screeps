function towers(room) {
    //console.log('test',room)
    var target;
    let towers = room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_TOWER);
        }
    });

    let enemies = room.find(FIND_HOSTILE_CREEPS).filter(e => e.body.some(b => b.type == 'heal'))
    if (enemies.length == 0) {
        enemies = room.find(FIND_HOSTILE_CREEPS)
    }
    for (let e of enemies) {
        // works => e.body.some(b => b.type == 'heal')
    }

    for (let i = 0; i < towers.length; i++) {
        var tower = towers[i]

        if (i % 2 == 0) {
            // attack => repair tower

            if (enemies.length > 0) {
                target = tower.pos.findClosestByRange(enemies)

                tower.attack(target)
            }
            else {
                var repairSites = room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && (s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART))

                if (repairSites.length > 0) {
                    repairSites.sort((a, b) => (a.hits - b.hits))
                    target = repairSites[0]
                    tower.repair(target)
                } else {
                    const wallHits = getWallTarget(room)
                    // find all ramparts lowers than lowest wall and repair them
                    
                    repairSites = room.find(FIND_STRUCTURES).filter(s => (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && (s.hits < 5000 || (s.hits < wallHits+1000 && s.hits / wallHits > .99)))
                    if (repairSites.length > 0) {
                        repairSites.sort((a, b) => (a.hits - b.hits))

                        target = repairSites[0]
                        tower.repair(target)



                    }

                }


            }
        } else {
            // heal => attack tower
            let myCreeps = room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax)
            if (myCreeps.length > 0) {
                target = tower.pos.findClosestByRange(myCreeps)
                tower.heal(target)
            } else {
                target = tower.pos.findClosestByRange(enemies)

                tower.attack(target)
            }


        }
    }
}

function getWallTarget(room) {
    const level = room.controller.level
    const exp = Math.log(20000000) / Math.log(8)
    return Math.max(1000000, level ** exp)
}
module.exports = towers;