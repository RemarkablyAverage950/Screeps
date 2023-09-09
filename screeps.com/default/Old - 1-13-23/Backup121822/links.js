function links(room) {
    var transferTo = undefined
    var transferFrom = undefined


    var storage = Game.rooms[room].find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)[0]
    if(storage == undefined){
        storage = Game.rooms[room].find(FIND_CONSTRUCTION_SITES).filter(s => s.structureType == STRUCTURE_STORAGE)[0]
    }
    const links = Game.rooms[room].find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK)
    if (links.length < 2) {
        return
    }
    for (link of links) {
        if (link.pos.inRangeTo(storage.pos, 3)) {
            transferTo = link

        } else {
            transferFrom = link
        }


    }


    transferFrom.transferEnergy(transferTo);

}
module.exports = links;