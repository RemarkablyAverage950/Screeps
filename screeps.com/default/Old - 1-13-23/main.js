

/*
TODO: 
    work on autbuild

    make sure to only assign the workers needed to a project, not every worker

*/
let creepPaths = []

PRINT_CPU = false
let autoBuild = require('autobuild');
let roleWorker = require('role.worker');
let roleMiner = require('role.miner');
let roleRemoteHarvester = require('role.remoteharvester')
let roleSoldier = require('role.soldier')
let towers = require('towers')
let manageLinks = require('links')



const WORKER_BASE_PARTS = [WORK, CARRY, MOVE];
const MINER_BASE_PARTS = [MOVE, WORK, WORK];
const TRANSPORTER_BASE_PARTS = [CARRY, CARRY, MOVE]
const REMOTE_HARVESTER_BASE_PARTS = [WORK, CARRY, MOVE, MOVE]
const CLAIMER_BASE_PARTS = [CLAIM, MOVE]
const SOLDIER_BASE_PARTS = [TOUGH, ATTACK, ATTACK, MOVE, MOVE]
const MAX_WORKER_BLOCKS = 5



module.exports.loop = function () {
    var creepName = undefined;
    for (let name in Memory.creeps) {
        if (Game.creeps[name] == undefined) {
            delete Memory.creeps[name];
        }
    }
    creepPaths = creepPaths.filter(p => Game.getObjectById(p.id) != undefined)
    const allSpawns = Game.spawns
    
    const myRooms = _.filter(Game.rooms, function (r) { try { return r.controller.my } catch (e) { return false } });
    for (let room of myRooms) {
        generateCostMatrix(room)

        //console.log(room,wallTarget)
        var enemies = room.find(FIND_HOSTILE_CREEPS)
        if (enemies.length > 0) {
            roomDefense(room, enemies)
        }
        const creepCounts = _.countBy(room.find(FIND_MY_CREEPS), c => c.memory.role)
        const workers = creepCounts['worker'] || 0
        const upgraders = creepCounts['upgrader'] || 0
        const miners = creepCounts['miner'] || 0
        const builders = creepCounts['builder'] || 0
        const transporters = creepCounts['transporter'] || 0
        const remoteHarvesters = creepCounts['remoteHarvester'] || 0
        const claimers = creepCounts['claimer'] || 0
        const remoteBuilders = creepCounts['remoteBuilder'] || 0
        const soldiers = creepCounts['soldier'] || 0
        var body = undefined;
        
        var spawns = _.filter(allSpawns, function (s) {
            return s.room.name == room.name
        })
        
        if (spawns[0].memory.buildTimer > 0) {
            spawns[0].memory.buildTimer--
        } else {
            if (spawns[0].memory.baseType == 'bunker') {
                autoBuild(room)
            }
        }
        manageLinks(room, spawns)
        const sites = room.find(FIND_CONSTRUCTION_SITES)
        const storages = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)
        const towerCount = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER).length
        if (towerCount > 0) {
            towers(room)
        }
        var tasks = getTasks(room, spawns);
        var sources = Game.rooms[room.name].find(FIND_SOURCES);
        var workers_needed = Math.min(5, getWorkersNeeded(room, WORKER_BASE_PARTS, 12, MAX_WORKER_BLOCKS));
        var upgraders_needed = 1
        var miners_needed = 2 //getMinersReq(room)
        var builders_needed = 0
        var transporters_needed = 1 //getTransportersReq(room)
        var remoteHarvesters_needed = getRemoteHarvestersNeeded(spawns[0])
        var claimers_needed = 0
        var remoteBuilders_needed = 0
        var soldiers_needed = getSoldiersReq(spawns[0])
        if (towerCount == 0 || sites.length > 0) {
            builders_needed = 1
            workers_needed--
        }
        if (storages.length > 0) {
            transporters_needed = 1
            if (storages[0].store.getUsedCapacity(RESOURCE_ENERGY) > 50000) {
                workers_needed++
            }
        }
        if (spawns[0].memory.claimTarget != undefined) {
            let targetRoom = spawns[0].memory.claimTarget
            try {
                if (!Game.rooms[spawns[0].memory.claimTarget].controller.my) {
                    claimers_needed = 1
                } else {
                    remoteBuilders_needed = 4
                }
            } catch (e) { claimers_needed = 1 }
        }
        if (Game.flags.deconstruct != undefined) {
            remoteBuilders_needed = 1
        }
        let roomCreeps = []
        _.forEach(Game.creeps, function (creep) {
            if (creep.memory.home == room.name) roomCreeps.push(creep);
        })
        let energy = room.energyCapacityAvailable;
        manageCreepState(roomCreeps)
        assignTasks(tasks, roomCreeps, room, spawns)
        if (workers < workers_needed) {

            if (workers == 0) {
                body = buildBody(room.energyAvailable, WORKER_BASE_PARTS, MAX_WORKER_BLOCKS)
            } else {
                body = buildBody(energy, WORKER_BASE_PARTS, MAX_WORKER_BLOCKS)
            }

            for (let i = 0; i < workers_needed; i++) {
                creepName = room.name + '_Worker_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'worker',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        refill: true,
                        moving: true

                    }
                })
            }
        } else if (upgraders < upgraders_needed) {
            let controllerContainers = room.find(FIND_STRUCTURES).filter(c => {
                if (c.structureType != STRUCTURE_CONTAINER) {
                    return false
                }
                if (room.controller.pos.inRangeTo(c, 4)) {
                    return true
                }

            })
            if (controllerContainers.length > 0) {
                body = buildBody(energy - 150, [WORK], 8)
                body.push(CARRY)
                body.push(MOVE)
            } else {
                body = buildBody(energy, WORKER_BASE_PARTS, 4)
            }
            for (let i = 0; i < upgraders_needed; i++) {
                creepName = room.name + '_Upgrader_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'upgrader',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        refill: true,
                        moving: true

                    }
                })
            }
        } else if (miners < miners_needed) {
            body = buildBody(energy, MINER_BASE_PARTS, 3)
            for (let i = 0; i < miners_needed; i++) {
                creepName = room.name + '_Miner_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'miner',
                        home: room.name,
                        moving: true
                    }
                })
            }

        } else if (soldiers < soldiers_needed) {
            body = buildBody(energy, SOLDIER_BASE_PARTS)
            for (let i = 0; i < soldiers_needed; i++) {
                creepName = room.name + '_Soldier_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'soldier',
                        home: room.name,
                        targetRoom: spawns[0].memory.targetRoom,
                        moving: true
                    }
                })
            }


        } else if (builders < builders_needed) {
            body = buildBody(energy, WORKER_BASE_PARTS, 4)
            for (let i = 0; i < builders_needed; i++) {
                creepName = room.name + '_Builder_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'builder',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        refill: true,
                        moving: true

                    }
                })
            }
        } else if (transporters < transporters_needed) {
            body = buildBody(energy, TRANSPORTER_BASE_PARTS, 9)
            for (let i = 0; i < transporters_needed; i++) {
                creepName = room.name + '_Transporter_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'transporter',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        refill: true,
                        moving: true

                    }
                })
            }
        } else if (remoteHarvesters < remoteHarvesters_needed) {
            body = buildBody(energy, REMOTE_HARVESTER_BASE_PARTS, 8)
            let [rhTarget, rhRoom] = getRemoteHarvesterTarget(spawns[0])

            for (let i = 0; i < remoteHarvesters_needed; i++) {
                creepName = room.name + '_RemoteHarvester_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'remoteHarvester',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        rhTarget: rhTarget,
                        targetRoom: rhRoom,
                        refill: true,
                        moving: true

                    }
                })
            }
        } else if (claimers < claimers_needed) {
            if (Game.gcl.level > myRooms.length) {
                body = buildBody(energy, CLAIMER_BASE_PARTS, 1)
            } else body = buildBody(energy, CLAIMER_BASE_PARTS, 2)
            for (let i = 0; i < claimers_needed; i++) {
                creepName = room.name + '_Claimer_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'claimer',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        targetRoom: spawns[0].memory.claimTarget,
                        moving: true,
                        roomCount: myRooms.length

                    }
                })
            }
        } else if (remoteBuilders < remoteBuilders_needed) {
            body = buildBody(energy, REMOTE_HARVESTER_BASE_PARTS)
            for (let i = 0; i < remoteBuilders_needed; i++) {
                creepName = room.name + '_RemoteBuilder_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'remoteBuilder',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        targetRoom: spawns[0].memory.claimTarget,
                        refill: true,
                        moving: true
                    }
                })
            }
        }
        runCreeps(roomCreeps, creepPaths)
    }
    Memory.savedMatrix = undefined
    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }
}

function runCreeps(roomCreeps) {
    //console.log('RunCreeps')
    for (let creep of roomCreeps) {
        if (creep.memory.role == 'worker' || creep.memory.role == 'upgrader' || creep.memory.role == 'builder' || creep.memory.role == 'transporter') {
            roleWorker.run(creep, creepPaths)
        }
        if (creep.memory.role == 'miner') {
            roleMiner.run(creep)
        }
        if (creep.memory.role == 'remoteHarvester' || creep.memory.role == 'claimer' || creep.memory.role == 'remoteBuilder') {
            roleRemoteHarvester.run(creep)
        }
        if (creep.memory.role == 'soldier') {
            roleSoldier.run(creep)
        }

    }

}

function getRemoteHarvestersNeeded(spawn) {
    if (spawn.memory.remoteHarvestTargets == undefined) {
        return 0
    }
    let targets = JSON.parse(spawn.memory.remoteHarvestTargets)
    var count = 0
    for (let target of targets) {
        count += target.harvesters
    }
    return count
}

/**
 * Searches for a target to assign to a remote harvester at spawn.
 * @param {Spawn} spawn Main spawn in a room
 * @returns {[number,string]|undefined} The harvest target and target room name or undefined.
 */
function getRemoteHarvesterTarget(spawn) {
    let targets = JSON.parse(spawn.memory.remoteHarvestTargets)
    let harvesters = spawn.room.find(FIND_MY_CREEPS).filter(c => c.memory.role == 'remoteHarvester')
    var ret = undefined
    targets.forEach(t => {
        var hCount = 0
        harvesters.forEach(h => {
            if (h.memory.rhTarget == t.id) {
                hCount++
            }
        })
        if (hCount < t.harvesters) {
            ret = [t.id, t.room]
        }
    })
    return ret
}

function getSoldiersReq(spawn) {
    if (spawn.memory.targetRoom == undefined) {
        return 0
    }
    return 1
}

function getWallTarget(room) {
    const level = room.controller.level
    const exp = Math.log(20000000) / Math.log(8)
    return Math.max(1000000, level ** exp)
}

function findFunctionCPU(func, arg1, arg2, arg3, arg4, arg5) {
    const CPU = Game.cpu.getUsed()


    func(arg1, arg2, arg3, arg4, arg5)

    console.log('CPU for ' + func, Game.cpu.getUsed() - CPU)
}

function printCPU(lastCpu, line, roomName) {
    if (!PRINT_CPU) {
        return
    }
    const cpu = Math.round(Game.cpu.getUsed() * 100) / 100
    const segment = Math.round((cpu - lastCpu) * 100) / 100
    console.log('Segment: ' + segment, 'Total: ' + cpu, 'Line: ' + line, 'Room: ' + roomName)
    return cpu
}
/* 
    Inputs:
        targetType: Type of base part to measure (WORK, CARRY, MOVE, etc)
        target: # of base parts blocks needed
*/
function getWorkersNeeded(room, base_parts, target, maxBlocks) {
    // calculate cost of base parts
    var cost = 0
    for (let part of base_parts) {
        cost += getPartCost(part)
    }

    // calculate total spawn & extension capacity
    var capacity = room.energyCapacityAvailable

    // MAX A: calculate maximum number of base parts per creep based on energy capacity
    var creepMax = Math.min(maxBlocks, Math.floor(capacity / cost))

    return Math.ceil(target / creepMax)
}

function roomDefense(room, enemies) {
    const structures = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION || s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_TOWER)
    const safeMode = false

    structures.forEach(s => {
        if (s.hits / s.hitsMax < .5) {
            safeMode == true
        }
    })

    if (safeMode && room.controller.safeMode == undefined && room.controller.safeModeAvailable > 0) {
        console.log('Attempting to activate SafeMode')
        room.controller.activateSafeMode()
    }
}

function getTransportersReq(room) {
    let ret = 0
    let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE || (s.structureType == STRUCTURE_CONTAINER && s.pos.inRangeTo(room.controller, 4)))
    if (containers.length > 0) {
        ret++
    }
    let sources = room.find(FIND_SOURCES)
    let extractors = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTRACTOR)
    containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    let sourceContainers = []
    containers.forEach(c => {
        sources.forEach(s => {
            if (c.pos.isNearTo(s.pos)) {
                sourceContainers.push(c)
            }
        })
        if (extractors.length > 0) {
            if (c.pos.isNearTo(extractors[0].pos)) {
                sourceContainers.push(c)
            }
        }
    })
    let usedCapacity = 0
    sourceContainers.forEach(c => {
        usedCapacity += c.store.getUsedCapacity()
    })

    if (usedCapacity > 4000) {
        ret++
    }

    return 0
}

function getMinersReq(room) {
    let minersReq = 0
    let containers = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_CONTAINER);
        }
    });
    let sources = room.find(FIND_SOURCES)

    for (var source of sources) {
        for (var container of containers) {

            if (container.pos.isNearTo(source.pos)) {
                minersReq++
            }
        }
    }
    let extractors = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTRACTOR)
    let minerals = room.find(FIND_MINERALS)
    if (extractors.length > 0 && minerals[0].mineralAmount > 0) {
        for (var container of containers) {
            if (container.pos.isNearTo(extractors[0].pos)) {
                minersReq++
            }
        }
    }
    return minersReq
}

function getPartCost(part) {
    const map = [
        [WORK, 100],
        [CARRY, 50],
        [MOVE, 50],
        [CLAIM, 600],
        [ATTACK, 80],
        [TOUGH, 10]
    ];
    for (let i = 0; i < map.length; i++) {
        if (part == map[i][0]) {
            return map[i][1];
        }
    }
}

function buildBody(energy, parts, max) {



    let availableEnergy = energy
    let bodyArr = []
    let energyPerBlock = 0
    for (let part of parts) {
        energyPerBlock += getPartCost(part)
    }

    if (max == undefined) {
        while (availableEnergy >= energyPerBlock) {
            availableEnergy -= energyPerBlock
            for (let i = 0; i < parts.length; i++) {
                bodyArr.push(parts[i])
            }
        }
    } else {
        let loop = 0
        while (availableEnergy >= energyPerBlock && loop < max) {
            loop++
            availableEnergy -= energyPerBlock
            for (let i = 0; i < parts.length; i++) {
                bodyArr.push(parts[i])
            }
        }

    }

    var toughCount = 0
    var claimCount = 0
    var workCount = 0
    var carryCount = 0
    var attackCount = 0
    var rangedAttackCount = 0
    var healCount = 0
    var moveCount = 0

    for (let part of bodyArr) {
        if (part == TOUGH) {
            toughCount++
        } else if (part == CLAIM) {
            claimCount++
        } else if (part == WORK) {
            workCount++
        } else if (part == CARRY) {
            carryCount++
        } else if (part == ATTACK) {
            attackCount++
        } else if (part == RANGED_ATTACK) {
            rangedAttackCount++
        } else if (part == HEAL) {
            healCount++
        } else if (part == MOVE) {
            moveCount++
        }
    }
    var ret = []

    if (toughCount > 0) {
        for (let i = 0; i < toughCount; i++) {
            ret.push(TOUGH)
        }
    }
    if (claimCount > 0) {
        for (let i = 0; i < claimCount; i++) {
            ret.push(CLAIM)
        }
    }
    if (workCount > 0) {
        for (let i = 0; i < workCount; i++) {
            ret.push(WORK)
        }
    }
    if (carryCount > 0) {
        for (let i = 0; i < carryCount; i++) {
            ret.push(CARRY)
        }
    }
    if (attackCount > 0) {
        for (let i = 0; i < attackCount; i++) {
            ret.push(ATTACK)
        }
    }
    if (rangedAttackCount > 0) {
        for (let i = 0; i < rangedAttackCount; i++) {
            ret.push(RANGED_ATTACK)
        }
    }
    if (healCount > 0) {
        for (let i = 0; i < healCount; i++) {
            ret.push(HEAL)
        }
    }
    if (moveCount > 0) {
        for (let i = 0; i < moveCount; i++) {
            ret.push(MOVE)
        }
    }

    return ret
}



// figures out what tasks are needed and returns an array
/*
1. get total tasks needed for room
 
2. check currently assigned tasks, and remove them from the task list
    -if task is partially assigned (filling half a container), remove the assigned portion from the task 
 
4. if assigned tasks not on list of total tasks, remove from assigned tasks (i.e. spawn has regenerated itself)
 
3. return all unassigned tasks    
 
*/

function clearSpawnMemory() {
    Game.spawns['Spawn1'].memory.assignedTasks = undefined
}

function manageCreepState(roomCreeps) {
    for (let creep of roomCreeps) {
        //let fillLevel = creep.store.getUsedCapacity(RESOURCE_ENERGY) / creep.store.getCapacity(RESOURCE_ENERGY)
        if (creep.store.getUsedCapacity() == 0 && creep.memory.refill == false) {
            creep.memory.moving = true
            creep.memory.refill = true
            creep.memory.target = undefined
            creep.memory.task = undefined
        } else if (creep.store.getFreeCapacity() == 0 && creep.memory.refill == true) {
            creep.memory.moving = true
            creep.memory.refill = false
            creep.memory.target = undefined
            creep.memory.task = undefined
        }
        //creep.memory.lastPos = undefined
        let last = undefined
        if (creep.memory.lastPos != undefined) {


            last = JSON.parse(creep.memory.lastPos)

            if (last.length == 5) {
                last.shift()
            }

            if (last[0].x = creep.pos.x && last[0].y == creep.pos.y) {
                creep.memory.moving = false
            } else {
                creep.memory.moving = true
            }
        } else {
            last = []
        }

        last.push(creep.pos)
        creep.memory.lastPos = JSON.stringify(last)
        /*if (creep.memory.task == undefined && fillLevel > .5) {
            creep.memory.refill = false
            creep.memory.target = undefined
            creep.memory.task = undefined
        } else if (creep.memory.task == undefined && fillLevel < .5) {
            creep.memory.refill = true
            creep.memory.target = undefined
            creep.memory.task = undefined
        }*/


    }
}

class Task {
    constructor(id, type, creepId, qty, resource) {
        this.id = id
        this.type = type
        this.qty = qty
        this.creepId = creepId
        this.resource = resource

    }
    get obj() { return Game.getObjectById(this.id) }
}

function getTasks(room, spawns) {
    //Game.spawns['Spawn1'].memory.assignedTasks = undefined
    var assignedTasks = undefined
    var tasks = []
    // load in assigned tasks from memory
    if (spawns[0].memory.assignedTasks != undefined) {
        assignedTasks = JSON.parse(spawns[0].memory.assignedTasks)
    } else {
        assignedTasks = []
    }

    // get tasks
    const tombstones = room.find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
    const droppedResources = room.find(FIND_DROPPED_RESOURCES)
    tombstones.forEach(s => tasks.push(new Task(s.id, 'withdraw', undefined, s.store.getUsedCapacity(), undefined)))
    droppedResources.forEach(r => tasks.push(new Task(r.id, 'pickup', undefined, r.amount, r.resourceType)))

    const refill = room.find(FIND_MY_STRUCTURES).filter(s =>
        (s.structureType == STRUCTURE_SPAWN ||
            s.structureType == STRUCTURE_EXTENSION ||
            (s.structureType == STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 50)) &&
        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
    refill.forEach(s => tasks.push(new Task(s.id, 'transferTo', undefined, s.store.getFreeCapacity(RESOURCE_ENERGY), RESOURCE_ENERGY)))

    const sites = room.find(FIND_MY_CONSTRUCTION_SITES)
    sites.forEach(s => tasks.push(new Task(s.id, 'build', undefined, s.progressTotal - s.progress, RESOURCE_ENERGY)))
    var wallTarget = getWallTarget(room)
    var repairSites = room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART && s.structureType != STRUCTURE_ROAD)
    var wallSites = room.find(FIND_STRUCTURES).filter(s => (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < wallTarget)
    repairSites.forEach(s => tasks.push(new Task(s.id, 'repair', undefined, s.hitsMax - s.hits, RESOURCE_ENERGY)))
    wallSites.forEach(s => tasks.push(new Task(s.id, 'repair', undefined, s.hitsMax - s.hits, RESOURCE_ENERGY)))
    const sources = room.find(FIND_SOURCES)
    const containers = room.find(FIND_STRUCTURES).filter(c =>
        c.structureType == STRUCTURE_CONTAINER)
    sources.forEach(s => {
        for (let c of containers) {
            if (s.pos.isNearTo(c)) {
                tasks.push(new Task(s.id, 'mine', undefined, Infinity, RESOURCE_ENERGY))
            }
        }
    })
    const extractors = room.find(FIND_STRUCTURES).filter(c =>
        c.structureType == STRUCTURE_EXTRACTOR)
    if (extractors.length > 0) {
        const minerals = room.find(FIND_MINERALS)
        for (let c of containers) {
            if (c.pos.isNearTo(extractors[0].pos)) {
                tasks.push(new Task(minerals[0].id, 'mine', undefined, Infinity, minerals[0].mineralType))
            }
        }
    }
    // check if assignedTasks includes tasks

    for (let task of tasks) {
        for (let assignedTask of assignedTasks) {
            if (task.id == assignedTask.id && task.type == assignedTask.type) {
                task.qty -= assignedTask.qty
            }
        }
    }
    tasks = tasks.filter(t => t.qty > 0)
    return tasks
}
// assigns a task to any creep without one
/*
 
*/
function assignTasks(tasks, roomCreeps, room, spawns) {
    // containers: near sources, usedCapacity >100
    var sources = room.find(FIND_SOURCES)//.filter(s => s.energy > 200)
    var minerals = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_EXTRACTOR)
    var activeSources = sources.filter(s => s.energy > 200)
    var containers = room.find(FIND_STRUCTURES).filter(c => {
        if (c.structureType != STRUCTURE_CONTAINER) {
            return false
        }
        for (let s of sources) {
            if (s.pos.isNearTo(c)) {
                return true
            }
        }
        if (minerals.length > 0 && minerals[0].pos.isNearTo(c)) {
            return true
        }
    })
    var controllerContainers = room.find(FIND_STRUCTURES).filter(c => {
        if (c.structureType != STRUCTURE_CONTAINER) {
            return false
        }
        if (room.controller.pos.inRangeTo(c, 4)) {
            return true
        }

    })
    var controllerLinks = room.find(FIND_STRUCTURES).filter(c => {
        if (c.structureType != STRUCTURE_LINK) {
            return false
        }
        if (room.controller.pos.inRangeTo(c, 4)) {
            return true
        }

    })

    var storages = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)
    var baseLink = undefined
    if (spawns[0].memory.baseLink != undefined) {

        baseLink = Game.getObjectById(spawns[0].memory.baseLink)
        //containers.push(baseLink)
    }


    var assignedTasks = undefined
    if (spawns[0].memory.assignedTasks != undefined) {
        assignedTasks = JSON.parse(spawns[0].memory.assignedTasks)
    } else {
        assignedTasks = []
    }

    //harvest != undefined, splicing from assignedTasks
    for (let i = 0; i < assignedTasks.length; i++) {
        let creep = Game.getObjectById(assignedTasks[i].creepId)

        if (creep == null || creep.memory.target != assignedTasks[i].id) {
            assignedTasks.splice(i, 1)
            i--
        }
    }



    // modify sources available energy for assigned tasks

    var withdrawTasks = _.filter(tasks, {
        type: 'withdraw'
    })
    var pickupTasks = _.filter(tasks, {
        type: 'pickup'
    })
    var transferToTasks = _.filter(tasks, {
        type: 'transferTo'
    })
    var buildTasks = _.filter(tasks, {
        type: 'build'
    })
    var repairTasks = _.filter(tasks, {
        type: 'repair'
    })
    var availableSources = []
    for (let s of activeSources) {
        let x = s.pos.x
        let y = s.pos.y
        let area = room.lookAtArea(y - 1, x - 1, y + 1, x + 1, true)
        let count = 0

        area.forEach(t => {
            if (t.type == 'terrain' && t.terrain != 'wall') {
                count++
            }
        })

        let assignedCount = 0
        assignedTasks.forEach(t => {
            if (t.id == s.id) {
                assignedCount++
            }
        })
        // miners not assigned
        if (assignedCount <= count) {
            availableSources.push(s)
        }
    }

    for (let creep of roomCreeps) {
        //creep.memory.task = undefined
        //   creep.memory.target = undefined
        if (creep.memory.role == 'miner') {

            if (creep.memory.target == undefined) {

                const mineTasks = tasks.filter(t => t.type == 'mine')
                let mt = []
                mineTasks.forEach(m => {
                    let push = true
                    assignedTasks.forEach(t => {
                        if (t.id == m.id) {
                            push = false
                        }
                    })
                    if (push) {
                        mt.push(m)
                    }
                })
                if (mt.length == 0) {
                    continue
                }
                //console.log(mineTasks)
                let targetId = mt[0].id
                let type = 'mine'
                creep.memory.target = targetId
                creep.memory.task = type
                let task = new Task(targetId, type, creep.id, undefined, undefined)
                assignedTasks.push(task)
            }
            continue
        }
        if (creep.memory.role == 'remoteHarvester') {
            manageRemoteHarvester(creep)
            continue
        }
        if (creep.memory.role == 'claimer') {
            manageClaimer(creep)
            continue
        }
        if (creep.memory.role == 'remoteBuilder') {
            manageRemoteBuilder(creep)
            continue
        }
        let targetId = undefined
        if (creep.memory.refill && creep.memory.target == undefined) {
            if (creep.memory.role == 'upgrader' && controllerLinks.length > 0 && controllerLinks[0].store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
                creep.memory.target = controllerLinks[0].id
                creep.memory.task = 'withdraw'
                continue
            }
            if (creep.memory.role == 'upgrader' && controllerContainers.length > 0) {
                creep.memory.target = controllerContainers[0].id
                creep.memory.task = 'withdraw'
                continue
            }
            if (creep.memory.role == 'transporter') {
                //refill transporter

                var fullContainers = containers.filter(c => c.store.getFreeCapacity() < 200)

                if (fullContainers.length > 0) {
                    // pickup full containers
                    let target = _.min(fullContainers, c => c.store.getFreeCapacity())
                    targetId = target.id
                    let type = 'withdraw'
                    let qty = creep.store.getFreeCapacity()
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, creep.id, qty, Object.keys(target.store)[0])
                    assignedTasks.push(task)
                } else if (pickupTasks.length > 0) {
                    // pickup free resources
                    let po = []

                    pickupTasks.forEach(t => po.push(Game.getObjectById(t.id)))

                    let target = creep.pos.findClosestByPath(po, { ignoreCreeps: true })
                    if (target != null) {
                        targetId = target.id
                        let type = 'pickup'
                        let qty = creep.store.getFreeCapacity()
                        creep.memory.target = targetId
                        creep.memory.task = type
                        let task = new Task(targetId, type, creep.id, qty, target.resourceType)
                        assignedTasks.push(task)
                    }
                } else if (withdrawTasks.length > 0) {
                    //withdraw from tombstones
                    let wt = []
                    withdrawTasks.forEach(t => wt.push(Game.getObjectById(t.id)))
                    let target = creep.pos.findClosestByPath(wt, { ignoreCreeps: true })
                    targetId = target.id
                    let type = 'withdraw'
                    let qty = creep.store.getFreeCapacity()
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, creep.id, qty, Object.keys(target.store)[0])
                    assignedTasks.push(task)

                } else if (baseLink != undefined && baseLink.store.getFreeCapacity(RESOURCE_ENERGY) < 200) {
                    // withdraw from links
                    targetId = baseLink.id
                    let type = 'withdraw'
                    let qty = creep.store.getFreeCapacity()
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, creep.id, qty, RESOURCE_ENERGY)
                    assignedTasks.push(task)

                } else if (containers.length > 0) {
                    // withdraw from containers
                    let target = _.min(containers.filter(c => c.store.getUsedCapacity() > 100), c => { return c.store.getFreeCapacity() })
                    targetId = target.id
                    let type = 'withdraw'
                    let qty = creep.store.getFreeCapacity()
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, creep.id, qty)
                    assignedTasks.push(task)
                    continue
                }

            } else {
                //role not transporter
                // find valid container
                let energyNeeded = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                let availableContainers = []
                containers.forEach(c => {
                    let qty = c.store.getUsedCapacity(RESOURCE_ENERGY)
                    assignedTasks.forEach(at => {
                        if (c.id == at.id) {
                            qty -= at.qty
                        }
                    })
                    if (qty >= energyNeeded) {
                        availableContainers.push(c)
                    }
                })

                storages.forEach(c => {
                    let qty = c.store.getUsedCapacity(RESOURCE_ENERGY)
                    assignedTasks.forEach(at => {
                        if (c.id == at.id) {
                            qty -= at.qty
                        }
                    })
                    if (qty >= energyNeeded) {
                        availableContainers.push(c)
                    }
                })



                if (availableContainers.length > 0) {
                    // if we have a container to pull from
                    let target = creep.pos.findClosestByPath(availableContainers, { ignoreCreeps: true })
                    if (target == null) {
                        continue
                    }
                    targetId = target.id

                    let type = 'withdraw'
                    let qty = creep.store.getFreeCapacity()
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, creep.id, qty, RESOURCE_ENERGY)
                    assignedTasks.push(task)
                } else {
                    // harvest from source
                    let target = _.max(availableSources, function (s) {
                        let energy = s.energy
                        assignedTasks.forEach(at => {
                            if (s.id == at.id) {
                                energy -= at.energy
                            }
                        })
                        return energy
                    })
                    targetId = target.id
                    let type = 'harvest'
                    let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, creep.id, energy, RESOURCE_ENERGY)
                    assignedTasks.push(task)
                }
            }
        } else if (!creep.memory.refill && creep.memory.target == undefined) {
            // deliver
            if (creep.memory.role == 'transporter') {
                // may double stock if transporters > 1, *FIX* issue occurs when first transport fills container the 2nd is trying to deliver to

                let destinations = []
                storages.forEach(s => destinations.push(s))

                if (controllerContainers.length > 0 && controllerContainers[0].store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY) && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    destinations.push(controllerContainers[0])
                }
                if (destinations.length > 0) {
                    let target = _.min(destinations, d => d.store.getUsedCapacity())
                    creep.memory.target = target.id
                    let type = 'transferTo'
                    creep.memory.task = type

                    let task = new Task(target.id, type, creep.id, creep.store.getUsedCapacity(), Object.keys(creep.store)[0])
                    assignedTasks.push(task)
                    continue
                }
                //creep.pos.findClosestByPath(room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE && s.store.getFreeCapacity() > 0)).id
            }
            if (transferToTasks.length > 0 && (creep.memory.role == 'worker' || creep.memory.role == 'transporter') && creep.memory.target == undefined) {
                let ro = []
                transferToTasks.forEach(r => {
                    let obj = Game.getObjectById(r.id)
                    if (obj.structureType != STRUCTURE_TOWER) {
                        ro.push(obj)
                    } else if (obj.structureType == STRUCTURE_TOWER && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 500) {
                        ro.push(obj)
                    }
                })

                if (ro.length == 0) {
                    transferToTasks.forEach(r => ro.push(Game.getObjectById(r.id)))
                }

                let target = creep.pos.findClosestByPath(ro, { ignoreCreeps: false })
                if (target == null) {
                    continue
                }
                targetId = target.id
                let type = 'transferTo'
                let energy = creep.store.getUsedCapacity()
                creep.memory.target = targetId
                creep.memory.task = type
                let task = new Task(targetId, type, creep.id, energy, RESOURCE_ENERGY)
                assignedTasks.push(task)
                transferToTasks.shift()
            }
            if (buildTasks.length > 0 && (creep.memory.role == 'worker' || creep.memory.role == 'builder') && creep.memory.target == undefined) {
                let bt = []
                buildTasks.forEach(t => bt.push(Game.getObjectById(t.id)))
                let target = creep.pos.findClosestByPath(bt, { ignoreCreeps: true })
                if (target == null) {
                    continue
                }
                targetId = target.id
                let type = 'build'
                let energy = creep.store.getUsedCapacity(RESOURCE_ENERGY)
                creep.memory.target = targetId
                creep.memory.task = type
                let task = new Task(targetId, type, creep.id, energy, RESOURCE_ENERGY)
                assignedTasks.push(task)
                buildTasks.shift()

            }
            if (repairTasks.length > 0 && (creep.memory.role == 'builder' || creep.memory.role == 'worker') && creep.memory.target == undefined) {
                let rt = []
                repairTasks.forEach(t => rt.push(Game.getObjectById(t.id)))
                let target = _.min(rt, t => t.hits)
                targetId = target.id
                let type = 'repair'
                let energy = creep.store.getUsedCapacity(RESOURCE_ENERGY)
                creep.memory.target = targetId
                creep.memory.task = type
                let task = new Task(targetId, type, creep.id, energy, RESOURCE_ENERGY)
                assignedTasks.push(task)
                repairTasks.shift()

            }



            if (Memory.creeps[creep.name].task == undefined && creep.memory.role != 'transporter') {
                Memory.creeps[creep.name].task = 'controller'
                Memory.creeps[creep.name].target = room.controller.id
            }
        }
    }

    spawns[0].memory.assignedTasks = JSON.stringify(assignedTasks)


}
//a06f077240e9885
function manageRemoteHarvester(creep) {

    if (creep.room.name == creep.memory.home && creep.store.getUsedCapacity() == 0 && Game.rooms[creep.memory.home].find(FIND_MY_SPAWNS)[0].memory.targetRoom != undefined) {
        // if true, wait near border
        let structures = creep.room.find(FIND_STRUCTURES)
        let links = structures.filter(s => s.structureType == STRUCTURE_LINK)
        let target;
        if (links.length > 0) {
            target = creep.pos.findClosestByPath(links)

        } else {
            target = creep.pos.findClosestByPath(structures)
        }
        creep.moveTo(target)


        return
    }

    if (creep.room.name != creep.memory.home && creep.room.find(FIND_HOSTILE_CREEPS).length > 0) {
        //hostiles detected
        console.log(creep.name + 'detected hostiles in ' + creep.room.name)
        //return to home room
        let exitDir = creep.room.findExitTo(creep.memory.home)
        let exit = creep.pos.findClosestByPath(exitDir)
        creep.memory.target = JSON.stringify(exit)
        creep.memory.task = 'move'

        // set target room to current room 
        Game.rooms[creep.memory.home].find(FIND_MY_SPAWNS)[0].memory.targetRoom = creep.room.name
        return
    }

    if (creep.memory.refill) {
        //check if hostiles are detected in target room





        if (creep.room.name != creep.memory.targetRoom) {
            if (creep.memory.task != 'move' || creep.memory.target == undefined) {
                let exitDir = creep.room.findExitTo(creep.memory.targetRoom)
                let exit = creep.pos.findClosestByPath(exitDir)
                creep.memory.target = JSON.stringify(exit)
                creep.memory.task = 'move'
            }
        } else {
            creep.memory.target = creep.memory.rhTarget
            creep.memory.task = 'harvest'
        }
    } else {
        if (creep.room.name != creep.memory.home) {
            let exitDir = creep.room.findExitTo(creep.memory.home)
            let exit = creep.pos.findClosestByPath(exitDir)
            creep.memory.target = JSON.stringify(exit)
            creep.memory.task = 'move'
        } else {
            let links = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_LINK && s.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY))
            let closest = undefined
            let linkAllowed = true
            for (let resource in creep.carry) {
                if (resource != RESOURCE_ENERGY) {
                    linkAllowed = false
                }
            }
            if (linkAllowed && links.length > 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                closest = creep.pos.findClosestByPath(links)
            } else {


                let storages = creep.room.find(FIND_STRUCTURES).filter(s =>
                    (s.structureType == STRUCTURE_CONTAINER ||
                        s.structureType == STRUCTURE_STORAGE) &&
                    s.store.getFreeCapacity() >= creep.store.getUsedCapacity())

                closest = creep.pos.findClosestByPath(storages)
            }
            try {
                creep.memory.target = closest.id
            } catch (e) {
                console.log('error - did not find path to closest storage', creep.name, creep.pos)
            }
            creep.memory.task = 'transferTo'

        }
    }

}

function manageClaimer(creep) {
    if (creep.room.name != creep.memory.targetRoom) {
        if (creep.memory.target == undefined) {
            creep.memory.task = undefined
        } else {
            let target = creep.memory.target
            if (target.roomName != creep.room.name) {
                creep.memory.task = undefined
            }
        }

        if (creep.memory.task == undefined) {

            let exit = moveToTargetRoom(creep, creep.memory.targetRoom)
            creep.memory.target = JSON.stringify(exit)
            creep.memory.task = 'move'
        } else {
            let target = creep.memory.target
            if (target.roomName == creep.room.name) {

            }
        }

    } else {


        creep.memory.target = creep.room.controller.id
        if (creep.room.controller.level > 0) {
            creep.memory.task = 'attackController'
        }
        else if (Game.gcl.level <= creep.memory.roomCount) {
            creep.memory.task = 'reserve'
        }
        else {
            creep.memory.task = 'claim'
        }
        //creep.moveTo(creep.room.controller)

    }
}

function manageRemoteBuilder(creep) {
    if (Game.flags.deconstruct != undefined) {
        creep.memory.targetRoom = Game.flags.deconstruct.room.name

    }

    if (creep.room.name != creep.memory.targetRoom) {
        if (creep.memory.target == undefined) {
            creep.memory.task = undefined
        } else {
            let target = Game.getObjectById(creep.memory.target)
            try {
                if (target.pos.roomName != creep.room.name) {
                    creep.memory.task = undefined
                }
            } catch (e) { }
        }

        if (creep.memory.task == undefined) {

            let exit = moveToTargetRoom(creep, creep.memory.targetRoom)
            creep.memory.target = JSON.stringify(exit)
            creep.memory.task = 'move'
        }

    } else {
        var target = undefined
        if (Game.flags.deconstruct != undefined) {
            let structures = creep.room.lookForAt(LOOK_STRUCTURES, Game.flags.deconstruct.pos.x, Game.flags.deconstruct.pos.y)
            //console.log(JSON.stringify(look))
            if (structures.length == 0) {
                Game.flags.deconstruct.remove()
            }
            target = structures[0]

            //console.log(target)
            creep.memory.task = 'dismantle'
            creep.memory.target = structures[0].id

        } else {

            if (creep.room.find(FIND_MY_SPAWNS).length > 0) {
                let homeSpawn = Game.rooms[creep.memory.home].find(FIND_MY_SPAWNS)[0]
                creep.memory.home = creep.memory.targetRoom
                creep.memory.role = 'worker'
                homeSpawn.memory.claimTarget = undefined

            }

            if (creep.memory.refill == true && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.refill = false
            } else if (creep.memory.refill == false && creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
                creep.memory.refill = true
            }

            if (creep.memory.refill == false) {
                if (creep.memory.task != 'build') {
                    creep.memory.target = creep.room.find(FIND_CONSTRUCTION_SITES)[0].id
                    creep.memory.task = 'build'
                }
                //
            } else {
                let sources = creep.room.find(FIND_SOURCES).filter(s => s.energy > 0)
                let target = creep.pos.findClosestByPath(sources)
                if (target == null) {
                    return
                }
                let targetId = target.id
                if (creep.memory.target != targetId) {
                    let target = Game.getObjectById(targetId)
                    creep.moveTo(target)
                    creep.memory.target = target.id
                    creep.memory.task = 'harvest'
                }
            }
        }
    }
}

function moveToTargetRoom(creep, targetRoom) {
    var avoidRooms = []
    var avoidPos = []
    avoidRooms.push(creep.memory.avoidRoom)
    var hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
    for (let hostile of hostiles) {

        avoidPos.push(hostile.pos)
    }
    do {
        var route = Game.map.findRoute(creep.room, targetRoom, {
            routeCallback(roomName, fromRoomName) {
                if (avoidRooms.includes(roomName)) {    // avoid this room
                    return Infinity;
                }
                return 1;
            }
        });

        var exitDir = Game.rooms[creep.room.name].findExitTo(route[0].room)

        var exit = creep.pos.findClosestByPath(exitDir)
        var look = Game.rooms[creep.room.name].lookAt(exit.x, exit.y)  //(path.x,path.y)
        if (look.some(l => l.type == 'structure')) {
            avoidRooms.push(route[0].room)
        }
    } while (avoidRooms.includes(route[0].room))

    return pathToTarget(creep, exit)
}

function pathToTarget(creep, goal) {

    let ret = PathFinder.search(
        creep.pos, goal,
        {
            // We need to set the defaults costs higher so that we
            // can set the road cost lower in `roomCallback`
            plainCost: 2,
            swampCost: 10,

            roomCallback: function (roomName) {

                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since 
                // PathFinder supports searches which span multiple rooms 
                // you should be careful!
                if (!room) return;
                let costs = new PathFinder.CostMatrix;

                room.find(FIND_STRUCTURES).forEach(function (struct) {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        // Favor roads over plain tiles
                        costs.set(struct.pos.x, struct.pos.y, 1);
                    } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                        (struct.structureType !== STRUCTURE_RAMPART ||
                            !struct.my)) {
                        // Can't walk through non-walkable buildings
                        costs.set(struct.pos.x, struct.pos.y, 0xff);
                    }
                });

                // Avoid creeps in the room
                room.find(FIND_HOSTILE_CREEPS).forEach(function (hostile) {

                    let range = 4
                    for (let i = -range; i < range; i++) {
                        for (let j = -range; j < range; j++) {
                            costs.set(hostile.pos.x + i, hostile.pos.y + j, 0xff);
                        }
                    }
                });


                return costs;
            },
        }
    );
    return ret.path[ret.path.length - 1];
    //creep.move(creep.pos.getDirectionTo(pos));
}

function generateCostMatrix(room) {

    if (!Memory.savedMatrix) {
        Memory.savedMatrix = {}
    }
    if (!room) return;

    let costs = new PathFinder.CostMatrix;
    room.find(FIND_STRUCTURES).forEach(function (struct) {
        if (struct.structureType === STRUCTURE_ROAD) {
            // Favor roads over plain tiles
            costs.set(struct.pos.x, struct.pos.y, 1);
        } else if (struct.structureType !== STRUCTURE_CONTAINER &&
            (struct.structureType !== STRUCTURE_RAMPART ||
                !struct.my)) {
            // Can't walk through non-walkable buildings
            costs.set(struct.pos.x, struct.pos.y, 0xff);
        }
    });

    room.find(FIND_CONSTRUCTION_SITES).forEach(function (struct) {
        if (struct.structureType !== STRUCTURE_CONTAINER &&
            (struct.structureType !== STRUCTURE_RAMPART ||
                !struct.my)) {
            costs.set(struct.pos.x, struct.pos.y, 0xff);
        }
    })

    // Avoid creeps in the room
    room.find(FIND_MY_CREEPS).forEach(function (creep) {
        if (creep.memory.moving == false) {
            costs.set(creep.pos.x, creep.pos.y, 0xff);
        }
    });
    //Memory.savedMatrix = true

    Memory.savedMatrix[room.name] = costs.serialize();
}