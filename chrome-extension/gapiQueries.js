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
  return response.json();
}


async function sendGet(path, params, authToken) {
  pathWithParams = path + '?' + (new URLSearchParams(params)).toString();
  return sendQuery(pathWithParams, 'GET', null, authToken);
}

async function sendPost(path, body, authToken) {
  return sendQuery(path, 'POST', body, authToken);
}


async function getMessages(authToken, maxMessages) {
  // return value is array of https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message
  const messagesResponse = await sendGet('messages', {maxResults: maxMessages}, authToken);
  const messages = messagesResponse.messages;  // these are {id: <string>, threadID: <string>} objects

  // todo check concurrency
  const messagePromises = messages.map(async function(message) {
    return await sendGet(`messages/${message.id}`, {}, authToken);
  });
  return await Promise.all(messagePromises);
}


async function labelMessages(messageIDs, labelID, authToken) {
  const requestBody = {
    ids: messageIDs,
    addLabelIds: [labelID]
  };
  const response = await sendPost("messages/batchModify", requestBody, authToken);
  // todo check response
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
  return createLabel(labelName, authToken);
}

// todo this logs an error in browser
module.exports = {
  getMessages,
  getOrCreateLabel,
  labelMessages
};
