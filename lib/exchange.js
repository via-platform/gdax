const Axios = require('axios');
const Path = require('path');
const {CompositeDisposable, Disposable} = require('via');
const Symbol = require('./symbol');
const Websocket = require('./websocket');

const BaseURI = 'https://api.gdax.com';
const SocketURI = 'wss://ws-feed.gdax.com';

class Exchange {
    activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();
        // console.log('activated gdax');

        // this.disposables.add(via.exchanges.add(this.exchange));

        this.products().then(products => {
            // Register the symbols
            // TODO Keep track of which ones we've registered here, so they can be removed later
            via.symbols.add(products.map(product => new Symbol({websocket: this.websocket, product})));
        });

        //Add an opener for gdax:// paths
    }

    deactivate(){
        //Unregister the symbols
        //Close any active connections
        //Close any open panes

        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    provideGDAX(){
        return this;
    }

    products(){
        return Axios.get(Path.join(BaseURI, 'products')).then(res => res.data);
    }
}

module.exports = new Exchange();
