console.log('training')
gapi = require ('./chrome-extension/gapiQueries');

const authToken = process.env.AUTH_TOKEN;
gapi.getMessages(authToken, 2).then(messages => {
    for (var i = 0; i < messages.length; i++) {
        console.log(messages[i].getSubject());
    };
});
