const {Disposable, CompositeDisposable, Emitter} = require('via');

module.exports = class Ticker {
    constructor({websocket, id}){
        this.websocket = websocket;
        this.subscriptions = [];
        this.id = id;
    }

    subscribe(callback){
        if(!this.subscriptions.length){
            this.websocket.subscribe({channel: 'ticker', id: this.id});
        }

        this.subscriptions.push(callback);
        return new Disposable(() => this.unsubscribe(callback));
    }

    unsubscribe(callback){
        this.subscriptions.splice(this.subscriptions.indexOf(callback));

        if(!this.subscriptions.length){

        }
    }
}
