let MEMORY = require('memory')

class Squad {
    /**
     * 
     * @param {string} type Duo, Trio, Quad 
     * @param {string} targetRoom Target room name
     * @param {string} squadClass Attack / Dismantle / Power Bank / Defense
     * @param {creep[]} creeps
     * @param {creep[]} followers
     * @param {creep} leader
     */
    constructor(type, targetRoom, squadClass, creeps, followers, leader) {
        this.id = Math.round(Math.random() * 9999);
        this.type = type;
        this.targetRoom = targetRoom
        this.squadClass = squadClass;
        this.creeps = creeps
        this.followers = followers;

        this.leader = leader
        this.ready = false;
        this.moving = false;
    }
}




/**
 * 
 * 
 */
function manageSquads() {
    const creeps = Object.values(Game.creeps).filter(c => !c.spawning)
    // Find all creeps and put them into squad
    let squads = {};

    for (const creep of creeps) {
        let memory = creep.memory
        let squad_id = memory.squad_id
        if (squad_id) {
            // We have a squad member.

            if (MEMORY.squads[squad_id]) {
                // Squad already loaded in heap.
                continue;
            }

            if (!squads[squad_id]) {
                let obj = {
                    creeps: [creep],
                }
            } else {
                squads[squad_id].creeps.push(creep)
            }
        }
    }

    // Create squad objects

    for (let squad_id of Object.keys(squads)) {
        const squad = squads[squad_id]
        for (let creep of squad.creeps) {

            if (creep.memory.squadInfo) {

                let data = creep.memory.squadInfo;
                let type = data.type;
                let squadClass = data.squadClass;
                let id = creep.memory.squad_id
                let targetRoom = data.targetRoom

                if (type === 'DUO' && squad.creeps.length !== 2) {
                    break;
                } else if (type === 'TRIO' && squad.creeps.length !== 3) {
                    break
                } else if (type === 'QUAD' && squad.creeps.length !== 4) {
                    break;
                }

                MEMORY.squads[squad_id] = new Squad(type, target, squadClass, squad.creeps.filter(c => c.name !== creep.name), creep)

            }
        }
    }

    // All active squads are loaded in memory.

    for (let squad of Object.values(MEMORY.squads)) {
        const squadSize = squad.creeps.length;

        if (!squad.ready) {

            // Renew creeps until ticksToLive > 1400
            let renewed = true;
            for (let creep of creeps) {
                if (creep.ticksToLive < 1400) {
                    renewed = false;
                    if (!MEMORY.rooms[creep.memory.home].renewOrders.some(r => r === creep.id)) {
                        MEMORY.rooms[creep.memory.home].renewOrders.push(creep.id)
                    }

                    // See if an available spawn is trying to fill the renew order. Move to spawn and renew.

                }
            }

            renewed = true; // Temporary

            if (renewed) {

                squad.ready = findJoinPosition(squad, squadSize)
            }

            squad.ready = ready;
        }
        if (squad.ready) {

            // Make sure squad is joined

            if (!joined) {
                // Leader finds an open position of appropriate size for squad and moves to it



                // Members move to leader

                continue;
            }

            // If not in target room, move to target room.

            // Do stuff based on squad type.


        }


    }


}

/**
 * 
 * @param {Squad} squad 
 * @param {number} squadSize 
 */
function findJoinPosition(squad, squadSize) {

    const leader = squad.leader

    let targetRoom = leader.room.name
    let joined = true;
    for (let f of squad.followers) {
        if (f.pos.getRangeTo(leader.pos) > 1) {
            joined = false
            break;
        }
    }
    if (joined) {
        return true;
    }


    let queue = [leader.pos]
    let searched = [leader.pos]
    let found = false;
    while (!found && queue.length) {
        let startPos = queue.shift()
        let openPositionCount = 1
        found = true;
        // Check open positions near startPos
        for (let x = startPos.x - 1; x <= startPos.x + 1; x++) {
            if (!found) {
                break;
            }
            for (let y = startPos.y - 1; y <= startPos.y + 1; y++) {
                if (x === 0 || x === 49 || y === 0 || y === 49) {

                    break;
                }

                let pos = new RoomPosition(x, y, leader.room.name)

                let lookCreeps = pos.lookFor(LOOK_CREEPS)

                for (let lo of lookCreeps) {
                    if (lo.creeps && squad.creeps.some(c => c.name === lo.creep.name)) {
                        openPositionCount++
                    } else {
                        next = true;
                    }
                }


            }
        }
    }

    for (let creep of followers){
        
    }
        

}

module.exports = manageSquads()