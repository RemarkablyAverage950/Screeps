const HOME = 'W4S22'
const LD_TARGET = 'W4S23'

const MAX_HARVESTERS = 2
const MAX_BUILDERS = 1
const MAX_MINERS = 2
const MAX_UPGRADERS = 1
const MAX_LD_HARVESTERS = 3
const MAX_JANITORS = 1

const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const MINER_BASE_PARTS = [MOVE, WORK, WORK]
const LD_HARVESTER_BASE_PARTS = [MOVE, MOVE, WORK, CARRY]

let roleHarvester = require('role.harvester');
let roleBuilder = require('role.builder');
let roleMiner = require('role.miner')
let roleUpgrader = require('role.upgrader')
let towers = require('towers')
let roleLdHarvester = require('role.ldHarvester')
let roleJanitor = require('role.janitor')

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

function buildBody(energy, parts,max) {
    
    let availableEnergy = energy
    let bodyArr = []
    let energyPerBlock = 0
    for (let part of parts) {
        energyPerBlock += getPartCost(part)
    }
    //console.log('parts: '+parts)
    //console.log('energy: '+availableEnergy)
    if(max == undefined){
    while (availableEnergy >= energyPerBlock) {
        availableEnergy -= energyPerBlock
        for (let i = 0; i < parts.length; i++) {
            bodyArr.push(parts[i])
        }
    }}else{
        let loop = 0
        while (availableEnergy >= energyPerBlock&& loop < max) {
            loop++
            availableEnergy -= energyPerBlock
            for (let i=0; i < parts.length; i++) {
                bodyArr.push(parts[i])
            }
        }

    }
    //console.log(bodyArr)
    return bodyArr
}

module.exports.loop = function () {
    // check for enemies and turn on safe mode if available && not turned on
    for (let name in Memory.creeps) {
        // console.log('considering memory for '+name)
        if (Game.creeps[name] == undefined) {
            delete Memory.creeps[name];
            //console.log('Clearing non-existing creep memory:', name);
        }
    }
    towers(HOME);
    const hostiles = Game.rooms[HOME].find(FIND_HOSTILE_CREEPS);
    if (hostiles.length > 0) {
        console.log('Hostile detected!!!')
    }
    let safemode = false
    let myBuildings = Game.rooms[HOME].find(FIND_MY_STRUCTURES, {
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
    if (safemode && Game.rooms[HOME].controller.safeMode == undefined && Game.rooms[HOME].controller.safeModeAvailable > 0) {
        Game.rooms[HOME].controller.activateSafeMode()
    }
    let harvesters = []
    let builders = []
    let miners = []
    let upgraders = []
    let ldHarvesters = []
    let janitors = []
    let spawnDistanceHarvesters = true

    for (var i in Game.creeps) {
        if (Game.creeps[i].memory.role == 'harvester') {
            harvesters.push(Game.creeps[i]);
        }
        if (Game.creeps[i].memory.role == 'builder') {
            builders.push(Game.creeps[i])
        }
        if (Game.creeps[i].memory.role == 'miner') {
            miners.push(Game.creeps[i])
        }
        if (Game.creeps[i].memory.role == 'upgrader') {
            upgraders.push(Game.creeps[i])
        }
        if (Game.creeps[i].memory.role == 'ldHarvester') {
            ldHarvesters.push(Game.creeps[i])
            if (Game.creeps[i].memory.timer > 0) {
                spawnDistanceHarvesters = false
            }
        }
        if (Game.creeps[i].memory.role == 'janitor') {
            janitors.push(Game.creeps[i])
        }
    }

    //console.log(harvesters.length)

    // get energy capacity
    let energy = Game.rooms[HOME].energyCapacityAvailable;
    //console.log('Energy: '+energy)
    let body;


    if (harvesters.length < MAX_HARVESTERS) {
        if (harvesters.length == 0) {
            body = buildBody(Game.rooms[HOME].energyAvailable, WORKER_BASE_PARTS)

        } else {
            body = buildBody(energy, WORKER_BASE_PARTS)
        }

        for (let i = 0; i < MAX_HARVESTERS; i++) {
            let name = 'harvester' + i;
            Game.spawns['Spawn1'].spawnCreep(body, name, {
                memory: {
                    role: 'harvester',
                    refill: true
                }
            });
        }
    } else if (miners.length < MAX_MINERS) {
        body = buildBody(energy, MINER_BASE_PARTS,3)
        for (let i = 0; i < MAX_MINERS; i++) {
            let name = 'miner' + i;
            Game.spawns['Spawn1'].spawnCreep(body, name, {
                memory: {
                    role: 'miner'
                }
            });
        }
    } else if (upgraders.length < MAX_UPGRADERS) {
        body = buildBody(energy, WORKER_BASE_PARTS)
        for (let i = 0; i < MAX_MINERS; i++) {
            let name = 'upgrader' + i;
            Game.spawns['Spawn1'].spawnCreep(body, name, {
                memory: {
                    role: 'upgrader',
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
                    home: HOME,
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
                    refill: true
                }
            });
        }
    }




    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
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
        }

    }

    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }

}