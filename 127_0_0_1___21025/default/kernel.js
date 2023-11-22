let MEMORY = require('memory');
const roomManager = require('roomManager');

const PROCESS_TYPES = {
    SQUADS: 'SQUADS',
    ASSAULT_ROOM: 'ASSAULT_ROOM',
    MANAGE_OWNED_ROOM: 'MANAGE_OWNED_ROOM',
    MANAGE_MISSIONS: 'MANAGE_MISSIONS',
    PLAN_ROOM: 'PLAN_ROOM',
}

let nextPID = 0;

class Process {
    constructor(type) {
        this.type = type;
        this.runOnTick = Game.time;
        this.priority = Infinity;
        this.runEvery = 1;
        this.PID = nextPID;
        this.reqCPU = 1;
        this.reqBucket = 1;
        nextPID++;
    }

    canRun() {
        if (Game.cpu.limit - Game.cpu.getUsed() < this.reqCPU || Game.cpu.bucket <= this.reqBucket) {
            return false;
        }
        return true;
    }

}

class ManageOwnedRoomProcess extends Process {
    constructor(roomName) {
        super(PROCESS_TYPES.MANAGE_OWNED_ROOM);
        this.roomName = roomName;
        this.runEvery = 1;
        this.priority = 2;
        this.reqCPU = 5;
        this.reqBucket = 20;
    }
    run() {
        const successful = roomManager(this.roomName);

        if (successful) {
            this.runOnTick = Game.time + this.runEvery; // Set next game time to run process.
        }

    }
}

/**
 * This is the entry point into the operating system and handles all tasks required by it.
 * 
 * Kernel operation:
 * 1. Kill any processes no longer required.
 * 2. Initialize any new processes that are required.
 * 3. Schedule and run processes required this tick.
 */
function kernel() {
    const verbose = false;


    killProcesses();
    initializeProcesses();
    runProcesses(scheduleProcesses());

}



/**
 * Returns an array of room names for my rooms.
 * @returns {String[]}
 */
function getMyRooms() {
    let myRooms = [];

    for (const roomName in Game.rooms) {
        if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {
            myRooms.push(roomName);
        }
    }

    return myRooms;
}

/**
 * Initializes all processes handled by the operating system.
 */
function initializeProcesses() {

    const processes = _.groupBy(MEMORY.processes, p => p.type);


    _.forEach(getMyRooms(), roomName => {
        if (!processes[PROCESS_TYPES.MANAGE_OWNED_ROOM]) {
            MEMORY.processes.push(new ManageOwnedRoomProcess(roomName))
        } else if (!processes[PROCESS_TYPES.MANAGE_OWNED_ROOM].some(p => p.roomName === roomName)) {
            MEMORY.processes.push(new ManageOwnedRoomProcess(roomName));
        }
    });


}

/**
 * Finds the process by PID and removes it from the process list.
 * @param {number} PID 
 */
function killProcess(PID) {
    let idx = MEMORY.processes.findIndex(p => p.PID === PID);
    MEMORY.processes.splice(idx, 1);
}

/**
 * Finds a processes that needs to be killed and calls killProcess on them.
 */
function killProcesses() {
    const processes = _.groupBy(MEMORY.processes, p => p.type);

    _.forEach(processes[PROCESS_TYPES.MANAGE_OWNED_ROOM], p => {
        if (!Game.rooms[p.roomName] || !Game.rooms[p.roomName].controller.my) {
            killProcess(p.PID);
        }
    })

}

/**
 * Runs through the scheduled processes while there is CPU available.
 * @param {Process[]} processes 
 */
function runProcesses(processes) {
    for (const process of processes) {
        if (process.canRun()) {
            process.run();
        }
    }
}

/**
 * Returns processes that need to run this tick, in order of priorty, then oldest run on tick.
 * @returns {Process[]}
 */
function scheduleProcesses() {
    let scheduled = []

    scheduled = MEMORY.processes.filter(p => Game.time >= p.runOnTick);
    if (scheduled.length) {
        scheduled = scheduled.sort((a, b) => a.priority - b.priority || a.runOnTick - b.runOnTick);
    }
    return scheduled;
}

module.exports = kernel;