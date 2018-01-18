const {CompositeDisposable} = require('via');
const Helpers = require('./helpers');
const Websocket = require('./websocket');
const Symbol = require('./symbol');
const Account = require('./account');

class GDAX {
    constructor(){}

    async activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();

        const symbols = await Symbol.all();

        for(const symbol of symbols){
            this.disposables.add(via.symbols.add(new Symbol(symbol, this.websocket)));
        }

        const accounts = await via.accounts.loadAccountsFromStorage('gdax');

        for(const account of accounts){
            this.disposables.add(via.accounts.activate(new Account(account)));
        }
    }

    deactivate(){
        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    async account(config){
        const account = await via.accounts.add({name: config.accountName, exchange: 'gdax', key: Helpers.key(config)});
        this.disposables.add(via.accounts.activate(new Account(account)));
    }

    title(){
        return 'GDAX';
    }
}

module.exports = new GDAX();
