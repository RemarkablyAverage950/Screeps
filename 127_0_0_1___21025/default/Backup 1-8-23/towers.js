function towers(room) {
    let structures = room.find(FIND_STRUCTURES)
    let towers = structures.filter(s=> s.structureType == STRUCTURE_TOWER)
    let repairSites = structures.filter(s=> s.hits < s.hitsMax).sort((a,b)=> (a.hits-b.hits))

    for (let tower of towers){
        tower.repair(repairSites[0])
    }

}   
module.exports = towers