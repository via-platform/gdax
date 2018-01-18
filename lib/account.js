const {CompositeDisposable, Disposable, Emitter} = require('via');
const Helpers = require('./helpers');
const Websocket = require('./websocket');
const Order = require('./order');
const axios = require('axios');
const _ = require('underscore-plus');

module.exports = class Account {
    constructor(params){
        const [key, secret, passphrase] = JSON.parse(via.accounts.keys.get(params.uuid));

        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.websocket = new Websocket({account: this});
        this.uuid = params.uuid;
        this.name = params.name;
        this.exchange = 'gdax';
        this.keys = {key, secret, passphrase};
        this.position = new Map();
        this.status = null;

        this.initialize();
    }

    initialize(){
        this.loadPosition();
        this.loadOrders();
        //Watch for other changes
        for(const symbol of via.symbols.findByExchange('gdax')){
            this.disposables.add(this.websocket.subscribe(symbol.id, 'user', event => this.update(event)));
        }
    }

    update(event){
        if(['received', 'open', 'done', 'match', 'change', 'activate'].includes(event.type)){
            let order = via.orders.find(event.order_id);

            if(order){
                return order.lifecycle(event);
            }

            //TODO pending orders (orders that have not yet been transmitted)
            // if(event.client_oid){
            //     order = via.orders.pending(event.client_oid);
            //
            //     if(order){
            //         return order.lifecycle(event);
            //     }
            // }

            if(event.type === 'received'){
                this.disposables.add(via.orders.add(Order.received(event, this)));
            }else{
                console.error(`Order ${event.order_id} was not found.`);
            }
        }
    }

    loadPosition(){
        return Helpers.request(this.keys, 'GET', '/position')
        .then(response => {
            this.updateStatus(response.data.status);

            for(const [currency, position] of Object.entries(response.data.accounts)){
                this.updatePosition(currency, Helpers.position(position));
            }
        })
        .catch(error => console.error(error));
    }

    loadOrders(){
        return Helpers.request(this.keys, 'GET', '/orders?status=all')
        .then(response => {
            this.disposables.add(via.orders.add(response.data.map(o => new Order(o, this))));
        });
    }

    updateStatus(status){
        if(this.status !== status){
            this.status = status;
            this.emitter.emit('did-change-status', status);
        }
    }

    updatePosition(currency, position){
        if(!_.isEqual(position, this.position.get(currency))){
            this.position.set(currency, position);
            this.emitter.emit('did-update-position', {currency, position});
        }
    }

    destroy(){
        //TODO this method needs to be async, because we have to do shutdown processes / ask for confirmations
        //TODO this method may have to kill orders and stuff
        this.disposables.dispose();
    }
}
