let ignoreList = []
let hostileTargets = []

class hostileTarget {
    constructor(id, pos) {
        this.id = id,
            this.x = pos.x
        this.y = pos.y
    }

}

function towers(room) {

    manageIgnoreList(room)

    const structures = room.find(FIND_STRUCTURES);
    const towers = structures.filter(s => s.structureType == STRUCTURE_TOWER);
    if (towers.length == 0) { return; };
    let repairSitesExist = false;
    let healTargetsExist = false;
    let hostilesExist = false;
    let healTargets;
    let repairSites;
    let ignoreIds = ignoreList.map(t => t.id)
    let hostiles = room.find(FIND_HOSTILE_CREEPS).filter(c => !ignoreIds.includes(c.id));
    hostilesExist = hostiles.length > 0;
    if (hostilesExist) {
        hostiles.sort((a, b) => (a.hits - b.hits));
    } else {
        healTargets = room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax);
        healTargetsExist = healTargets.length > 0;
        if (healTargetsExist) {
            healTargets.sort((a, b) => (a.hits - b.hits));
        } else {
            repairSites = structures.filter(s =>
                (s.structureType != STRUCTURE_RAMPART && s.hits < .5 * s.hitsMax)
                || (s.structureType == STRUCTURE_RAMPART && s.hits < 10000));
            repairSitesExist = repairSites.length > 0;
            if (repairSitesExist) {
                repairSites.sort((a, b) => (a.hits - b.hits));
            };
        };
    };
    let energy = 0


    for (let tower of towers) {
        energy += tower.store[RESOURCE_ENERGY]
        if (hostilesExist || healTargetsExist || repairSitesExist) {
            energy += tower.store[RESOURCE_ENERGY]
            if (hostilesExist) {
                let target = _.min(hostiles, h => tower.pos.getRangeTo(h))
                hostileTargets.push([target.id, target.pos.x, target.pos.y])
                tower.attack(target)

            } else if (healTargetsExist) {

                tower.heal(healTargets[0])
            } else if (repairSitesExist) {
                tower.repair(repairSites[0])
            }
        }
    }

    if (energy / towers.length < 200) {
        room.memory.pauseSpawning = true
    } else { room.memory.pauseSpawning = false }
}
module.exports = towers

function manageIgnoreList(room) {
    if (hostileTargets.length > 0) {
        console.log('HostileTargets', hostileTargets.length)
    }
    for (let i = hostileTargets.length - 1; i >= 0; i--) {
        let target = Game.getObjectById(hostileTargets[i].id)
        if (!target) {
            hostileTargets.splice(i, 1)
            continue
        }
        if (target.hits == target.hitsMax) {
            ignoreList.push(hostileTarget)
        }

    }
    if (ignoreList.lenght > 0) {
        console.log('ignoreList', ignoreList.length)
    }
    for (let i = ignoreList.length - 1; i >= 0; i--) {
        if (!Game.getObjectById(ignoreList[i].id)) {
            ignoreList.splice(i, 1)
        } else {
            let pos = Game.getObjectById(ignoreList[i].id).pos
            if (pos.x != ignoreList[i].x || pos.y != ignoreList[i].y) {
                ignoreList.splice(i, 1)
            }
        }
    }

}