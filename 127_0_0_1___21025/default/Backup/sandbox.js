let MEMORY = require('memory')

function sandbox() {

}

module.exports = sandbox;

/**
 * Returns an object of source(s) data to cache.
 * @param {Room} room 
 * @returns {Object}
 */
function getSourcesCache(room) {

    const energyCapacityAvailable = room.energyCapacityAvailable;
    const sources = room.find(FIND_SOURCES);

    let _sources = {};
    for (const s of sources) {
        _sources[s.id] = {
            container_id: s.getContainer(),
            id: s.id,
            maxCreeps: s.maxCreeps(),
            pos: s.pos,
            get obj() {
                return Game.getObjectById(this.id);
            }
        }
    }

    _sources.maxEnergyPerSource = 3000;


    // Harvesters required
    let maxHarvesters = 0;
    for (const s in _sources) {
        maxHarvesters += s.maxCreeps;
    }

    // Largest size of harvester we can make.
    let maxWorkParts = 2;
    if (energyCapacityAvailable >= 650) {
        maxWorkParts = 5;
    } else if (energyCapacityAvailable >= 500) {
        maxWorkParts = 4
    } else if (energyCapacityAvailable >= 400) {
        maxWorkParts = 3
    }

    _sources.harvestersRequired = Math.min(maxHarvesters, Math.ceil(5 / maxWorkParts) * sources.length);

    return _sources;

}