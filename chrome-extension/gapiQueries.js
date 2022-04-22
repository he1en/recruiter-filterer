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
  const parsedMessages = [];
  const messageIDs = await sendGet('messages', {maxResults: 15}, authToken);
  for (var i = 0; i < messageIDs.messages.length; i++) {
    const messageId = messageIDs.messages[i].id;
    const messageResponse = await sendGet(`messages/${messageId}`, {}, authToken);
    parsedMessages.push(parseMessage(messageResponse));
  }
  return parsedMessages;
}


function decodeBody(body) {
  return atob(body.replace(/-/g, '+').replace(/_/g, '/'))
}


class Message {
  constructor(id, payload) {
    this.id = id;
    this.headers = payload.headers;

    if (payload.mimeType.includes("multipart")) {
      const parts = payload.parts;
      for (var i = 0; i < parts.length; i++) {
        this.parsePart(parts[i]);
      }
    } else {
      this.parsePart(payload);
    }
  }

  parsePart(part) {
    if (part.mimeType.includes("html")) {
      this.htmlBody = decodeBody(part.body.data);
    } else if (part.mimeType.includes("plain")) {
      this.plainTextBody = decodeBody(part.body.data);
    } else {
      console.log("noncorming part in message id " + this.id);
      console.log(part);
    }
  }

  getSubject() {
    for (var i = 0; i < this.headers.length; i++) {
      if (this.headers[i].name == 'Subject') {
        return this.headers[i].value;
      }
    }
  }
}


function parseMessage(message) {
  // message looks like https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message
  const parsedMessage = new Message(message.id, message.payload);
  console.log('parsed ' + parsedMessage.getSubject());
  return parsedMessage;
}
