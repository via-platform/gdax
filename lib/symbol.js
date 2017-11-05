const axios = require('axios');
const {Disposable, CompositeDisposable, Emitter} = require('via');
const Orderbook = require('./orderbook');
const Ticker = require('./ticker');
const Data = require('./data');
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
        // this.data = new Data({websocket, ticker: this.ticker, id: product.id});
        this.subscribed = false;
        this.websocket = websocket;

        this.subscriptions = {};
        this.caches = {};

        if(this.eid.indexOf('BTC') === 0){
            this.categories.push('BTC');
            this.categories.push('BTC/GDAX');
        }
    }

    data(granularity){
        //TODO ultimately, this needs to share between the same data sources
        //so we don't have redundancy at each level of granularity
        return new Data({granularity, websocket: this.websocket, ticker: this.ticker, id: this.eid});
        // if(this.caches[granularity]){
        //     this.subscriptions[granularity]++;
        //     return this.caches(granularity);
        // }
    }

    getTitle(){
        return this.name;
    }
}
