console.clear();

const { Client } = require('./dist');
const Connections = new Client('', {
    // base_url: 'http://localhost:2525',
    // socket_url: 'ws://localhost:2525'
})

Connections.on('ready', async () => {

    console.log('Ready');

    let target = await Connections.getUser('b155824b-4eba-4577-9aef-51f8ebe9f801');
    console.log(`Fetched ${target.display_name}!`);

    Connections.registerPayment(1, 'aud', async () => {
        await target.setService('floral', {
            premium: true
        });

        console.log(`${target.display_name} now has floral premium!`);
    })
        .then(url => console.log(`URL :: ${url}`))
        .catch(console.error);

})

