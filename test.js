console.clear();

const { Client } = require('./dist');
const Connections = new Client('', {
    // base_url: 'http://localhost:2525',
    // socket_url: 'ws://localhost:2525/socket'
})

Connections.on('ready', async () => {

    let target = await Connections.getUser('b41271f4-da9f-4ddd-99fb-635a8ff0f36a');
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

