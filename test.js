console.clear();

const { Client } = require('./dist');
const Connections = new Client('...', {
    // verbose: true
    // base_url: 'http://localhost:2525',
    // socket_url: 'ws://localhost:2525'
})

Connections.on('ready', async () => {

    console.log(await (await Connections.getUser('b155824b-4eba-4577-9aef-51f8ebe9f801')).email_verified)

})

