const Socket = require('ws');
const {CompositeDisposable, Disposable, Emitter} = require('via');
const Helpers = require('./helpers');
// const SocketURI = 'wss://ws-feed-public.sandbox.gdax.com'; //'wss://ws-feed.gdax.com'
const SocketURI = 'wss://ws-feed.gdax.com'

const Types = {
    heartbeat: ['heartbeat'],
    subscribe: ['subscribe'],
    subscriptions: [],
    last_match: [],
    ticker: ['ticker'],
    snapshot: ['level2'],
    l2update: ['level2'],
    received: ['full', 'user'],
    open: ['full', 'user'],
    done: ['full', 'user'],
    match: ['full', 'matches', 'user'],
    change: ['full', 'user'],
    activate: ['user'],
    margin_profile_update: ['user']
};

module.exports = class Websocket {
    constructor(options = {}){
        this.status = 'disconnected';
        this.subscriptions = [];
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.opened = false;
        this.interval = null;
        this.account = options.account;
    }

    connect(){
        if(!this.connection){
            this.connection = via.websockets.create(SocketURI);

            this.disposables.add(this.connection.onDidOpen(this.open.bind(this)));
            this.disposables.add(this.connection.onDidClose(this.close.bind(this)));
            this.disposables.add(this.connection.onDidReceiveMessage(this.message.bind(this)));

            // this.interval = setInterval(this.heartbeat.bind(this), 20000);
        }
    }

    disconnect(){
        if(this.connection){
            via.websockets.destroy(this.connection);
            this.connection = null;
            this.opened = false;
        }
    }

    open(){
        this.emitter.emit('did-open');
        this.opened = true;

        if(this.subscriptions.length){
            let idsByChannel = {};

            for(let subscription of this.subscriptions){
                if(idsByChannel[subscription.channel]){
                    idsByChannel[subscription.channel].push(subscription.id);
                }else{
                    idsByChannel[subscription.channel] = [subscription.id];
                }
            }

            let channels = Object.entries(idsByChannel).map(([name, ids]) => ({name, product_ids: ids}));
            let subscribe = {type: 'subscribe', channels};

            if(this.account){
                Object.assign(subscribe, Helpers.sign(this.account.keys, 'GET', '/users/self/verify'));
            }

            this.connection.send(subscribe);
        }else{
            this.close();
        }
    }

    close(){
        if(this.interval){
            clearInterval(this.interval);
        }

        this.emitter.emit('did-close');
        this.opened = false;
    }

    message(data){
        const message = JSON.parse(data);
        const channels = Types[message.type];
        const id = message.product_id;

        // if(message.type !== 'heartbeat'){
        //     console.log('RECEIVED A MESSAGE', data);
        // }

        if(!channels){
            console.error(`Channel not found: ${message.type}`);
            return;
        }

        const subscriptions = this.subscriptions.filter(group => channels.includes(group.channel) && group.id === id);

        for(let subscription of subscriptions){
            if(subscription.callback){
                subscription.callback(message);
            }
        }
    }

    subscribe(id, channel, callback){
        const group = {id, channel, callback};
        this.connect();
        this.subscriptions.push(group);

        //TODO find a more elegant solution for GDAX's terrible heartbeat system
        // this.subscriptions.push({id, channel: 'heartbeat'});

        let subscribe = {
            type: 'subscribe',
            channels: [{name: channel, product_ids: [id]}] //, {name: 'heartbeat', product_ids: [id]}
        };

        if(this.account){
            Object.assign(subscribe, Helpers.sign(this.account.keys, 'GET', '/users/self/verify'));
        }

        this.connection.send(subscribe);

        return new Disposable(() => this.unsubscribe(group));
    }

    unsubscribe(group){
        //TODO before sending the unsubscribe message, make sure that there are no other listeners watching it
        this.connection.send({type: 'unsubscribe', channels: [{name: group.channel, product_ids: [group.id]}]});
        this.subscriptions.splice(this.subscriptions.indexOf(group), 1);
        // console.log('Unsubbing from', group, this.subscriptions)

        if(!this.subscriptions.length){
            this.disconnect();
        }
    }

    destroy(){
        if(this.interval){
            clearInterval(this.interval);
        }

        this.disconnect();
        this.disposables.dispose();
        this.subscriptions = null;
        this.emitter.emit('did-destroy');
        this.emitter = null;
    }
}
