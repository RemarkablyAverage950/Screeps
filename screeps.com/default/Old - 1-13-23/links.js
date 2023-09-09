function manageLinks(room, spawns) {
    const links = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK)


    if (links.length > 0) {
        var baseLink = undefined
        var controllerLink = undefined
        if (spawns[0].memory.baseLink == undefined && links.length > 1) {
            spawns[0].memory.baseLink = findBaseLink(room, links).id
        } else if (spawns[0].memory.baseLink == undefined) {
            return
        }
        if (spawns[0].memory.controllerLink == undefined) {

            let cLink = findcontrollerLink(room, links)
            if (cLink != undefined) {
                spawns[0].memory.controllerLink = cLink.id
            }
        } else {
            controllerLink = Game.getObjectById(spawns[0].memory.controllerLink)
        }

        baseLink = Game.getObjectById(spawns[0].memory.baseLink)
        var fromLinks = []
        for (let link of links) {
            if (link != baseLink && link != controllerLink) {
                fromLinks.push(link)
            }
        }
        for (let link of fromLinks) {
            if (link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && baseLink.store.getFreeCapacity(RESOURCE_ENERGY) > 2) {

                link.transferEnergy(baseLink, Math.min(baseLink.store.getFreeCapacity(RESOURCE_ENERGY), link.store.getUsedCapacity(RESOURCE_ENERGY)))
            }
        }
        
        if (controllerLink != undefined  && baseLink != undefined&& controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) > 2) {
            baseLink.transferEnergy(controllerLink, Math.min(controllerLink.store.getFreeCapacity(RESOURCE_ENERGY), baseLink.store.getUsedCapacity(RESOURCE_ENERGY)))
        }

    }

}



function findBaseLink(room, links) {
    const storage = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)[0]
    //console.log(storage.pos)
    return _.min(links, s => s.pos.getRangeTo(storage))
}
module.exports = manageLinks;

function findcontrollerLink(room, links) {
    let ret = undefined
    links.forEach(l => {
        if (l.pos.inRangeTo(room.controller, 3)) {
            ret = l
        }
    })
    return ret
}