const axios = require('axios');
const Path = require('path');
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

    ticker(symbol, callback){
        return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'ticker', callback);
    }

    data({symbol, granularity, start, end}){
        const id = symbol.identifier.slice(symbol.source.length + 1);

        return axios.get(`${BaseURI}/products/${id}/candles`, {params: {start: start.toISOString(), end: end.toISOString(), granularity: granularity / 1000}})
        .then(response => response.data.map(datum => {
            let [date, low, high, open, close, volume] = datum;
            return {date: new Date(date * 1000), low, high, open, close, volume};
        }));
    }

    products(){
        return axios.get(Path.join(BaseURI, 'products')).then(res => res.data);
    }
}

module.exports = new GDAXAdapter();
