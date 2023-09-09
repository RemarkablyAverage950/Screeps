
const LD_TARGET = 'W4S23'

const UPGRADERS_CARRY_TARGET = 300
const HARVESTERS_CARRY_TARGET = 300
const BUILDERS_CARRY_TARGET = 300




const MAX_LD_HARVESTERS = 2
const MAX_JANITORS = 0
const MAX_TRANSPORTS = 1
const MAX_WALL_REPAIRERS = 1

const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const MINER_BASE_PARTS = [MOVE, WORK, WORK]
const LD_HARVESTER_BASE_PARTS = [MOVE, MOVE, WORK, CARRY]
const TRANSPORT_BASE_PARTS = [MOVE, CARRY, CARRY]


let roleHarvester = require('role.harvester');
let roleBuilder = require('role.builder');
let roleMiner = require('role.miner')
let roleUpgrader = require('role.upgrader')
let towers = require('towers')
let roleLdHarvester = require('role.ldHarvester')
let roleJanitor = require('role.janitor')
let autoBuild = require('autobuild')
let roleTransport = require('role.transport')
let roleWallRepairer = require('role.wallrepairer')
let test = require('test')

function findMyRooms() {
    //console.log('Game.rooms '+Game.rooms)
    var ret = []
    for (let room in Game.rooms) {

        if (Game.rooms[room].controller.my) {
            ret.push(room)
        }
    }
    //console.log(ret)
    return ret
}

function getPartCost(part) {
    const map = [
        [WORK, 100],
        [CARRY, 50],
        [MOVE, 50]
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
    //console.log('parts: '+parts)
    //console.log('energy: '+availableEnergy)
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
    //console.log(bodyArr)
    return bodyArr
}

function placeContainer(room, source) {
    //console.log('Placing Container at '+source)
    var x = source.pos.findPathTo('Spawn1')[0].x
    var y = source.pos.findPathTo('Spawn1')[0].y
    //console.log('(' + x + ',' + y + ')')
    //get open spaces around source
    Game.rooms[room].createConstructionSite(x, y, STRUCTURE_CONTAINER)
}

function findMinableContainer(room) {
    let minersReq = 0
    let containers = Game.rooms[room].find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_CONTAINER);
        }
    });
    let sources = Game.rooms[room].find(FIND_SOURCES)
    let sourcesWithContainers = []
    let sites = Game.rooms[room].find(FIND_CONSTRUCTION_SITES, {
        filter: (s) => (s.structureType == STRUCTURE_CONTAINER)
    })
    //console.log(sites)
    for (var source of sources) {
        for (var container of containers) {
            //console.log('SOURCE: ' + source)
            //console.log('CONTAINER: ' + container)
            /*  if(creep.pos.isNearTo(target)) {
                creep.transfer(target, RESOURCE_ENERGY);
                } */
            if (container.pos.isNearTo(source.pos)) {
                minersReq++
                sourcesWithContainers.push(source)
                //console.log(true)
            }
        }
        for (var site of sites) {
            if (site.pos.isNearTo(source.pos)) {
                sourcesWithContainers.push(source)
            }

        }
    }
    for (let source of sources) {
        if (!sourcesWithContainers.includes(source)) {
            //console.log(source+' needs container')
            placeContainer(room, source)
        }
    }

    return minersReq
}

function getNumWorkers(role, targetCapacity, room) {
    let sum = 0
    let count = 0
    for (var i in Game.creeps) {
        if (Game.creeps[i].memory.role == role && Game.creeps[i].memory.home == room) {
            sum += Game.creeps[i].store.getCapacity()
            count++
        }
    }
    if (sum < targetCapacity) {
        count++
        //console.log('returning count: ' + count)
        return count
    } else {
        //console.log('returning count: ' + count)
        return count
    }



}
module.exports.loop = function () {
    //console.log('Test')
    // check for enemies and turn on safe mode if available && not turned on
    for (let name in Memory.creeps) {
        // console.log('considering memory for '+name)
        if (Game.creeps[name] == undefined) {
            delete Memory.creeps[name];
            //console.log('Clearing non-existing creep memory:', name);
        }
    }
    for (let spawn in Game.spawns) {


        //console.log(Memory.spawns)

        if (Memory.spawns == undefined || Memory.spawns[spawn] == undefined) {

            console.log(spawn)
            let mo = { buildTimer: 0 }
            Game.spawns[spawn].memory = mo
            //spawn.memory.buildTimer == 100
        }
    }
    var myRooms = findMyRooms()
    //console.log('myRooms '+myRooms)
    for (let room of myRooms) {

        //console.log('room '+room)
        //test(room)
        autoBuild(room)


        const MAX_MINERS = findMinableContainer(room)
        const MAX_UPGRADERS = Math.min(Math.max(1, getNumWorkers('upgrader', UPGRADERS_CARRY_TARGET, room)),3)
        const MAX_HARVESTERS = Math.min(Math.max(1, getNumWorkers('harvester', HARVESTERS_CARRY_TARGET, room)),2)
        const MAX_BUILDERS = Math.min(Math.max(1, getNumWorkers('builder', BUILDERS_CARRY_TARGET, room)),5)
        //console.log('MAX_MINERS: ' + MAX_MINERS)


        towers(room);
        const hostiles = Game.rooms[room].find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0) {
            console.log('Hostile detected!!!')
        }
        let safemode = false
        let myBuildings = Game.rooms[room].find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_TOWER ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_EXTENSION);
            }
        });
        for (let s of myBuildings) {
            if (s.hits / s.hitsMax < .5) {
                safemode = true
                console.log('Attempting to activate safemode')
            }
        }
        if (safemode && Game.rooms[room].controller.safeMode == undefined && Game.rooms[room].controller.safeModeAvailable > 0) {
            Game.rooms[room].controller.activateSafeMode()
        }
        let harvesters = []
        let builders = []
        let miners = []
        let upgraders = []
        let ldHarvesters = []
        let janitors = []
        let transports = []
        let wallRepairers = []
        let spawnDistanceHarvesters = true

        for (var i in Game.creeps) {
            if (Game.creeps[i].memory.role == 'harvester' && Game.creeps[i].memory.home == room) {
                harvesters.push(Game.creeps[i]);
            }
            if (Game.creeps[i].memory.role == 'builder' && Game.creeps[i].memory.home == room) {
                builders.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'miner' && Game.creeps[i].memory.home == room) {
                miners.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'upgrader' && Game.creeps[i].memory.home == room) {
                upgraders.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'ldHarvester' && Game.creeps[i].memory.home == room) {
                ldHarvesters.push(Game.creeps[i])
                if (Game.creeps[i].memory.timer > 0) {
                    spawnDistanceHarvesters = false
                }
            }
            if (Game.creeps[i].memory.role == 'janitor' && Game.creeps[i].memory.home == room) {
                janitors.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'transport' && Game.creeps[i].memory.home == room) {
                transports.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'wallrepair' && Game.creeps[i].memory.home == room) {
                wallRepairers.push(Game.creeps[i])
            }
        }

        //console.log(harvesters.length)

        // get energy capacity
        let energy = Game.rooms[room].energyCapacityAvailable;
        //console.log('Energy: '+energy)
        let body;

        //console.log(harvesters.length)
        if (harvesters.length < MAX_HARVESTERS) {
            //console.log('Attempting to build harvester')
            if (harvesters.length == 0) {
                body = buildBody(Game.rooms[room].energyAvailable, WORKER_BASE_PARTS)

            } else {
                body = buildBody(energy, WORKER_BASE_PARTS)
            }

            for (let i = 0; i < MAX_HARVESTERS; i++) {
                let name = 'harvester' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'harvester',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (miners.length < MAX_MINERS) {
            //console.log('Attempting to build Miner')
            body = buildBody(energy, MINER_BASE_PARTS, 3)
            for (let i = 0; i < MAX_MINERS; i++) {
                let name = 'miner' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        home: room,
                        role: 'miner'
                    }
                });
            }
        } else if (transports.length < MAX_TRANSPORTS && miners.length > 0) {
            body = buildBody(energy, TRANSPORT_BASE_PARTS, 8)
            for (let i = 0; i < MAX_TRANSPORTS; i++) {
                let name = 'transport' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'transport',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (upgraders.length < MAX_UPGRADERS) {

            if (Game.rooms[room].controller.level == 8) {
                energy -= 100
                body = buildBody(energy, TRANSPORT_BASE_PARTS, 4)
                body.push(WORK)
            } else {
                body = buildBody(energy, WORKER_BASE_PARTS,5)
            }
            for (let i = 0; i < MAX_UPGRADERS; i++) {
                let name = 'upgrader' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'upgrader',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (builders.length < MAX_BUILDERS) {
            body = buildBody(energy, WORKER_BASE_PARTS)
            for (let i = 0; i < MAX_BUILDERS; i++) {
                let name = 'builder' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'builder',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (ldHarvesters.length < MAX_LD_HARVESTERS && spawnDistanceHarvesters) {
            body = buildBody(energy, LD_HARVESTER_BASE_PARTS)
            for (let i = 0; i < MAX_LD_HARVESTERS; i++) {
                let name = 'LDHarvester' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'ldHarvester',
                        home: room,
                        target: LD_TARGET,
                        refill: true,
                        collected: 0,
                        timer: 0
                    }
                });
            }
        } else if (janitors.length < MAX_JANITORS) {
            body = buildBody(energy, WORKER_BASE_PARTS)
            for (let i = 0; i < MAX_JANITORS; i++) {
                let name = 'janitor' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'janitor',
                        home: room,
                        refill: true
                    }
                });
            }

        } else if (wallRepairers.length < MAX_WALL_REPAIRERS && Game.rooms[room].controller.level > 1) {
            body = buildBody(energy, WORKER_BASE_PARTS)
            for (let i = 0; i < MAX_WALL_REPAIRERS; i++) {
                let name = 'wallrepairer' + i;
                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'wallrepair',
                        home: room,
                        refill: true
                    }
                });
            }
        }


        for (var name in Game.creeps) {
            //console.log(name)
            let creep = Game.creeps[name];
            if (creep.memory.home != room) {
                continue
            }
            if (creep.memory.role == 'harvester') {
                roleHarvester.run(creep);
            } else if (creep.memory.role == 'builder') {
                roleBuilder.run(creep);
            } else if (creep.memory.role == 'miner') {
                roleMiner.run(creep);
            } else if (creep.memory.role == 'upgrader') {
                if (harvesters.length < MAX_HARVESTERS) {
                    roleHarvester.run(creep)
                } else {
                    roleUpgrader.run(creep)
                }
            } else if (creep.memory.role == 'ldHarvester') {
                roleLdHarvester.run(creep)
            } else if (creep.memory.role == 'janitor') {
                roleJanitor.run(creep)
            } else if (creep.memory.role == 'transport') {
                roleTransport.run(creep)
            } else if (creep.memory.role == 'wallrepair') {
                roleWallRepairer.run(creep)
            }
        }
    }
    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }

}