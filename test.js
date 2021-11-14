console.clear();

const { Client } = require('./dist');
const Connections = new Client('652067bb0d90f3585d955eb7d6d26d64', {
    // base_url: 'http://localhost:2525',
    // socket_url: 'wss://api.cactive.network/socket'
})

Connections.on('ready', () => {

})

