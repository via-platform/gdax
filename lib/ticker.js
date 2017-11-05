const {Disposable, CompositeDisposable, Emitter} = require('via');

module.exports = class Ticker {
    constructor({websocket, id}){
        this.websocket = websocket;
        this.websocketDisposable = null;
        this.emitter = new Emitter();
        this.disposables = new CompositeDisposable();
        this.subscriptions = [];
        this.id = id;
        this.last = null;
    }

    subscribe(callback){
        if(!this.subscriptions.length){
            this.websocketDisposable = this.websocket.subscribe(this.id, 'ticker', this.message.bind(this));
        }

        this.subscriptions.push(callback);
        return new Disposable(() => this.unsubscribe(callback));
    }

    unsubscribe(callback){
        this.subscriptions.splice(this.subscriptions.indexOf(callback));

        if(!this.subscriptions.length && this.websocketDisposable){
            this.websocketDisposable.dispose();
        }
    }

    message(data){
        this.last = {
            price: parseFloat(data.price),
            bid: parseFloat(data.best_bid),
            ask: parseFloat(data.best_ask),
            size: data.last_size ? parseFloat(data.last_size) : 0,
            // high: (data.high_24h),
            // low: (data.low_24h),
            // open: data.low_24h,
            // close: data.low_24h,
            // volume: data.low_24h,
            side: data.side,
            date: data.time ? new Date(data.time) : new Date(),
            granularity: 846e5
        };

        for(let callback of this.subscriptions){
            callback(this.last);
        }
    }

    destroy(){
        if(this.websocketDisposable){
            this.websocketDisposable.dispose();
        }

        this.disposables.dispose();
        this.emitter = null;
        this.subscriptions = null;
        this.websocket = null;
    }
}
