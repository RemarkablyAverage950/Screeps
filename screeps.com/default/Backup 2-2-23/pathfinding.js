let matricies = {}

let paths = {};

function resetMatricies() {
    matricies = {}
    if (Game.time % 5 == 0) {
        paths = {}
    }
}

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
    if (!room.controller && !room.controller.safeMode) {
        let hostileCreeps = room.find(FIND_HOSTILE_CREEPS)
        if (hostileCreeps.length > 0) {
            const terrain = new Room.Terrain(room.name)
            for (let creep of hostileCreeps) {
                for (let x = creep.pos.x - 4; x <= creep.pos.x + 4; x++) {
                    for (let y = creep.pos.y - 4; y <= creep.pos.y + 4; y++) {
                        if (terrain.get(x, y) == TERRAIN_MASK_WALL) {
                            continue
                        }
                        costMatrix.set(x, y, costMatrix.get(x, y) + 20)
                    }
                }
            }
        }
    }

    // get positions on edge of room

    // serialize matrix
    let serializedMatrix = costMatrix.serialize();
    // store in room.memory.costmatrix


    matricies[room.name] = serializedMatrix
    return costMatrix

}

module.exports = {
    managePathfinding: managePathfinding,
    paths: paths,
    matricies: matricies,
    resetMatricies: resetMatricies
};