const {Emitter, CompositeDisposable} = require('via');
const _ = require('underscore-plus');
const axios = require('axios');

const Helpers = require('./helpers');
const url = 'https://api.gdax.com'; //'https://api-public.sandbox.gdax.com';

module.exports = class Symbol {
    static all(){
        return axios.get(`${url}/products`).then(response => response.data);
    }

    constructor(params, websocket){
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.websocket = websocket;

        this.id = params.id;
        this.name = params.id;
        this.exchange = 'gdax';
        this.categories = ['GDAX'];
        this.description = 'GDAX';
        this.available = (params.status === 'online');

        this.granularity = 60000; //Smallest candlestick size available
        this.precision = 8; //Number of decimal places to support
        this.aggregation = params.quote_increment.split('.').pop().length; //Number of decimal places to round to / group by for display purposes

        this.identifier = 'GDAX:' + params.id;
        this.base = params.base_currency;
        this.quote = params.quote_currency;
        this.baseMinSize = parseFloat(params.base_min_size);
        this.baseMaxSize = parseFloat(params.base_max_size);
        this.quoteIncrement = parseFloat(params.quote_increment);
        this.marginEnabled = params.marginEnabled;
    }

    data({granularity, start, end}){
        const params = {start: start.toISOString(), end: end.toISOString(), granularity: granularity / 1000};
        return axios.get(`${url}/products/${this.id}/candles`, {params}).then(response => response.data.map(Helpers.data))
    }

    history(){
        return axios.get(`${url}/products/${this.id}/trades`).then(response => response.data.map(Helpers.history));
    }

    orderbook(callback){
        return this.websocket.subscribe(this.id, 'level2', message => {
            if(message.type === 'snapshot'){
                callback({type: message.type, bids: message.bids, asks: message.asks});
            }else if(message.type === 'l2update'){
                callback({type: 'update', changes: message.changes});
            }
        });
    }

    matches(callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(this.id, 'matches', message => callback(Helpers.matches(message)));
    }

    ticker(callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(this.id, 'ticker', message => callback(Helpers.ticker(message)));
    }
}
