async function sendQuery(path, requestMethod, body, authToken) {
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

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/' + path,
    requestContent
  );
  // TODO handle errors

  return response.json();
}


async function sendGet(path, params, authToken) {
  pathWithParams = path + '?' + (new URLSearchParams(params)).toString();
  return sendQuery(pathWithParams, 'GET', {}, authToken);
}


async function getMessages(authToken) {
  //const parsedMessages = [];
  const messageIDs = await sendGet('messages', {maxResults: 5}, authToken);
  for (var i = 0; i < messageIDs.messages.length; i++) {
    const messageId = messageIDs.messages[i].id;
    const messageResponse = await sendGet(`messages/${messageId}`, {}, authToken);
    const message = parseMessage(messageResponse);
    //parsedMessages[i] = message;
  }
}


function decodeBody(body) {
  return atob(body.replace(/-/g, '+').replace(/_/g, '/'))
}


function parseMessage(message) {
  // message looks like https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message
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

  // TODO change this to recurse only if mimeType is multipart/something
  if (message.payload.body.size > 0) {
    console.log(decodeBody(message.payload.body.data));
  }


  if ('parts' in message.payload) {
    const parts = message.payload.parts;
    for (var k = 0; k < parts.length; k++) {
      console.log(parts[k].mimeType)
      //console.log(Utilities.base64Decode(parts[k].body.data))
      console.log(decodeBody(parts[k].body.data));
    }
  }

}
