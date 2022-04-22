function sendQuery(path, requestMethod, body, authToken, callbackFn) {
  var requestContent = {
    method: requestMethod,
    headers: {
      authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  }
  if (body.length) {
    requestContent.body = JSON.stringify(body)
  }
  fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/' + path,
    requestContent
  ).then(response => response.json()).then(data => callbackFn(data))
}

function sendGet(path, params, authToken, callbackFn) {
  pathWithParams = path + '?' + ( new URLSearchParams( params ) ).toString();
  sendQuery(pathWithParams, 'GET', {}, authToken, callbackFn);
}

function mapMessageIDs(authToken, messageOperationFn) {
  sendGet(
    'messages',
    {maxResults: 3},
    authToken,
    function (responsePayload) {
      for (var i = 0; i < 3; i++) {
        const messageId = responsePayload.messages[i].id;
        sendGet(`messages/${messageId}`, {}, authToken, printMessageContent);
      }
    }
  );
}

function decodeBody(body) {
  return atob(body.replace(/-/g, '+').replace(/_/g, '/'))
}

function printMessageContent(message) {
  // MessagePayload looks like https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message
  console.log()
  console.log('------------------------------')
  console.log(message);
  const headers = message.payload.headers;
  for (var j = 0; j < headers.length; j++) {
    if (headers[j].name == 'Subject') {
      console.log(headers[j].value)
    }
    //console.log(headers[j].name)
  }
  if (message.payload.body.size > 0) {
    console.log(decodeBody(message.payload.body.data));
  }

  const parts = message.payload.parts;
  if (parts !== undefined) {
    for (var k = 0; k < parts.length; k++) {
      console.log(parts[k].mimeType)
      //console.log(Utilities.base64Decode(parts[k].body.data))
      console.log(decodeBody(parts[k].body.data));
    }
  }

}

function messagesTemp(authToken) {
  mapMessageIDs(authToken, printMessageContent)
}
