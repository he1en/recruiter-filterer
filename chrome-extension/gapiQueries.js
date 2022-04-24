async function sendQuery(path, requestMethod, body, authToken) {
  var requestContent = {
    method: requestMethod,
    headers: {
      authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  }
  if (body !== null) {
    requestContent.body = JSON.stringify(body)
  }

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/' + path,
    requestContent
  );
  // TODO handle errors
  console.log(response);
  return response.json();
}


async function sendGet(path, params, authToken) {
  pathWithParams = path + '?' + (new URLSearchParams(params)).toString();
  return sendQuery(pathWithParams, 'GET', null, authToken);
}

async function sendPost(path, body, authToken) {
  return sendQuery(path, 'POST', body, authToken);
}


async function getMessages(authToken) {
  const parsedMessages = [];
  const messageIDs = await sendGet('messages', {maxResults: 20}, authToken);
  for (var i = 0; i < messageIDs.messages.length; i++) {
    const messageId = messageIDs.messages[i].id;
    const messageResponse = await sendGet(`messages/${messageId}`, {}, authToken);
    parsedMessages.push(parseMessage(messageResponse));
  }
  return parsedMessages;
}


function decodeBody(body) {
  return atob(body.replace(/-/g, '+').replace(/_/g, '/'));
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


async function labelMessages(messageIDs, labelID, authToken) {
  const requestBody = {
    ids: messageIDs,
    addLabelIds: [labelID]
  };
  console.log(requestBody);
  const response = await sendPost("messages/batchModify", requestBody, authToken);
  // todo check response
  console.log('label response');
  console.log(response);
}

async function getLabelID(labelName, authToken) {
  const response = await sendGet("labels", {}, authToken);
  // todo if has more labels
  for (var i = 0; i < response.labels.length; i++) {
    if (response.labels[i].name.toLowerCase() == labelName.toLowerCase()) {
      return response.labels[i].id;
    }
  }
  return null;
}

async function createLabel(labelName, authToken) {
  const requestBody = {name: labelName};
  const response = await sendPost("labels", requestBody, authToken);
  return response.id;
}

async function getOrCreateLabel(labelName, authToken) {
  const existingLabelID = await getLabelID(labelName, authToken);
  if (existingLabelID) {
    return existingLabelID;
  }
  console.log('Creating new gmail label for your recruiting messages.')
  return createLabel(labelName, authToken);
}
