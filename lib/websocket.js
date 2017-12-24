const Socket = require('ws');
const {CompositeDisposable, Disposable, Emitter} = require('via');
const SocketURI = 'wss://ws-feed.gdax.com';

const Types = {
    heartbeat: ['heartbeat'],
    subscribe: ['subscribe'],
    subscriptions: [],
    last_match: [],
    ticker: ['ticker'],
    snapshot: ['level2'],
    l2update: ['level2'],
    received: ['full'],
    open: ['full'],
    done: ['full'],
    match: ['full', 'matches'],
    change: ['full'],
    activate: ['user'],
    margin_profile_update: ['user'],
};

module.exports = class Websocket {
    constructor(options = {}){
        this.status = 'disconnected';
        this.subscriptions = [];
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.opened = false;
        this.interval = null;

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

            this.interval = setInterval(this.heartbeat.bind(this), 20000);
        }

        return this;
    }

    disconnect(){
        if(this.connection){
            this.connection.close();
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
            console.log('channels');
            console.log(channels);
            this.send({type: 'subscribe', channels});
            // this.send({type: 'heartbeat', on: true});
        }else{
            this.close();
        }
    }

    send(data){
        if(this.opened){
            this.connection.send(JSON.stringify(data));
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

        if(!channels){
            console.error(`Channel not found: ${message.type}`);
            return;
        }

        const subscriptions = this.subscriptions.filter(group => channels.includes(group.channel) && group.id === id);

        for(let subscription of subscriptions){
            subscription.callback(message);
        }
    }

    error(){
        console.error('Error');
    }

    connected(){

    }

    disconnected(){

    }

    heartbeat(){
        // this.send();
    }

    connectedToChannel(channel){
        return !!this.subscriptions.filter(sub => sub.channel === channel).length;
    }

    subscribe(id, channel, callback){
        const group = {id, channel, callback};
        this.connect();
        this.subscriptions.push(group);

        this.send({
            type: 'subscribe',
            channels: [{
                name: channel,
                product_ids: [id]
            }]
        });

        return new Disposable(() => this.unsubscribe(group));
    }

    unsubscribe(group){
        //TODO before sending the unsubscribe message, make sure that there are no other listeners watching it
        this.send({type: 'unsubscribe', channels: [{name: group.channel, product_ids: [group.id]}]});
        this.subscriptions.splice(this.subscriptions.indexOf(group), 1);

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
