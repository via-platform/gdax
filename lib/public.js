const Helpers = require('./helpers');
const {CompositeDisposable, Disposable} = require('via');
const axios = require('axios');
const base = 'https://api-public.sandbox.gdax.com';

module.exports = class Public {
    constructor(websocket){
        this.disposables = new CompositeDisposable();
        this.websocket = websocket;
    }

    matches(symbol, callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'matches', message => callback({
            date: new Date(message.time),
            price: parseFloat(message.price),
            size: parseFloat(message.size),
            side: message.side,
            id: message.trade_id
        }));
    }

    ticker(symbol, callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'ticker', message => callback({
            date: new Date(),
            price: parseFloat(message.price)
        }));
    }

    orderbook(symbol, callback){
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'level2', message => {
            if(message.type === 'snapshot'){
                callback({type: message.type, bids: message.bids, asks: message.asks});
            }else if(message.type === 'l2update'){
                callback({type: 'update', changes: message.changes});
            }
        });
    }

    history(symbol){
        const id = symbol.identifier.slice(symbol.source.length + 1);

        return axios.get(`${base}/products/${id}/trades`)
        .then(response => response.data.map(datum => {
            // debugger;
            // let [time, trade_id, price, size, side] = datum;
            return {date: new Date(datum.time), id: datum.trade_id, price: parseFloat(datum.price), size: parseFloat(datum.size), side: datum.side};
        }));
    }

    data({symbol, granularity, start, end}){
        const id = symbol.identifier.slice(symbol.source.length + 1);

        return axios.get(`${base}/products/${id}/candles`, {params: {start: start.toISOString(), end: end.toISOString(), granularity: granularity / 1000}})
        .then(response => response.data.map(datum => {
            let [date, low, high, open, close, volume] = datum;
            return {date: new Date(date * 1000), low, high, open, close, volume};
        }));
    }

    destroy(){
        this.disposables.dispose();
    }
}
