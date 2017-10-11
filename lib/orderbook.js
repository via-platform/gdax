const RBTree = require('bintrees').RBTree;
const num = require('num');

module.exports = class Orderbook {
    constructor() {
        this.orders = {};
        this.bids = new RBTree((a, b) => a.price.cmp(b.price));
        this.asks = new RBTree((a, b) => a.price.cmp(b.price));
    }

    getTree(side){
        return (side === 'buy') ? this.bids : this.asks;
    }

    getBids() {
        return this.bids;
    }

    getAsks() {
        return this.asks;
    }

    state(book) {

        if (book) {

            for(let bid of book.bids){
                this.add({id: bid[2], side: 'buy', price: num(bid[0]), size: num(bid[1])});
            }

            for(let ask of book.asks){
                this.add({id: ask[2], side: 'sell', price: num(ask[0]), size: num(ask[1])});
            }

        } else {
          let bids = this.bids.reach(bid => book.bids.push(...bid.orders));
          let asks = this.asks.reach(ask => book.asks.push(...ask.orders));

          return {bids, asks};
        }
    }

    add(order) {
        order = {
            id: order.order_id || order.id,
            side: order.side,
            price: num(order.price),
            size: num(order.size || order.remaining_size),
        };

        let tree = this.getTree(order.side);
        let node = tree.find({price: order.price});

        if(!node){
            node = {price: order.price, orders: []}
            tree.insert(node);
        }

        node.orders.push(order);
        this.orders[order.id] = order;
    }

    remove(orderId) {
        let order = this.get(orderId);

        if(!order){
            return;
        }

        let tree = this.getTree(order.side);
        let node = tree.find({price: order.price});

        if(!node){
            throw new Error(`Node not found for order price: ${order.price}`)
        }

        let orders = node.orders;

        orders.splice(orders.indexOf(order), 1);

        if(!orders.length) {
            tree.remove(node);
        }

        delete this.orders[order.id];
    }

    get(orderId) {
        return this.orders[orderId];
    }

    change() {
        let size = num(change.new_size);
        let price = num(change.price);
        let order = this.get(change.order_id)
        let tree = this.getTree(change.side);
        let node = tree.find({price: price});

        if(!node || node.orders.indexOf(order) === -1) {
            return;
        }

        let nodeOrder = node.orders[node.orders.indexOf(order)];

        let newSize = parseFloat(order.size);
        let oldSize = parseFloat(change.old_size);

        if(oldSize !== newSize){
            throw new Error(`The order book change had mismatched order sizes: ${oldSize} and ${newSize}.`);
        }

        nodeOrder.size = size;
        this.orders[nodeOrder.id] = nodeOrder;
    }

    match(match){
        let size = num(match.size);
        let price = num(match.price);
        let tree = this.getTree(match.side);
        let node = tree.find({price: price});

        if(!node){
            throw new Error('Node not found while matching.');
        }

        let order = node.orders.find(order => order.id === match.maker_order_id);

        if(!order){
            throw new Error('Order not found while matching.');
        }

        order.size = order.size.sub(size);
        this.orders[order.id] = order;

        if(order.size){
            throw new Error(`Order size should be greater than or equal to 0: ${order.size}`);
        }

        if(order.size.eq(0)){
            this.remove(order.id);
        }
    }
}
