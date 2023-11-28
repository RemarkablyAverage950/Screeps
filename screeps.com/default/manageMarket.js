const MAX_ENERGY_QTY = 500000;
let MEMORY = require('memory');


function manageMarket(myRoomNames) {
    if (Game.time % 10 !== 3) { return; }
    let tradingRooms = [];
    let dealCount = 0;
    for (const roomName of myRoomNames) {
        const room = Game.rooms[roomName]
        if (room.storage && room.terminal) {
            tradingRooms.push(room)
        }
    }

    for (const room of tradingRooms) {
        if (dealCount >= 10) {
            return;
        }
        const storage = room.storage;
        const terminal = room.terminal;
        const energyQty = storage.store[RESOURCE_ENERGY] + terminal.store[RESOURCE_ENERGY];
        let order = undefined;
        if (terminal.cooldown) {
            continue;
        }


        if (energyQty > MAX_ENERGY_QTY && terminal.store[RESOURCE_ENERGY] > 10000) {
            console.log('Getting orders for', room.name)

            let orders = Game.market.getAllOrders(order => order.resourceType === RESOURCE_ENERGY
                && order.type === ORDER_BUY
                && order.remainingAmount > 0);

            if (orders.length) {

                //best order is most credits/unit
                order = _.max(orders, o => (1000 * o.price) - Game.market.calcTransactionCost(1000, room.name, o.roomName))
                let distance = Game.map.getRoomLinearDistance(room.name, order.roomName)
                let availableAmount = terminal.store[order.resourceType] - 10000;
                let amount = Math.min(order.remainingAmount + Game.market.calcTransactionCost(order.remainingAmount, room.name, order.roomName), availableAmount / (1 + Math.ceil(1 - Math.exp(-distance / 30))))
                let ret = Game.market.deal(order.id, amount, room.name);
                console.log(room.name, 'attempted execute deal for', JSON.stringify(order), 'of amount', amount, 'Returned:', ret)
                dealCount++

            }

        }

    }


}

module.exports = manageMarket