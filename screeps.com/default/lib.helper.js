let MEMORY = require('memory')

class Task {
    /**
     * @constructor
     * @param {string} type 
     */
    constructor(type) {
        this.type = type;
    };
};
class MoveTask extends Task {
    /**
     * @constructor
     * @param {RoomPosition} pos
     */
    constructor(pos) {
        super('MOVE');
        this.pos = pos;
    }
}

let helper = {
    /**
     * 
     * @param {Creep} creep 
     * @param {Creep} pushingCreep
     * @returns {boolean}
     */
    pushCreep: function (creep, pushingCreep) {
        let role = creep.memory.role
        if (role === 'miner' || role === 'remoteMiner' || role === 'claimer' || role === 'reserver' || role === 'hub') { // role === 'fastFiller
            return false
        }

        const bfArea = [
            [0, -1],
            [1, -1],
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1]
        ]


        let taskCreated = false;

        let task = MEMORY.rooms[creep.memory.home].creeps[creep.name] && MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks[0]
        if (task) {

            if (task.type === 'HARVEST' || task.type === 'DISMANTLE') {
                return false;
            }
            let targetID = MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks[0].id
            if (role === 'upgrader' && creep.store[RESOURCE_ENERGY] > 0) {
                targetID = creep.room.controller.id
            }
            if (targetID) {
                let target = Game.getObjectById(targetID)

                if (target) {
                    let avoid = [creep.pos.x, creep.pos.y]
                    let rangeToTarget = 3//creep.pos.getRangeTo(target);
                    let searched = [[creep.pos.x, creep.pos.y]];
                    let queue = [[creep.pos.x, creep.pos.y]];


                    while (queue.length) {

                        let valid = true;
                        let next = queue.shift();
                        if (next === avoid) { valid = false; }
                        const pos = new RoomPosition(next[0], next[1], target.room.name);

                        const look = pos.look(pos);
                        for (let l of look) {

                            if (l.type === LOOK_STRUCTURES) {
                                if (l.structure.structureType !== STRUCTURE_CONTAINER && l.structure.structureType !== STRUCTURE_ROAD)
                                    valid = false;
                                break;
                            } else if (l.type === LOOK_CONSTRUCTION_SITES) {
                                if (l.constructionSite.structureType !== STRUCTURE_ROAD && l.constructionSite.structureType !== STRUCTURE_CONTAINER) {
                                    valid = false;
                                    break;
                                }
                            } else if (l.type === LOOK_TERRAIN && l.terrain === 'wall') {
                                valid = false;
                                break;
                            } else if (l.type === LOOK_CREEPS && l.creep.my) {

                                let lookCreep = l.creep
                                if (lookCreep.name === creep.name || lookCreep.name === pushingCreep.name) { // 
                                    valid = false;
                                    break;
                                } else if (!MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name].moving) {
                                    valid = false;
                                    break;
                                }

                            }

                        }

                        if (valid) {
                            taskCreated = true;
                            MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks.unshift(new MoveTask(pos))
                            //console.log('Pushing', creep.name, JSON.stringify(creep.pos), 'to', JSON.stringify(pos))
                            return true;
                        }


                        for (let n of bfArea) {
                            let nx = next[0] + n[0];
                            let ny = next[1] + n[1];

                            if (nx === 0 || nx === 49 || ny === 0 || ny === 49) {
                                continue
                            }

                            let nPos = new RoomPosition(nx, ny, creep.room.name)
                            if (nPos.getRangeTo(target) > rangeToTarget) {
                                continue;
                            }
                            if (searched.some(p => p[0] === nx && p[1] === ny)) {
                                continue;
                            }


                            searched.push([nx, ny])
                            queue.push([nx, ny])

                        }


                    }
                }
            }
        }
        //console.log('Attempting parkTask on', creep.name)
        MEMORY.rooms[creep.memory.home].creeps[creep.name].tasks.unshift(helper.parkTask(creep.room, creep, true, pushingCreep))

        taskCreated = true;
        return taskCreated

    },

    /**
    * 
    * @param {Room} room 
    * @param {Creep} creep 
    * @param {boolean} avoidCurrentPosition
    * @returns {MoveTask}
    */
    parkTask: function (room, creep, avoidCurrentPosition = false, pushingCreep = undefined) {

        let range = 0;
        let xStart = creep.pos.x;
        let yStart = creep.pos.y;


        let avoidPos = [];
        if (avoidCurrentPosition) {
            if (pushingCreep) {
                avoidPos.push([pushingCreep.pos.x, pushingCreep.pos.y])
            }
            avoidPos.push([creep.pos.x, creep.pos.y])
        }

        if (creep.memory.home === room.name && MEMORY.rooms[room.name].links) {
            let spawnLink = Game.getObjectById(MEMORY.rooms[room.name].links.spawn)
            if (spawnLink) {
                let pos = spawnLink.pos
                avoidPos.push([pos.x + 1, pos.y + 1])
                avoidPos.push([pos.x + 1, pos.y - 1])
                avoidPos.push([pos.x - 1, pos.y + 1])
                avoidPos.push([pos.x - 1, pos.y - 1])

            }
        }

        while (range < 40) {
            for (let x = xStart - range; x <= xStart + range; x++) {
                for (let y = yStart - range; y <= yStart + range; y++) {

                    if (x < 1 || x > 48 || y < 1 || y > 48) {
                        continue;
                    }
                    let valid = true;
                    if (avoidPos.length) {
                        for (let p of avoidPos) {
                            if (p[0] === x && p[1] === y) {
                                valid = false;
                                break;
                            }
                        }
                    }
                    if (!valid) {
                        continue;
                    }

                    const pos = new RoomPosition(x, y, room.name);

                    const look = pos.look(pos);

                    for (let l of look) {

                        if (l.type === LOOK_STRUCTURES || l.type === LOOK_CONSTRUCTION_SITES) {
                            valid = false;
                            break;
                        } else if (l.type === LOOK_TERRAIN && l.terrain === 'wall') {
                            valid = false;
                            break;
                        } else if (l.type === LOOK_CREEPS && l.creep.name != creep.name) {
                            let lookCreep = l.creep
                            if (!lookCreep.my || !MEMORY.rooms[lookCreep.memory.home] || !MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name] || !MEMORY.rooms[lookCreep.memory.home].creeps[lookCreep.name].moving) {
                                valid = false;
                            }
                        }

                    }



                    if (valid) {

                        if (range === 0) {
                            MEMORY.rooms[creep.memory.home].creeps[creep.name].moving = false;
                            return undefined;
                        }

                        return new MoveTask(pos);

                    }

                }
            }
            range++;
        }

    },

}

module.exports = helper;