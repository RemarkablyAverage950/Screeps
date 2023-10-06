let MEMORY = require('memory');

class TerminalData {
    constructor(roomName, id, requests, surplus) {
        this.roomName = roomName;
        this.requests = requests;
        this.surplus = surplus;
        this.id = id;
    }
}

class ResourceRequest {
    constructor(id, resourceType, qty) {
        this.id = id;
        this.resourceType = resourceType;
        this.qty = qty;
    }
}

class ResourceSurplus {
    constructor(id, resourceType, qty) {
        this.id = id;
        this.resourceType = resourceType;
        this.qty = qty;
    }
}

const TARGET_ENERGY_AMOUNT = 600000;
const TARGET_RESOURCE_AMOUNT = 12000;

/**
 * Determines what resources each room needs and transfers between terminals.
 * If needed, sells and buys resources to and from the market.
 * @param {string[]} myRooms 
 */
function manageTerminals(myRooms) {
    if (Game.time % 10 !== 0) { return; }
    let data = [];
    let requests = [];
    let surplus = [];

    // Get Surplus
    for (let roomName of myRooms) {

        let room = Game.rooms[roomName];
        let terminal = room.terminal
        if (terminal && terminal.cooldown === 0) {


            let storage = room.storage
            if (!storage) continue;



            // Energy first.
            let energyStock = storage.store[RESOURCE_ENERGY] + terminal.store[RESOURCE_ENERGY]
            if (energyStock < TARGET_ENERGY_AMOUNT) {
                requests.push(new ResourceRequest(terminal.id, RESOURCE_ENERGY, TARGET_ENERGY_AMOUNT - energyStock))
            } else if (terminal.store[RESOURCE_ENERGY] > 0) {
                surplus.push(new ResourceSurplus(terminal.id, RESOURCE_ENERGY, terminal.store[RESOURCE_ENERGY]))
            }

            // Remaining resources.
            for (let r of RESOURCES_ALL) {
                if (r === RESOURCE_ENERGY) {
                    continue;
                }
                let resourceStock = terminal.store[r] + storage.store[r];
                if(r === RESOURCE_OXYGEN){

                    console.log('Oxygen in terminal',terminal.store[r])

                }
                if (resourceStock < TARGET_RESOURCE_AMOUNT) {
                    requests.push(new ResourceRequest(terminal.id, r, TARGET_RESOURCE_AMOUNT - resourceStock));
                } else if (resourceStock > TARGET_RESOURCE_AMOUNT) {
                    surplus.push(new ResourceSurplus(terminal.id, r, terminal.store[r]));
                }

            }
        }
    }

    // Largest to smallest
    surplus.sort((a, b) => b.qty - a.qty);
    requests.sort((a, b) => b.qty - a.qty);
    console.log('A', surplus.length, requests.length)
    for (let s of surplus) {
        for (let r of requests) {
            if (r.resourceType === s.resourceType) {

                const sendTerminal = Game.getObjectById(s.id);
                const recTerminal = Game.getObjectById(r.id);
                console.log('attempting: ' + r.qty + ' ' + r.resourceType + ' from ' + sendTerminal.pos.roomName + ' to ' + recTerminal.pos.roomName)
                let ret = sendTerminal.send(r.resourceType, Math.min(s.qty, r.qty), recTerminal.pos.roomName, 'Sending ' + r.qty + ' ' + r.resourceType + ' from ' + sendTerminal.pos.roomName + ' to ' + recTerminal.pos.roomName);
                console.log('ret:', ret)
                surplus = surplus.filter(_s => s.id !== _s.id && _s.id !== r.id);
                requests = requests.filter(_s => s.id !== _s.id && _s.id !== r.id);
            }
        }
    }
}



module.exports = manageTerminals;