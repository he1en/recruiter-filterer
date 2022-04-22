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
      fetch(
	'https://gmail.googleapis.com/gmail/v1/users/me/profile',
	{
	  method: 'GET',
	  headers: {
	    authorization: `Bearer ${token}`
	  }
	}
      ).then(response => response.json()).then(data => console.log(data))
    }
  )
}


//function authorize_gmail() {
//    gapi.auth.authorize
