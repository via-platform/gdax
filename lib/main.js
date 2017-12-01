const axios = require('axios');
const num = require('num');
const {CompositeDisposable, Disposable} = require('via');
const Websocket = require('./websocket');

const BaseURI = 'https://api.gdax.com';
const SocketURI = 'wss://ws-feed.gdax.com';

class GDAXAdapter {
    constructor(){
        this.maxCandlesFromRequest = 200;
        this.resolution = 1000;
    }

    activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();
    }

    deactivate(){
        //Unregister the symbols
        //Close any active connections
        //Close any open panes

        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    matches(symbol, callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'matches', message => callback({
            date: new Date(),
            price: num(message.price)
        }));
    }

    ticker(symbol, callback){
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'ticker', message => callback({
            date: new Date(),
            price: num(message.price)
        }));
    }

    orderbook(level, symbol, callback){
        const channel = (level === 2) ? 'level2' : 'full';

        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), channel, message => {
            if(message.type === 'snapshot'){
                callback({type: message.type, bids: message.bids, asks: message.asks});
            }else if(message.type === 'l2update'){
                callback({type: 'update', changes: message.changes});
            }else{
                callback({
                    type: message.type,
                    time: new Date(message.time),
                    sequence: message.sequence,
                    id: message.order_id,
                    size: num(message.size),
                    price: num(message.price),
                    side: message.side
                });
            }
        });
    }

    data({symbol, granularity, start, end}){
        const id = symbol.identifier.slice(symbol.source.length + 1);

        return axios.get(`${BaseURI}/products/${id}/candles`, {params: {start: start.toISOString(), end: end.toISOString(), granularity: granularity / 1000}})
        .then(response => response.data.map(datum => {
            let [date, low, high, open, close, volume] = datum;
            return {date: new Date(date * 1000), low, high, open, close, volume};
        }));
    }
}

module.exports = new GDAXAdapter();
