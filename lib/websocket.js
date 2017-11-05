const Socket = require('ws');
const {CompositeDisposable, Disposable, Emitter} = require('via');
const EventEmitter = require('events');
const SocketURI = 'wss://ws-feed.gdax.com';

module.exports = class Websocket extends EventEmitter {
    constructor(options = {}){
        super();
        this.status = 'disconnected';
        this.subscriptions = [];
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.opened = false;

        return this;
    }

    connect(){
        if(!this.connection){
            this.connection = new Socket(SocketURI);

            //Add event listeners to the websocket
            this.connection.on('message', this.message.bind(this));
            this.connection.on('open', this.open.bind(this));
            this.connection.on('close', this.close.bind(this));
            this.connection.on('error', this.error.bind(this));
        }

        return this;
    }

    disconnect(){
        if(this.connection){
            this.connection.close();
            this.connection = null;
        }
    }

    open(){
        this.emitter.emit('did-open');
        this.opened = true;

        console.log('Opened connection');

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
            console.log('channels');
            console.log(channels);
            this.send({type: 'subscribe', channels});
            // this.send({type: 'heartbeat', on: true});
        }else{
            this.close();
        }
    }

    send(data){
        this.connection.send(JSON.stringify(data));
    }

    close(){
        console.log("Closed connection");
        this.emitter.emit('did-close');
        this.opened = false;
    }

    message(data){
        const message = JSON.parse(data);
        const channel = message.type;
        const id = message.product_id;
        const subscriptions = this.subscriptions.filter(group => group.channel === channel && group.id === id);

        for(let subscription of subscriptions){
            subscription.callback(message);
        }
    }

    error(){
        console.log("ERROR");
    }

    connected(){

    }

    disconnected(){

    }

    connectedToChannel(channel){
        return !!this.subscriptions.filter(sub => sub.channel === channel).length;
    }

    subscribe(id, channel, callback){
        const group = {id, channel, callback};
        this.connect();
        this.subscriptions.push(group);

        if(this.opened){
            this.send({
                type: 'subscribe',
                channels: [{
                    name: channel,
                    product_ids: [id]
                }]
            });
        }

        return new Disposable(() => this.unsubscribe(group));
    }

    unsubscribe(group){
        this.send({type: 'unsubscribe', channels: [{name: group.channel, product_ids: [group.id]}]});
        this.subscriptions.splice(this.subscriptions.indexOf(group), 1);

        if(!this.subscriptions.length){
            this.disconnect();
        }
    }

    destroy(){
        this.disconnect();
        this.disposables.dispose();
        this.subscriptions = null;
        this.emitter.emit('did-destroy');
        this.emitter = null;
    }
}
