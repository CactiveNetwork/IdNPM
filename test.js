console.clear();

const { Client } = require('./dist');
const Connections = new Client('...', {
    // verbose: true
    // base_url: 'http://localhost:2525',
    // socket_url: 'ws://localhost:2525'
})

Connections.on('ready', async () => {

    // Oauth!

    const refresh = await Connections.oauthIdentify(
        '',
        '',
        '',
        'http://',
        ['identify']
    )

    console.log('Refresh token: ' + refresh);

    const access = await Connections.refreshToken(
        refresh
    )

    console.log('Access token: ' + access);

    const user = await Connections.getUserByAccessToken(
        access
    )

    console.log(user);

})

