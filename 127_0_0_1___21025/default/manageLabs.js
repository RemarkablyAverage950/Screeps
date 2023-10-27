let MEMORY = require('memory')

class Reaction {
    constructor(lab1, lab2, reagent1, reagent2, product, qty, productLabs) {
        this.complete = false;
        this.emptied = false;
        this.loaded = false;
        this.finished = false
        this.qty = qty;
        this.lab1 = lab1
        this.lab2 = lab2;
        this.reagent1 = reagent1;
        this.reagent2 = reagent2;
        this.product = product;
        this.productLabs = productLabs
    }
}

/**
 * 
 * @param {Room} room 
 */
function manageLabs(room) {
    if (room.controller.level < 6) {
        return;
    }
    const storage = room.storage
    if (!storage) {
        return;
    }
    const labs = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_LAB)
    if (labs.length < 3) {
        return;
    }
    if (!MEMORY.reagentTable) {
        getReagentsTable()
    }
    if (!MEMORY.rooms[room.name].labs) {
        MEMORY.rooms[room.name].labs = { labCount: 0 }
    }
    let centerLabs = [];
    if (!MEMORY.rooms[room.name].labs.reaction || MEMORY.rooms[room.name].labs.reaction.complete || labs.length !== MEMORY.rooms[room.name].labs.labCount) {

        if (labs.length !== MEMORY.rooms[room.name].labs.labCount) {
            centerLabs = []


            for (let lab of labs) {
                if (centerLabs.length === 2) {
                    break;
                }
                let center = true;
                for (let _lab of labs) {
                    if (lab.id === _lab.id) {
                        continue;
                    }
                    if (lab.pos.getRangeTo(_lab) > 2) {
                        center = false;
                        break;
                    }
                }
                if (center) {
                    centerLabs.push(lab.id);
                }
            }

            if (centerLabs.length !== 2) {
                return;
            }

            MEMORY.rooms[room.name].labs.labCount = labs.length;
            MEMORY.rooms[room.name].labs.c1 = centerLabs[0];
            MEMORY.rooms[room.name].labs.c2 = centerLabs[1];
        } else {
            centerLabs.push(MEMORY.rooms[room.name].labs.c1)
            centerLabs.push(MEMORY.rooms[room.name].labs.c2)
        }

        // Get reaction
        let hauler = room.find(FIND_MY_CREEPS).filter(c => c.role === 'hauler')[0]
        for (let resource of REACTION_PRIORITY) {
            if (storage.store[resource] < TARGET_T3_QTY) {
                // Find highest reaction we can make for this resource.

                let product = findReaction(room, resource, labs, hauler)
                if (product) {
                    let productLabs = []

                    for (let lab of labs) {
                        if (!centerLabs.includes(lab.id)) {
                            productLabs.push(lab.id)
                        }
                    }
                    let reagents = MEMORY.reagentTable[product]


                    let qty = TARGET_QTY
                    let actualQty = storage.store[product]
                    if (hauler) {
                        actualQty += hauler.store[product]
                    }
                    for (let lab of labs) {
                        actualQty += lab.store[product]
                    }
                    if (product === resource) { qty = TARGET_T3_QTY }
                    MEMORY.rooms[room.name].labs.reaction = new Reaction(
                        centerLabs[0],
                        centerLabs[1],
                        reagents[0],
                        reagents[1],
                        product,
                        Math.max(5,Math.min(qty - actualQty, 3000)),
                        productLabs
                    )

                    console.log(room.name, 'created reaction mission for', Math.max(5,Math.min(qty - actualQty, 3000)), product)
                    break;
                }

            }
        }


    }

    if (MEMORY.rooms[room.name].labs.reaction && !MEMORY.rooms[room.name].labs.reaction.complete) {
        let reaction = MEMORY.rooms[room.name].labs.reaction
        
        if (reaction.finished) {
            for (let lab of labs) {
                if (lab.mineralType) {
                    return;
                }
            }
            reaction.complete = true;
        }
        // Check if target qty reached
        let productQty = 0
        for (let lab of labs) {
            productQty += lab.store[reaction.product]
        }
        if (productQty >= reaction.qty) {
            reaction.finished = true; // finished reacting
            reaction.reagent1 = undefined
            reaction.reagent2 = undefined
            reaction.emptied = false;
            return;
        }



        // Check if still needs to be emptied

        if (!reaction.emptied) {
            for (let lab of labs) {
                let mineralType = lab.mineralType
                if (!mineralType) {
                    continue;
                }
                if (lab.id === reaction.lab1) {
                    if (mineralType !== reaction.reagent1) {
                        return;
                    }
                } else if (lab.id === reaction.lab2) {
                    if (mineralType !== reaction.reagent2) {
                        return;
                    }
                } else if (mineralType) {
                    return;
                }
            }
            reaction.emptied = true;
        }


        let lab1 = Game.getObjectById(reaction.lab1)
        let lab2 = Game.getObjectById(reaction.lab2)

        if (!reaction.loaded) {

            if (lab1.store[reaction.reagent1] < reaction.qty) return;

            if (lab2.store[reaction.reagent2] < reaction.qty) return;

            reaction.loaded = true;
        }

        for (let id of reaction.productLabs) {
            let lab = Game.getObjectById(id)

            if (lab.cooldown) {
                return;
            }
            let ret = lab.runReaction(lab1, lab2)
            if (ret !== 0 && ret !== -11) {

                //console.log(room.name, 'reaction failed', JSON.stringify(reaction), 'with code', ret)
                reaction.finished = true;
                reaction.reagent1 = undefined
                reaction.reagent2 = undefined
                reaction.emptied = false;
                break;

            }

        }




    }
}

/**
 * 
 * @param {Room} room
 * @param {MineralConstant | MineralCompoundConstant} resource 
 * @param {StructureLab[]} labs
 * @param {Creep} hauler
 * @returns {MineralConstant | MineralCompoundConstant}
 */
function findReaction(room, resource, labs, hauler) {
    if (!MEMORY.reagentTable[resource]) {
        return undefined;
    }

    let available = true;

    for (let r of MEMORY.reagentTable[resource]) {
        let qty = 0;

        if (room.storage) {
            qty += room.storage.store[r];
        }
        if (hauler) {
            qty += hauler.store[r];
        }
        for (let lab of labs) {
            qty += lab.store[r];
        }

        if (qty < 3000) {
            available = false;
            const product = findReaction(room, r, labs, hauler);
            if (product) {
                return product;
            }else{
                //break;
            }
        }
    }

    return available ? resource : undefined;


}

const TARGET_QTY = 3000;
const TARGET_T3_QTY = 10000;

const REACTION_PRIORITY = [
    RESOURCE_GHODIUM,
    RESOURCE_CATALYZED_UTRIUM_ACID,
    RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
    RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
    RESOURCE_CATALYZED_GHODIUM_ACID,
    RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
    RESOURCE_CATALYZED_ZYNTHIUM_ACID,
    RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
    RESOURCE_CATALYZED_LEMERGIUM_ACID,
    RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
    RESOURCE_CATALYZED_KEANIUM_ACID,
]

function getReagentsTable() {
    let obj = {}
    let keys = Object.keys(REACTIONS)
    for (let reagent1 of keys) {
        let _keys = Object.keys(REACTIONS[reagent1])
        for (let reagent2 of _keys) {
            let result = REACTIONS[reagent1][reagent2]
            if (!obj[result]) {
                obj[result] = [reagent1, reagent2]
            }
        }
    }
    MEMORY.reagentTable = obj
}

/*
const REAGENTS = {
    OH: [RESOURCE_HYDROGEN,RESOURCE_OXYGEN],
    LH: [RESOURCE_HYDROGEN,RESOURCE_LEMERGIUM],
    KH: [RESOURCE_HYDROGEN,RESOURCE_KEANIUM],
    UH: [RESOURCE_HYDROGEN,RESOURCE_UTRIUM],
    ZH: [RESOURCE_HYDROGEN,RESOURCE_ZYNTHIUM],
    GH: [RESOURCE_HYDROGEN,RESOURCE_GHODIUM],
    LO: [RESOURCE_LEMERGIUM,RESOURCE_OXYGEN],
    KO: [RESOURCE_KEANIUM,RESOURCE_OXYGEN],

}*/

module.exports = manageLabs;