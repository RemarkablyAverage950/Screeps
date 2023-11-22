
getRequests = {

    fill: function (roomHeap) {

        let requests = [];
        const spawns = roomHeap.structures.spawn;
        const extensions = roomHeap.structures.extension;

        for (const spawn of spawns) {
            if (spawn.store[RESOURCE_ENERGY] < 300) {

                let fillQty = 300 - spawn.store[RESOURCE_ENERGY]
                requests.push(makeFillRequest(spawn, fillQty))

            }
        }
        if (extensions.length) {
            const extensionCapacity = extensions[0].store.getCapacity(RESOURCE_ENERGY)

            for (const extension of extensions) {
                if (extension.store[RESOURCE_ENERGY] < extensionCapacity) {

                    let fillQty = extensionCapacity - extension.store[RESOURCE_ENERGY]
                    requests.push(makeFillRequest(extension, fillQty))

                }
            }
        }

        roomHeap.requests.fill = requests;

    }
}

function makeFillRequest(structure, qty) {
    return {
        id: structure.id,
        qty: qty,
        complete: false,
    }
}

module.exports = getRequests;