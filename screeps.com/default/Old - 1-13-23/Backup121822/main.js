
const LD_TARGET = 'W4S23'


const UPGRADERS_CARRY_TARGET = 100
const HARVESTERS_CARRY_TARGET = 300
const BUILDERS_CARRY_TARGET = 300





const MAX_JANITORS = 0



const WORKER_BASE_PARTS = [WORK, CARRY, MOVE]
const MINER_BASE_PARTS = [MOVE, WORK, WORK]
const LD_HARVESTER_BASE_PARTS = [MOVE, MOVE, WORK, CARRY]
const TRANSPORT_BASE_PARTS = [MOVE, CARRY, CARRY]
const CLAIMER_BASE_PARTS = [CLAIM, MOVE]
const RESERVER_BASE_PARTS = [CLAIM, CLAIM, MOVE, MOVE]
const SOLDIER_BASE_PARTS = [ATTACK, TOUGH, MOVE, MOVE]


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
let links = require('links')
var roleClaimer = require('role.claimer')
var roleSoldier = require('role.soldier')
var roleldbuilder = require('role.ldbuilder')

function controllerContainer(room) {
    let containers = Game.rooms[room].find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_CONTAINER)
    for (let container of containers) {
        if (container.pos.inRangeTo(Game.rooms[room].controller, 5)) {
           
            return true

        }

    }
    return false
}

function findMyRooms() {
    
    var ret = []
    for (let room in Game.rooms) {

        try {
            if (Game.rooms[room].controller.my) {
                ret.push(room)
            }
        } catch { }
    }
   
    return ret
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
   
    return bodyArr
}



function findMinableContainer(room) {
    let minersReq = 0
    let containers = Game.rooms[room].find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_CONTAINER);
        }
    });
    let sources = Game.rooms[room].find(FIND_SOURCES)

    
    for (var source of sources) {
        for (var container of containers) {
            
            /*  if(creep.pos.isNearTo(target)) {
                creep.transfer(target, RESOURCE_ENERGY);
                } */
            if (container.pos.isNearTo(source.pos)) {
                minersReq++

                
            }
        }

    }


    return minersReq
}

function getNumWorkers(role, targetCapacity, room) { // 100
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
        
        return count
    } else {
        
        return count
    }



}
module.exports.loop = function () {
    var SOLDIER_TARGET = undefined


    // check for enemies and turn on safe mode if available && not turned on
    for (let name in Memory.creeps) {

        if (Game.creeps[name] == undefined) {
            if (Memory.creeps[name].role == 'ldbuilder') {
                
            }
            delete Memory.creeps[name];

        }
    }
    for (let spawn in Game.spawns) {


        if (Memory.spawns == undefined || Memory.spawns[spawn] == undefined || Memory.spawns[spawn].hostile_hp == undefined || Memory.spawns[spawn].home == undefined) {

            let mo = {
                buildTimer: 0,
                hostile_hp: 0,
                hostile_room: undefined,
                home: Game.spawns[spawn].room.name
            }
            Game.spawns[spawn].memory = mo

        }
    }
    var myRooms = findMyRooms()


    for (let room of myRooms) {


        var spawns = []

        for (let spawn in Game.spawns) {

            if (Game.spawns[spawn].room.name == room) {
                spawns.push(Game.spawns[spawn])
            }
        }


        var buildTimer = 0
        for (let spawn of spawns) {

            if (spawn.memory.buildTimer > 0) {
                buildTimer = spawn.memory.buildTimer
            }

        }


        test(room)
        if (spawns.length > 0) {


            autoBuild(room)
            links(room)
        }
        var CLAIM_TARGET = undefined
        var MAX_WALL_REPAIRERS = 0
        var MAX_CLAIMERS = 0
        var MAX_SOLDIERS = 0
        var MAX_LD_HARVESTERS = 2
        var MAX_MINERS = findMinableContainer(room)




        var MAX_UPGRADERS = 2//Math.min(Math.max(1, getNumWorkers('upgrader', UPGRADERS_CARRY_TARGET, room)), 2)
        const MAX_HARVESTERS = Math.min(Math.max(1, getNumWorkers('harvester', HARVESTERS_CARRY_TARGET, room)), 2)
        var MAX_BUILDERS = Math.min(Math.max(1, getNumWorkers('builder', BUILDERS_CARRY_TARGET, room)), 5)





        if (CLAIM_TARGET != undefined && Game.spawns[spawns[0].name].memory.hostile_room == undefined) {
            MAX_CLAIMERS = 1
        }







        if (buildTimer > 0) {



        }
        var MAX_TRANSPORTS = Game.spawns[spawns[0].name].memory.transports
        
        var sites = Game.rooms[room].find(FIND_CONSTRUCTION_SITES)
        var enemies = Game.rooms[room].find(FIND_HOSTILE_CREEPS)
        if (sites.length == 0) {
            MAX_BUILDERS = 0



        }
        var walls = Game.rooms[room].find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_WALL && s.hits < s.hitsMax)

        if (walls.length > 0 && enemies.length == 0) {
            MAX_WALL_REPAIRERS = 1

        }

        towers(room);
        const hostiles = Game.rooms[room].find(FIND_HOSTILE_CREEPS);
        if (hostiles > 1 && Game.spawns[spawns[0].name].memory.hostile_room == room) {
            MAX_SOLDIERS = 1
            SOLDIER_TARGET = Game.spawns[spawns[0].name].memory.hostile_room
            MAX_LD_HARVESTERS = 0
        }
        if (hostiles.length == 0 && Game.spawns[spawns[0].name].memory.hostile_room == room) {
            Game.spawns[spawns[0].name].memory.hostile_room = undefined
        }
        if (Game.spawns[spawns[0].name].memory.hostile_room != undefined && Game.spawns[spawns[0].name].memory.hostile_room != room) {
            MAX_SOLDIERS = 1
            SOLDIER_TARGET = Game.spawns[spawns[0].name].memory.hostile_room
            MAX_LD_HARVESTERS = 0
        }
        if (hostiles.length > 0) {
            console.log(room+ ' Hostile detected!!!')
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
                console.log(room+ 'Attempting to activate safemode')
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
        let claimers = []
        let soldiers = []
        let ldBuidlers = []


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
            if (Game.creeps[i].memory.role == 'claimer' && Game.creeps[i].memory.home == room) {
                claimers.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'soldier' && Game.creeps[i].memory.home == room) {
                soldiers.push(Game.creeps[i])
            }
            if (Game.creeps[i].memory.role == 'ldbuilder' && Game.creeps[i].memory.home == room) {
                ldBuidlers.push(Game.creeps[i])
            }
        }

        

        // get energy capacity
        let energy = Game.rooms[room].energyCapacityAvailable;
        
        let body;
       
        if (spawns.length == 0 && sites.length > 0) {
            var MAX_LD_BUILDERS = 4
            body = buildBody(600, WORKER_BASE_PARTS, 4)
            
            for (let i = 0; i < MAX_LD_BUILDERS; i++) {
                var name = 'LDbuilder' + i;

                Game.spawns['Spawn1'].spawnCreep(body, name, {
                    memory: {
                        role: 'ldbuilder',
                        home: Game.spawns['Spawn1'].room.name,
                        target: room,
                        refill: false

                    }
                });
            }
        }
        
        if (spawns.length == 0) {
            continue
        }
        
        if (harvesters.length < MAX_HARVESTERS) {

           
            if (harvesters.length == 0 && transports.length == 0) {
                body = buildBody(Game.rooms[room].energyAvailable, WORKER_BASE_PARTS, 6)

            } else {
                body = buildBody(energy, WORKER_BASE_PARTS, 6)
            }

            for (let i = 0; i < MAX_HARVESTERS; i++) {
                let name = room + '-harvester-' + i;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'harvester',
                        home: room,
                        refill: true
                    }
                });
                
            }
        } else if (miners.length < MAX_MINERS) {
           
            body = buildBody(energy, MINER_BASE_PARTS, 3)
            for (let i = 0; i < MAX_MINERS; i++) {
                let name = room + '-miner-' + i;;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        home: room,
                        role: 'miner'
                    }
                });
            }
        } else if (transports.length < MAX_TRANSPORTS && miners.length > 0) {
            body = buildBody(energy, TRANSPORT_BASE_PARTS, 8)
            for (let i = 0; i < MAX_TRANSPORTS; i++) {
                let name = room + '-transport-' + i;;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'transport',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (soldiers.length < MAX_SOLDIERS) {

            body = buildBody(energy, SOLDIER_BASE_PARTS)

            for (let i = 0; i < MAX_SOLDIERS; i++) {
                let name = room + '-soldier-' + i;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'soldier',
                        home: room,
                        target: SOLDIER_TARGET
                    }
                });
            }
        } else if (upgraders.length < MAX_UPGRADERS) {

            if (Game.rooms[room].controller.level == 8) {
                energy -= 100
                body = buildBody(energy, TRANSPORT_BASE_PARTS, 4)
                body.push(WORK)
            } else if (!controllerContainer(room)) {
                body = buildBody(energy, WORKER_BASE_PARTS, 4)
            } else {

                energy -= 150
                body = buildBody(energy, [WORK], 5)
                body.push(CARRY)
                body.push(MOVE)
            }
            for (let i = 0; i < MAX_UPGRADERS; i++) {
                let name = room + '-upgrader-' + i;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'upgrader',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (builders.length < MAX_BUILDERS) {
            body = buildBody(energy, WORKER_BASE_PARTS, 6)
            for (let i = 0; i < MAX_BUILDERS; i++) {
                let name = room + '-builder-' + i;;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'builder',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (ldHarvesters.length < MAX_LD_HARVESTERS && Game.rooms[room].controller.level > 2) {
            body = buildBody(energy, LD_HARVESTER_BASE_PARTS)
            for (let i = 0; i < MAX_LD_HARVESTERS; i++) {
                let name = room + '-ld_harvester-' + i;;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'ldHarvester',
                        home: room,
                        target: Game.spawns[spawns[0].name].memory.ldHarvestRoom,
                        refill: true,
                        collected: 0,
                        timer: 0
                    }
                });
            }
        } else if (janitors.length < MAX_JANITORS) {
            body = buildBody(energy, WORKER_BASE_PARTS, 4)
            for (let i = 0; i < MAX_JANITORS; i++) {
                let name = room + '-janitor-' + i;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'janitor',
                        home: room,
                        refill: true
                    }
                });
            }

        } else if (wallRepairers.length < MAX_WALL_REPAIRERS && Game.rooms[room].controller.level > 2) {
            body = buildBody(energy, WORKER_BASE_PARTS, 5)

            for (let i = 0; i < MAX_WALL_REPAIRERS; i++) {
                let name = room + '-wallrepairer-' + i;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'wallrepair',
                        home: room,
                        refill: true
                    }
                });
            }
        } else if (claimers.length < MAX_CLAIMERS && Game.rooms[room].controller.level > 1) {
            if (Game.gcl.level > myRooms.length) {
                body = buildBody(energy, CLAIMER_BASE_PARTS, 1)
            } else { body = buildBody(energy, RESERVER_BASE_PARTS, 1) }
            for (let i = 0; i < MAX_CLAIMERS; i++) {
                let name = room + '-claimer-' + i;
                Game.spawns[spawns[0].name].spawnCreep(body, name, {
                    memory: {
                        role: 'claimer',
                        home: room,
                        refill: true,
                        target: CLAIM_TARGET
                    }
                });
            }
        }


        for (var name in Game.creeps) {
           
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
                if (buildTimer == 0) {
                    roleBuilder.run(creep)
                } else {
                    roleWallRepairer.run(creep)
                }
            } else if (creep.memory.role == 'claimer') {
                roleClaimer.run(creep, CLAIM_TARGET)
            } else if (creep.memory.role == 'soldier') {
                roleSoldier.run(creep)
            } else if (creep.memory.role == 'ldbuilder') {
                roleldbuilder.run(creep)
            }
        }
    }
    if (Game.cpu.bucket >= 10000) {
        Game.cpu.generatePixel();
    }

}