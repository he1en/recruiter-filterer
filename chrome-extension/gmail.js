console.log('hello gmail')

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

function doStuff() {
  console.log('dostuff')
  chrome.identity.getAuthToken(
    {'interactive': true},
    function(token) {
      sendQuery('users/me/profile', 'GET', token, data => console.log(data));
    }
  )
}


//function authorize_gmail() {
//    gapi.auth.authorize
