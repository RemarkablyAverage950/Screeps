function towers(room) {
    //console.log('test',room)
    var target;
    let towers = Game.rooms[room].find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_TOWER);
        }
    });

    let enemies = Game.rooms[room].find(FIND_HOSTILE_CREEPS).filter(e => e.body.some(b => b.type == 'heal'))
    if (enemies.length == 0) {
        enemies = Game.rooms[room].find(FIND_HOSTILE_CREEPS)
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
                var repairSites = Game.rooms[room].find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && (s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART))
                repairSites.sort((a, b) => (a.hits  - b.hits ))
                
                /*if (repairSites.length == 0) {
                    repairSites = Game.rooms[room].find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax)
                    repairSites.sort((a, b) => (a.hits  - b.hits ))
                }*/

                if (repairSites.length != 0) {

                    //target = tower.pos.findClosestByRange(repairSites)
                    target = repairSites[0]
                    tower.repair(target)
                } else {
                    // find all ramparts lowers than lowest wall and repair them
                    let walls = Game.rooms[room].find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_WALL)
                    let minWall = _.min(walls, function (s) { return s.hits })
                    repairSites = Game.rooms[room].find(FIND_STRUCTURES).filter(s => (s.hits < minWall.hits|| s.hits < 10000) && s.structureType == STRUCTURE_RAMPART)
                    repairSites.sort((a, b) => (a.hits  - b.hits ))
                    if (repairSites.length != 0) {

                        //target = tower.pos.findClosestByRange(repairSites)
                        target = repairSites[0]
                        tower.repair(target)

                    }


                }


            }
        }else {
                // heal => attack tower
                let myCreeps = Game.rooms[room].find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax)
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
    module.exports = towers;