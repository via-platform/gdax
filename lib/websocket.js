const Socket = require('ws');
const {CompositeDisposable, Disposable, Emitter} = require('via');
const SocketURI = 'wss://ws-feed.gdax.com';

module.exports = class Websocket {
    constructor(options = {}){
        this.status = 'disconnected';
        this.subscriptions = new Map();
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();

        console.log('constructor for websocket');

        return this;
    }

    connect(){
        if(!this.connection){
            console.log('Connecting!');
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

        console.log('Opened connection');

        if(this.subscriptions.size){
            let channels = [];
            this.subscriptions.forEach((product_ids, name) => channels.push({name, product_ids}));
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
    }

    message(data){
        console.log(`Message:`, JSON.parse(data));
    }

    error(){
        console.log("ERROR");
    }

    connected(){

    }

    disconnected(){

    }

    subscribe({channel, id}){
        if(!this.subscriptions.has(channel)){
            this.subscriptions.set(channel, []);
        }

        if(this.subscriptions.get(channel).includes(id)){
            return;
        }

        this.subscriptions.get(channel).push(id);
        this.connect();
        return new Disposable(() => this.unsubscribe({channel, id}));
    }

    unsubscribe({channel, id}){
        if(!this.subscriptions.has(channel)){
            return;
        }

        if(this.subscriptions.get(channel).includes(id)){
            this.subscriptions.splice(this.subscriptions.indexOf(id), 1);
        }

        if(!this.subscriptions.get(channel).length){
            this.subscriptions.delete(channel);
        }

        if(!this.subscriptions.size){
            this.disconnect();
        }
    }

    destroy(){
        this.disconnect();
        this.disposables.dispose();
        this.subscriptions.clear();
        this.emitter.emit('did-destroy');
        this.emitter = null;
    }
}
