
/**
 * 
 * @param {Room} room 
 */
function manageTowers(room) {

    const towers = room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_TOWER);
    const wallTarget = getWallHitsTarget(room) + 1000;

    let target = undefined;

    for (let tower of towers) {

        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0) {
            target = _.min(hostiles, h => h.pos.getRangeTo(tower))
            if (target) {
                tower.attack(target);
                continue;
            }
        }

        const creeps = room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax);

        if (creeps.length > 0) {
            target = _.min(creeps, h => h.pos.getRangeTo(tower))
            if (target) {
                tower.heal(target);
                continue;
            }
        }

        const structures = room.find(FIND_STRUCTURES);
        if (tower.store[RESOURCE_ENERGY] <= 500 || (room.storage && room.storage.store[RESOURCE_ENERGY] < 20000)) {
            continue;
        }

        for (let s of structures) {
            if (s.pos.getRangeTo(tower) > 5) {
                continue;
            }

            if ((s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL)) {

                if (s.hits < Math.min(wallTarget, s.hitsMax)) {

                    tower.repair(s);
                    break;

                }

            } else if (s.structureType !== STRUCTURE_ROAD && s.hits < s.hitsMax - 800) {

                tower.repair(s);
                break;

            }
        }


    }

}

function getWallHitsTarget(room) {
    switch (room.controller.level) {
        case 8:
            return 20000000;
        case 7:
            return 4000000;
        case 6:
            return 3000000;
        case 5:
            return 2000000;
        default:
            return 1000000;
    };
};

module.exports = manageTowers;