function towers(room) {
    const structures = room.find(FIND_STRUCTURES);
    const towers = structures.filter(s => s.structureType == STRUCTURE_TOWER);
    if (towers.length == 0) { return; };
    let repairSitesExist = false;
    let healTargetsExist = false;
    let hostilesExist = false;
    let healTargets;
    let repairSites;
    let hostiles = room.find(FIND_HOSTILE_CREEPS).filter(c=> c.owner.userName != 'MarvinTMB');
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
                (s.structureType != STRUCTURE_RAMPART && s.hits < s.hitsMax)
                || (s.structureType == STRUCTURE_RAMPART && ((s.hits < 1000000 && s.hits > 990000) || s.hits < 10000)));
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
                tower.attack(_.min(hostiles,h=> tower.pos.getRangeTo(h)))
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