console.log('hello from gmail.js')

//oauth2 auth
//chrome.identity.getAuthToken(
//  {'interactive': true},
 // function(token) {
  //  console.log('oauth token: ', token);
  //}
//);

window.onload = function() {
  document.querySelector('button').addEventListener('click', doStuff)
};

async function doStuff() {
  console.log('button clicked')
  chrome.identity.getAuthToken(
    {'interactive': true},
    async function (authToken) {
      const messages = await getMessages(authToken);
      // const messageIDsToLabel = filterMessages(messages);
      // labelMessages(messageIDsToLabel);
    }
  );
}
