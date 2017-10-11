const axios = require('axios');
const {Disposable, CompositeDisposable, Emitter} = require('via');
const Orderbook = require('./orderbook');
const Ticker = require('./ticker');
const BaseURI = 'https://api.gdax.com';

module.exports = class Symbol {
    constructor({product, websocket}){
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.type = 'currency';
        this.exchange = 'GDAX';
        this.categories = ['GDAX'];
        this.base = product.base_currency;
        this.quote = product.quote_currency;
        this.eid = product.id;
        this.increment = product.quote_increment;
        this.name = product.display_name;
        this.uri = 'GDAX:' + product.id;
        this.id = 'GDAX:' + product.id;
        this.realtime = true;
        this.orderbook = new Orderbook({websocket, id: product.id});
        this.ticker = new Ticker({websocket, id: product.id});
        this.subscribed = false;
        this.websocket = websocket;
        this.subscriptions = [];

        this.data = via.caches.add({
            source: this.source.bind(this),
            resolution: 1000,
            maxCandlesFromRequest: 200
        });
    }

    getTitle(){
        return this.name;
    }

    source(params){
        return axios.get(`${BaseURI}/products/${this.eid}/candles`, {
            params: {
                start: params.start ? params.start.toISOString() : '',
                end: params.end ? params.end.toISOString() : '',
                granularity: params.granularity / 1000
            }
        })
        .then(response => {
            //Format the data
            return response.data.map(datum => {
                let [date, low, high, open, close, volume] = datum;
                return {date: new Date(date * 1000), low, high, open, close, volume};
            });
        });
    }

    subscribe(){
        if(this.subscribed){
            return;
        }

        this.emitter.emit('on-will-subscribe');
        this.websocket.subscribe({id: this.eid});
    }

    ticker(callback){

    }
}
