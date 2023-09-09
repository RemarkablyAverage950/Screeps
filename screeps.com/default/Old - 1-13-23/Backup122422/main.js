/*
TODO: 
    work on autbuild

    make sure to only assign the workers needed to a project, not every worker

*/
var creepPaths = []

PRINT_CPU = false
let autoBuild = require('autobuild');
let roleWorker = require('role.worker');
let roleMiner = require('role.miner');
let roleRemoteHarvester = require('role.remoteharvester')
let towers = require('towers')
let manageLinks = require('links')


const WORKER_BASE_PARTS = [WORK, CARRY, MOVE];
const MINER_BASE_PARTS = [MOVE, WORK, WORK];
const TRANSPORTER_BASE_PARTS = [CARRY, CARRY, MOVE]
const REMOTE_HARVESTER_BASE_PARTS = [WORK, CARRY, MOVE, MOVE]
const CLAIMER_BASE_PARTS = [CLAIM, MOVE]
const MAX_WORKER_BLOCKS = 5

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

function getRemoteHarvesterTarget(spawn, harvesters) {
    let targets = JSON.parse(spawn.memory.remoteHarvestTargets)
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

module.exports.loop = function () {
    //clearSpawnMemory()
    var creepName = undefined;
    // Delete memory of creeps not in game world
    for (let name in Memory.creeps) {
        if (Game.creeps[name] == undefined) {
            delete Memory.creeps[name];
        }
    }
    let spliceIdx = []

    creepPaths.forEach(function (p, i) {
        if (Game.getObjectById(p.id) == undefined) {
            spliceIdx.push(i)
        }
    });
    if (spliceIdx.length > 0) {
        //console.log('removing '+creepPaths[spliceIdx[0]].id)
        creepPaths.splice(spliceIdx[0], 1)
    }


    //console.log(creepPaths.length)
    var lastCpu = printCPU(0, 80, 'main')


    const myRooms = _.filter(Game.rooms, function (r) { try { return r.controller.my } catch (e) { return false } });
    for (let room of myRooms) {
        generateCostMatrix(room)
        //console.log(room,wallTarget)
        var enemies = room.find(FIND_HOSTILE_CREEPS)
        if (enemies.length > 0) {
            roomDefense(room, enemies)
        }
        lastCpu = printCPU(lastCpu, 95, room.name)
        var workers = [];
        var upgraders = [];
        var miners = [];
        var builders = [];
        var transporters = [];
        var remoteHarvesters = [];
        var claimers = [];
        var remoteBuilders = []
        var body = undefined;

        var spawns = _.filter(Game.spawns, function (s) {
            return Game.spawns[s.name].pos.roomName == room.name;
        })
        if (spawns.length == 0) {
            //buildSpawn(room)
            continue
        }
        lastCpu = printCPU(lastCpu, 116, room.name)
        if (spawns[0].memory.buildTimer > 0) {
            spawns[0].memory.buildTimer--
        } else {
            if (spawns[0].memory.baseType == 'bunker') {
                autoBuild(room)
            }
        }
        lastCpu = printCPU(lastCpu, 124, room.name)
        manageLinks(room, spawns)
        lastCpu = printCPU(lastCpu, 126, room.name)

        const sites = room.find(FIND_CONSTRUCTION_SITES)
        const storages = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)
        const towerCount = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_TOWER).length
        lastCpu = printCPU(lastCpu, 131, room.name)
        if (towerCount > 0) {
            towers(room)
        }
        lastCpu = printCPU(lastCpu, 135, room.name)
        var tasks = getTasks(room, spawns);

        var sources = Game.rooms[room.name].find(FIND_SOURCES);
        var workers_needed = Math.min(5, getWorkersNeeded(room, WORKER_BASE_PARTS, 12, MAX_WORKER_BLOCKS));
        lastCpu = printCPU(lastCpu, 140, room.name)
        var upgraders_needed = 1
        var miners_needed = getMinersReq(room)
        lastCpu = printCPU(lastCpu, 143, room.name)
        var builders_needed = 0
        var transporters_needed = getTransportersReq(room)
        lastCpu = printCPU(lastCpu, 146, room.name)
        var remoteHarvesters_needed = getRemoteHarvestersNeeded(spawns[0])
        lastCpu = printCPU(lastCpu, 148, room.name)
        var claimers_needed = 0
        var remoteBuilders_needed = 0
        if (towerCount == 0 || sites.length > 0) {
            builders_needed = 1
        }
        if (storages.length > 0) {
            transporters_needed = 1
            if (storages[0].store.getUsedCapacity(RESOURCE_ENERGY) > 50000) {
                workers_needed++
            }
        }
        //console.log(room.name,workers_needed)
        if (spawns[0].memory.claimTarget != undefined) {
            if (!Game.rooms[spawns[0].memory.claimTarget].controller.my) {
                claimers_needed = 1
            } else {
                remoteBuilders_needed = 4
            }
        }
        lastCpu = printCPU(lastCpu, 168, room.name)
        let roomCreeps = []
        _.forEach(Game.creeps, function (creep) {
            if (creep.memory.home == room.name) roomCreeps.push(creep);
        })
        lastCpu = printCPU(lastCpu, 173, room.name)
        let energy = room.energyCapacityAvailable;
        manageCreepState(roomCreeps)
        lastCpu = printCPU(lastCpu, 176, room.name)
        assignTasks(tasks, roomCreeps, room, spawns)
        lastCpu = printCPU(lastCpu, 178, room.name)
        for (let creep of roomCreeps) {
            if (creep.memory.role == 'worker') {
                workers.push(creep)
            }
            if (creep.memory.role == 'upgrader') {
                upgraders.push(creep)
            }
            if (creep.memory.role == 'miner') {
                miners.push(creep)
            }
            if (creep.memory.role == 'builder') {
                builders.push(creep)
            }
            if (creep.memory.role == 'transporter') {
                transporters.push(creep)
            }
            if (creep.memory.role == 'remoteHarvester') {
                remoteHarvesters.push(creep)
            }
            if (creep.memory.role == 'claimer') {
                claimers.push(creep)
            }
            if (creep.memory.role == 'remoteBuilder') {
                remoteBuilders.push(creep)
            }
        }
        lastCpu = printCPU(lastCpu, 205, room.name)
        if (workers.length < workers_needed) {

            if (workers.length == 0) {
                body = buildBody(room.energyAvailable, WORKER_BASE_PARTS, MAX_WORKER_BLOCKS)
            } else {
                body = buildBody(energy, WORKER_BASE_PARTS, MAX_WORKER_BLOCKS)
            }
            for (let i = 0; i < workers_needed; i++) {
                creepName = room.name + '_Worker_' + i
                Game.spawns[spawns[0].name].spawnCreep(body, creepName, {
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
        } else if (upgraders.length < upgraders_needed) {
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
        } else if (miners.length < miners_needed) {
            body = buildBody(energy, MINER_BASE_PARTS, 3)
            for (let i = 0; i < miners_needed; i++) {
                creepName = room.name + '_Miner_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'miner',
                        home: room.name
                    }
                })
            }

        } else if (builders.length < builders_needed) {
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
        } else if (transporters.length < transporters_needed) {
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
        } else if (remoteHarvesters.length < remoteHarvesters_needed) {
            body = buildBody(energy, REMOTE_HARVESTER_BASE_PARTS, 8)
            let [rhTarget, rhRoom] = getRemoteHarvesterTarget(spawns[0], remoteHarvesters)

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
        } else if (claimers.length < claimers_needed) {
            body = buildBody(energy, CLAIMER_BASE_PARTS, 1)


            for (let i = 0; i < claimers_needed; i++) {
                creepName = room.name + '_Claimer_' + i
                spawns[0].spawnCreep(body, creepName, {
                    memory: {
                        role: 'claimer',
                        home: room.name,
                        task: undefined,
                        target: undefined,
                        targetRoom: spawns[0].memory.claimTarget,
                        moving: true
                    }
                })
            }
        } else if (remoteBuilders.length < remoteBuilders_needed) {
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
        lastCpu = printCPU(lastCpu, 351, room.name)
        runCreeps(roomCreeps, creepPaths)
        lastCpu = printCPU(lastCpu, 353, room.name)
    }
    Memory.savedMatrix = undefined
    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }
    lastCpu = printCPU(lastCpu, 359, 'main')
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

    }

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
    let containers = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE || (s.structureType == STRUCTURE_CONTAINER && s.pos.inRangeTo(room.controller, 4)))
    if (containers.length > 0) {
        return 1
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

class Task {
    constructor(id, type, energy, creepId) {
        this.id = id
        this.type = type
        this.energy = energy
        this.creepId = creepId
    }
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
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 && creep.memory.refill == false) {
            creep.memory.refill = true
            creep.memory.target = undefined
            creep.memory.task = undefined
        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0 && creep.memory.refill == true) {
            creep.memory.refill = false
            creep.memory.target = undefined
            creep.memory.task = undefined
        }

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
    tombstones.forEach(s => tasks.push(new Task(s.id, 'withdraw', s.store.getUsedCapacity(RESOURCE_ENERGY))))
    droppedResources.forEach(r => tasks.push(new Task(r.id, 'pickup', r.amount)))

    const refill = room.find(FIND_MY_STRUCTURES).filter(s =>
        (s.structureType == STRUCTURE_SPAWN ||
            s.structureType == STRUCTURE_EXTENSION ||
            (s.structureType == STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 50)) &&
        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
    refill.forEach(s => tasks.push(new Task(s.id, 'transferTo', s.store.getFreeCapacity(RESOURCE_ENERGY))))

    const sites = room.find(FIND_MY_CONSTRUCTION_SITES)
    sites.forEach(s => tasks.push(new Task(s.id, 'build', s.progressTotal - s.progress)))
    var wallTarget = getWallTarget(room)
    var repairSites = room.find(FIND_STRUCTURES).filter(s => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART)
    var wallSites = room.find(FIND_STRUCTURES).filter(s => (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART) && s.hits < wallTarget)
    repairSites.forEach(s => tasks.push(new Task(s.id, 'repair', s.hitsMax - s.hits)))
    wallSites.forEach(s => tasks.push(new Task(s.id, 'repair', s.hitsMax - s.hits)))

    // check if assignedTasks includes tasks

    for (let task of tasks) {
        for (let assignedTask of assignedTasks) {
            if (task.id == assignedTask.id && task.type == assignedTask.type) {
                task.energy -= assignedTask.energy
            }
        }
    }
    tasks = tasks.filter(t => t.energy > 0)
    return tasks
}
// assigns a task to any creep without one
/*
 
*/
function assignTasks(tasks, roomCreeps, room, spawns) {

    var sources = room.find(FIND_SOURCES)//.filter(s => s.energy > 200)
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
    })
    var controllerContainers = room.find(FIND_STRUCTURES).filter(c => {
        if (c.structureType != STRUCTURE_CONTAINER) {
            return false
        }
        if (room.controller.pos.inRangeTo(c, 4)) {
            return true
        }

    })

    var storages = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_STORAGE)

    if (spawns[0].memory.baseLink != undefined) {

        let baseLink = Game.getObjectById(spawns[0].memory.baseLink)
        containers.push(baseLink)
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

        if (creep == null || creep.memory.task != assignedTasks[i].type) {
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

        area.forEach(s => {
            if (s.type == 'terrain' && s.terrain != 'wall') {
                count++
            }
        })
        let assignedCount = 0
        assignedTasks.forEach(t => {
            if (t.id == s.id) {
                assignedCount++
            }
        })
        if (assignedCount <= count) {
            availableSources.push(s)
        }
    }

    for (let creep of roomCreeps) {
        if (creep.memory.role == 'miner') {
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

            if (creep.memory.role == 'upgrader' && controllerContainers.length > 0) {
                creep.memory.target = controllerContainers[0].id
                creep.memory.task = 'withdraw'
                continue
            }
            if (creep.memory.role == 'transporter') {


                var fullContainers = containers.filter(c => c.store.getFreeCapacity(RESOURCE_ENERGY) < 200)

                if (fullContainers.length > 0) {

                    targetId = _.min(fullContainers, c => c.store.getFreeCapacity(RESOURCE_ENERGY)).id
                    let type = 'withdraw'
                    let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, energy, creep.id)
                    assignedTasks.push(task)
                } else if (pickupTasks.length > 0) {
                    let po = []

                    pickupTasks.forEach(t => po.push(Game.getObjectById(t.id)))

                    let target = creep.pos.findClosestByPath(po, { ignoreCreeps: true })
                    if (target != null) {
                        targetId = target.id
                        let type = 'pickup'
                        let energy = creep.store.getFreeCapacity(target.resourceType)
                        creep.memory.target = targetId
                        creep.memory.task = type
                        let task = new Task(targetId, type, energy, creep.id)
                        assignedTasks.push(task)
                    }
                } else if (withdrawTasks.length > 0) {
                    let wt = []
                    withdrawTasks.forEach(t => wt.push(Game.getObjectById(t.id)))
                    targetId = creep.pos.findClosestByPath(wt, { ignoreCreeps: true }).id
                    let type = 'withdraw'
                    let energy = creep.store.getFreeCapacity()
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, energy, creep.id)
                    assignedTasks.push(task)

                } else if (containers.length > 0) {

                    targetId = _.min(containers.filter(c => c.store.getUsedCapacity(RESOURCE_ENERGY) > 100), c => c.store.getFreeCapacity(RESOURCE_ENERGY)).id
                    let type = 'withdraw'
                    let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, energy, creep.id)
                    assignedTasks.push(task)
                    continue
                }

            } else {

                // find valid container
                let energyNeeded = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                let availableContainers = []
                containers.forEach(c => {
                    let energy = c.store.getUsedCapacity(RESOURCE_ENERGY)
                    assignedTasks.forEach(at => {
                        if (c.id == at.id) {
                            energy -= at.energy
                        }
                    })
                    if (energy >= energyNeeded) {
                        availableContainers.push(c)
                    }
                })
                if (creep.memory.role != 'transporter') {
                    storages.forEach(c => {
                        let energy = c.store.getUsedCapacity(RESOURCE_ENERGY)
                        assignedTasks.forEach(at => {
                            if (c.id == at.id) {
                                energy -= at.energy
                            }
                        })
                        if (energy >= energyNeeded) {
                            availableContainers.push(c)
                        }
                    })
                }


                if (availableContainers.length > 0) {
                    let target = creep.pos.findClosestByPath(availableContainers, { ignoreCreeps: true })
                    if (target == null) {
                        continue
                    }
                    targetId = target.id

                    let type = 'withdraw'
                    let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, energy, creep.id)
                    assignedTasks.push(task)
                } else if (creep.memory.role != 'transporter') {


                    targetId = _.max(availableSources, function (s) {
                        let energy = s.energy
                        assignedTasks.forEach(at => {
                            if (s.id == at.id) {
                                energy -= at.energy
                            }
                        })
                        return energy
                    }).id
                    let type = 'harvest'
                    let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
                    creep.memory.target = targetId
                    creep.memory.task = type
                    let task = new Task(targetId, type, energy, creep.id)
                    assignedTasks.push(task)
                }
            }
        } else if (!creep.memory.refill) {
            if (creep.memory.target == undefined && creep.memory.role == 'transporter') {
                creep.memory.task = 'transferTo'
                let destinations = []
                storages.forEach(s => destinations.push(s))

                if (controllerContainers.length > 0 && controllerContainers[0].store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                    destinations.push(controllerContainers[0])
                }
                if (destinations.length > 0) {


                    creep.memory.target = _.min(destinations, d => d.store.getUsedCapacity(RESOURCE_ENERGY)).id
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

                let target = creep.pos.findClosestByPath(ro, { ignoreCreeps: true })
                if (target == null) {
                    continue
                }
                targetId = target.id
                let type = 'transferTo'
                let energy = creep.store.getUsedCapacity(RESOURCE_ENERGY)
                creep.memory.target = targetId
                creep.memory.task = type
                let task = new Task(targetId, type, energy, creep.id)
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
                let task = new Task(targetId, type, energy, creep.id)
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
                let task = new Task(targetId, type, energy, creep.id)
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

    if (creep.memory.refill) {

        if (creep.room.name != creep.memory.targetRoom) {
            if (creep.memory.task != 'move') {
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
            let storages = creep.room.find(FIND_STRUCTURES).filter(s =>
                (s.structureType == STRUCTURE_CONTAINER ||
                    s.structureType == STRUCTURE_LINK ||
                    s.structureType == STRUCTURE_STORAGE) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY))

            let closest = creep.pos.findClosestByPath(storages)

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
            let target = JSON.parse(creep.memory.target)
            if (target.roomName != creep.room.name) {
                creep.memory.task = undefined
            }
        }

        if (creep.memory.task == undefined) {

            let exit = moveToTargetRoom(creep, creep.memory.targetRoom)
            creep.memory.target = JSON.stringify(exit)
            creep.memory.task = 'move'
        } else {
            let target = JSON.parse(creep.memory.target)
            if (target.roomName == creep.room.name) {

            }
        }

    } else {

        creep.memory.target = creep.room.controller.id
        creep.memory.task = 'claim'
        //creep.moveTo(creep.room.controller)

    }
}

function manageRemoteBuilder(creep) {
    if (creep.room.name != creep.memory.targetRoom) {
        if (creep.memory.target == undefined) {
            creep.memory.task = undefined
        } else {
            let target = JSON.parse(creep.memory.target)
            if (target.roomName != creep.room.name) {
                creep.memory.task = undefined
            }
        }

        if (creep.memory.task == undefined) {

            let exit = moveToTargetRoom(creep, creep.memory.targetRoom)
            creep.memory.target = JSON.stringify(exit)
            creep.memory.task = 'move'
        }

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
            let sources = creep.room.find(FIND_SOURCES)
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

    // Avoid creeps in the room
    room.find(FIND_MY_CREEPS).filter(c => c.memory.moving == false).forEach(function (creep) {
        costs.set(creep.pos.x, creep.pos.y, 0xff);
    });
    //Memory.savedMatrix = true

    Memory.savedMatrix[room.name] = costs.serialize();
}