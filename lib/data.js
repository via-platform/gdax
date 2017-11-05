const {Disposable, CompositeDisposable, Emitter} = require('via');
const TimeSeriesCache = require('time-series-cache');
const Axios = require('axios');
const BaseURI = 'https://api.gdax.com';

module.exports = class Data {
    constructor({granularity, ticker, id}){
        this.id = id;
        this.ticker = ticker;
        this.granularity = granularity;
        this.maxCandlesFromRequest = 200;
        this.resolution = 1000;

        this.emitter = new Emitter();
        this.disposables = new CompositeDisposable();
        this.cache = new TimeSeriesCache({granularity});

        this.disposables.add(this.ticker.subscribe(this.didReceiveTickerData.bind(this)));

        this.loadRecentCandles().then(() => this.nextCandle());
    }

    loadRecentCandles(){
        let end = this.nearestCandle(new Date());
        let start = new Date(end.getTime() - (this.maxCandlesFromRequest * this.granularity));
        return this.source({start, end});
    }

    nearestCandle(date){
        return new Date(Math.floor(date.getTime() / this.granularity) * this.granularity);
    }

    nextCandle(){
        let now = new Date();
        let nextCandleDate = this.nearestCandle(now).getTime() + this.granularity;

        if(!this.cache.has(now)){
            let close = this.cache.last().close;
            this.cache.add({date: now, open: close, high: close, low: close, close: close, volume: 0});
        }

        let timeout = setTimeout(() => this.nextCandle(), nextCandleDate - Date.now());
        this.nextCandleDisposable = new Disposable(() => clearTimeout(timeout));
    }

    didReceiveTickerData(data){
        // console.log('Updated the cache from ticker data');
        // console.log(this.cache.fetch(new Date(Date.now() - 5 * this.granularity), new Date()));
        this.cache.update(data);
        this.emitter.emit('did-update-data');
    }

    load(){

    }

    fetch({start, end}){
        return this.cache.fetch(start, end);
    }

    source(params){
        return Axios.get(`${BaseURI}/products/${this.id}/candles`, {
            params: {
                start: params.start ? params.start.toISOString() : '',
                end: params.end ? params.end.toISOString() : '',
                granularity: this.granularity / 1000
            }
        })
        .then(response => response.data.map(datum => {
            let [date, low, high, open, close, volume] = datum;
            return {date: new Date(date * 1000), low, high, open, close, volume};
        }))
        .then(candles => this.cache.add(candles))
        .then(() => this.emitter.emit('did-update-data'));
    }

    destroy(){
        if(this.nextCandleDisposable){
            this.nextCandleDisposable.dispose();
        }

        this.cache.destroy();
        this.emitter.emit('did-destroy');
        this.disposables.dispose();
        this.emitter.dispose();
        this.disposables = null;
        this.emitter = null;
    }

    onDidUpdateData(callback){
        return this.emitter.on('did-update-data', callback);
    }

    onDidDestroy(callback){
        return this.emitter.on('did-destroy', callback);
    }
}
