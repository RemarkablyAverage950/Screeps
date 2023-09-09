let linkData = {}

function linkManager(room) {


    if (!linkData[room.name]) {
        // Initialize room in links.
        linkData[room.name] = {}
    }

    if (room.controller.level >= 5) {
        const links = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK)

        let controllerLink = Game.getObjectById(linkData[room.name].controller)
        let hubLink = Game.getObjectById(linkData[room.name].hub)

        if (!controllerLink) {

            controllerLink = room.controller.pos.findInRange(links, 3)[0]
            if (controllerLink) {
                linkData[room.name].controller = controllerLink.id
            }

        }

        if (!hubLink && room.storage) {

            hubLink = room.storage.pos.findInRange(links, 1)[0]

            if (hubLink) {
                linkData[room.name].hub = hubLink.id
            }

        }

        if (hubLink && controllerLink && controllerLink.energy < 700) {
            hubLink.transferEnergy(controllerLink)
        }
    }
}

module.exports = linkManager