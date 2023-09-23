let MEMORY = require('memory')

class SO {
    constructor(id, pos) {
        this.id = id;
        this.pos = pos;
        this.lastHaul = 0;
    }
}

function outpostManager(room) {

    let outposts = room.memory.outposts;


    for (let outpostName of outposts) {

        let heap = MEMORY.rooms[room.name].outposts[outpostName];

        if (!heap) {

            heap = {
                sources: undefined,
                minersReq: 1,
                constructionComplete: true,
                constructionPositions: [],
                name: outpostName,
                lastMaintained: 0,
            }
            MEMORY.rooms[room.name].outposts[outpostName] = heap;
        }
    }

    if (Game.time % 19 === 0) {

        for (let outpostName of outposts) {

            let heap = MEMORY.rooms[room.name].outposts[outpostName];

            let outpostRoom = Game.rooms[outpostName];
            if (!outpostRoom) {
                continue;
            }

            if (heap.sources === undefined) {
                const sources = outpostRoom.find(FIND_SOURCES);
                let arr = [];
                for (let s of sources) {
                    arr.push(new SO(s.id, s.pos))
                }
                heap.sources = arr;
                heap.minersReq = sources.length;
            }

            const sites = outpostRoom.find(FIND_MY_CONSTRUCTION_SITES)
            if (sites.length > 0) {
                heap.constructionComplete = false;
                heap.constructionPositions = sites.map(s => s.pos)
            } else {
                heap.constructionComplete = true;

            }

            MEMORY.rooms[room.name].outposts[outpostName] = heap;
        }
    }
}

module.exports = outpostManager;