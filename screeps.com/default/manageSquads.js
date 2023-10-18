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

        if (!squad.ready) {

            // Renew creeps until ticksToLive > 1400
            let ready = true;
            for (let creep of creeps) {
                if (creep.ticksToLive < 1400) {
                    ready = false;
                    if (!MEMORY.rooms[creep.memory.home].renewOrders.some(r => r === creep.id)) {
                        MEMORY.rooms[creep.memory.home].renewOrders.push(creep.id)
                    }

                    // See if an available spawn is trying to fill the renew order. Move to spawn and renew.

                }
            }
            squad.ready = ready;
        }
        if(squad.ready){

            // Make sure squad is joined
            let joined = true;
            for(let f of squad.followers){
                if(f.pos.getRangeTo(squad.leader.pos) > 1){
                    joined = false
                    break;
                }
            }
            if(!joined){
                // Leader finds an open position of appropriate size for squad and moves to it

                // Members move to leader

                continue;
            }
            
            // If not in target room, move to target room.

            // Do stuff based on squad type.


        }


    }


}

module.exports = manageSquads()