console.clear();

const { Client } = require('./dist');
const Connections = new Client('874ed3a298efea3a92861bc763d7055d', {
    base_url: 'http://localhost:2525',
    socket_url: 'ws://localhost:2525/socket'
})

Connections.on('ready', async () => {

    await Connections.registerService('floral', {
        premium: false
    })

    let target = await Connections.getUser('5c8a4207-b391-4fe8-9205-f3a636faddf6');
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

