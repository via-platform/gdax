const crypto = require('crypto');
const axios = require('axios');
// const base = 'https://api-public.sandbox.gdax.com';
const base = 'https://api.gdax.com';

const Helpers = {
    key: config => {
        if(!config.apiKey || !config.apiSecret || !config.apiPassphrase){
            throw new Error('Missing a required parameter. API key, secret, and passphrase are all required fields.');
        }

        return JSON.stringify([config.apiKey, config.apiSecret, config.apiPassphrase]);
    },
    sign: ({key, secret, passphrase}, method, path, params) => {
        const timestamp = Date.now() / 1000;
        const prehash = timestamp + method + path + (method === 'POST' ? JSON.stringify(params) : '');
        const hmac = crypto.createHmac('sha256', Buffer(secret, 'base64'));
        const signature = hmac.update(prehash).digest('base64');

        return {key, signature, timestamp, passphrase};
    },
    request: (keys, method, path, params) => {
        const signed = Helpers.sign(keys, method, path, params);

        return axios({
            method,
            url: base + path,
            params: (method === 'GET') ? params : undefined,
            data: (method !== 'GET') ? params : undefined,
            headers: {
                'CB-ACCESS-KEY': signed.key,
                'CB-ACCESS-SIGN': signed.signature,
                'CB-ACCESS-TIMESTAMP': signed.timestamp,
                'CB-ACCESS-PASSPHRASE': signed.passphrase
            }
        });
    },
    ticker: d => ({date: new Date(), price: parseFloat(d.price)}),
    data: d => ({date: new Date(d[0] * 1000), low: d[1], high: d[2], open: d[3], close: d[4], volume: d[5]}),
    matches: d => ({date: new Date(d.time), price: parseFloat(d.price), size: parseFloat(d.size), side: d.side, id: d.trade_id}),
    history: d => ({date: new Date(d.time), id: d.trade_id, price: parseFloat(d.price), size: parseFloat(d.size), side: d.side}),
    position: d => ({id: d.id, balance: parseFloat(d.balance), hold: parseFloat(d.hold), funded: parseFloat(d.funded_amount), default: parseFloat(d.default_amount)}),
    symbol: id => via.symbols.findByIdentifier(`GDAX:${id}`)
};

module.exports = Helpers;
