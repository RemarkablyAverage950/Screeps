let MEMORY = require('memory');

/**
 * 
 * @param {Room} room 
 */
function manageLinks(room) {

    if (room.controller.level < 5) {
        return;
    }




    let linkMem = undefined;



    if (!MEMORY.rooms[room.name].links || Game.time % 50 === 0) {

        linkMem = {
            hub: undefined,
            controller: undefined,
            spawn: undefined,
            1: undefined,
            2: undefined,
            3: undefined,
            4: undefined,
        }

        const links = room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_LINK);
        let linkNum = 1;

        for (let s of links) {

            if (room.storage && s.pos.isNearTo(room.storage)) {
                linkMem.hub = s.id;
                continue;
            } else if (s.pos.getRangeTo(room.controller) === 2) {
                linkMem.controller = s.id;
                continue;
            }

            let spawnLink = true;
            for (let spawn of room.find(FIND_MY_SPAWNS)) {
                if (spawn.pos.getRangeTo(s) !== 2) {
                    spawnLink = false;
                };
            };

            if (spawnLink) {
                linkMem.spawn = s.id;
                continue;
            };

            linkMem[linkNum] = s.id;
            linkNum++;

        };


        MEMORY.rooms[room.name].links = linkMem;
    } else {
        linkMem = MEMORY.rooms[room.name].links;
    }


    if (linkMem.hub) {

        const hubLink = Game.getObjectById(linkMem.hub);

        if (hubLink.cooldown === 0 && hubLink.store[RESOURCE_ENERGY] > 0) {

            const spawnLink = Game.getObjectById(linkMem.spawn);
            const controllerLink = Game.getObjectById(linkMem.controller);

            if (spawnLink && spawnLink.store[RESOURCE_ENERGY] < 775) {

                const qty = Math.min(hubLink.store[RESOURCE_ENERGY], 800 - spawnLink.store[RESOURCE_ENERGY]);

                hubLink.transferEnergy(spawnLink, qty);

            } else if (controllerLink && controllerLink.store[RESOURCE_ENERGY] < 775) {

                const qty = Math.min(hubLink.store[RESOURCE_ENERGY], 800 - controllerLink.store[RESOURCE_ENERGY]);

                hubLink.transferEnergy(controllerLink, qty);

            };

        };
    };


};

module.exports = manageLinks;