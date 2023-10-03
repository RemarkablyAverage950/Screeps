let MEMORY = require('memory');

/**
 * 
 * @param {Room} room 
 */
function manageLinks(room) {


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
        MEMORY.rooms[room.name].links = linkMem
        if (room.controller.level < 5) {
            return;
        }

        const structures = room.find(FIND_STRUCTURES)
        let links = [];
        let containers = [];
        let extensions = [];

        for (let s of structures) {
            if (s.structureType === STRUCTURE_EXTENSION) {
                extensions.push(s)
            } else if (s.structureType == STRUCTURE_CONTAINER) {
                containers.push(s)
            } else if (s.structureType === STRUCTURE_LINK) {
                links.push(s)
            }
        }


        let linkNum = 1;

        for (let s of links) {

            if (room.storage && s.pos.isNearTo(room.storage)) {
                linkMem.hub = s.id;
                continue;
            } else if (s.pos.getRangeTo(room.controller) === 2) {
                linkMem.controller = s.id;
                continue;
            }

            let spawnLink = false;
            for (let spawn of room.find(FIND_MY_SPAWNS)) {
                if (spawn.pos.getRangeTo(s) == 2) {
                    spawnLink = true;
                }

            } if (!spawnLink) {
                let count = 0
                for (let c of containers) {
                    if (s.pos.getRangeTo(c) === 2) {
                        count++;
                    }
                }
                if (count === 2) {
                    spawnLink = true;
                } else {
                    for (let e of extensions) {
                        count = 0;
                        if (s.pos.isNearTo(e)) {
                            count++
                        }
                    }
                    if (count === 4) {
                        spawnLink = true;
                    }
                }
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
        if (!hubLink) {
            linkMem.hub = undefined
            return;
        }
        if (hubLink.cooldown === 0 && hubLink.store[RESOURCE_ENERGY] > 0) {

            const spawnLink = Game.getObjectById(linkMem.spawn);
            const controllerLink = Game.getObjectById(linkMem.controller);
            let targetLinks = [];
            if (spawnLink && spawnLink.store[RESOURCE_ENERGY] < 775) {

                //const qty = Math.min(hubLink.store[RESOURCE_ENERGY], 800 - spawnLink.store[RESOURCE_ENERGY]);
                targetLinks.push(spawnLink)
                //hubLink.transferEnergy(spawnLink, qty);

            }

            if (controllerLink && controllerLink.store[RESOURCE_ENERGY] < 775) {

                //const qty = Math.min(hubLink.store[RESOURCE_ENERGY], 800 - controllerLink.store[RESOURCE_ENERGY]);
                targetLinks.push(controllerLink)
                //hubLink.transferEnergy(controllerLink, qty);

            };
            if (targetLinks.length) {
                const target = _.min(targetLinks, t => t.store[RESOURCE_ENERGY])
                hubLink.transferEnergy(target, Math.min(hubLink.store[RESOURCE_ENERGY], 800 - target.store[RESOURCE_ENERGY]))
            }
        };
    };


};

module.exports = manageLinks;