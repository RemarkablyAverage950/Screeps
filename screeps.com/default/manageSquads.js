let MEMORY = require('memory')

class Squad {
    constructor(type, targetRoom) {
        this.type = type;
        this.id = Math.round(Math.random() * 9999);
        this.ready = false;
        this.targetRoom = targetRoom
    }
}

class Duo extends Squad {
    constructor(targetRoom) {
        super('DUO', targetRoom);
        this.u1 = undefined;
        this.u2 = undefined;
    }
}

class Trio extends Squad {
    constructor(targetRoom, squadType) {
        super('TRIO', targetRoom);
        this.u1 = undefined;
        this.u2 = undefined;
        this.u3 = undefined;
        this.squadType = squadType;
    }
}

class Quad extends Squad {
    constructor(squadType) {
        super('QUAD', targetRoom);
        this.u1 = undefined;
        this.u2 = undefined;
        this.u3 = undefined;
        this.u4 = undefined;
        this.squadType = squadType;

    }
}

function manageSquads() {

    let squads = MEMORY.squads



}

module.exports = manageSquads()