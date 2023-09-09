let paths = {};

function managePathfinding(room) {

    if (!paths[room.name]) {
        paths[room.name] = {}
    }

    // Create pathfinder cost matrix.
    let costMatrix = new PathFinder.CostMatrix();
    let structures = room.find(FIND_STRUCTURES)
    let sites = room.find(FIND_CONSTRUCTION_SITES)
    for (let structure of structures) {
        // set impassable tiles for structures
        if (structure.structureType == 'road') {
            costMatrix.set(structure.pos.x, structure.pos.y, 1)
            continue
        } else {
            if (structure.structureType == 'container'
                || (structure.structureType == 'rampart' && structure.my)) {
                continue
            }
        }
        costMatrix.set(structure.pos.x, structure.pos.y, 0xff);
    }

    for (let site of sites) {
        if (site.structureType == 'container'
            || (site.structureType == 'rampart' && site.my)
            || site.structureType == 'road') {
            continue
        }

        costMatrix.set(site.pos.x, site.pos.y, 0xff);
    }
    let myCreeps = room.find(FIND_MY_CREEPS)
    for (let creep of myCreeps) {
        if (creep.memory.moving == false) {
            costMatrix.set(creep.pos.x, creep.pos.y, 0xff)
        }
    }
    if (!room.controller.safeMode) {
        let hostileCreeps = room.find(FIND_HOSTILE_CREEPS)
        for (let creep of hostileCreeps) {
            for (let x = -4; x <= 4; x++) {
                for (let y = -4; y <= 4; y++) {
                    costMatrix.set(creep.pos.x + x, creep.pos.y + y, costMatrix.get(creep.pos.x + x, creep.pos.y + y) + 20)
                }

            }
        }
    }
    // serialize matrix
    let serializedMatrix = costMatrix.serialize();
    // store in room.memory.costmatrix
    if (room.memory) {
        room.memory.costMatrix = serializedMatrix;
    }
}

module.exports = {
    managePathfinding: managePathfinding,
    paths: paths,
};