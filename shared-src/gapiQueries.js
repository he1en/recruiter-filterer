/**
 * @license
 * Copyright 2022 Helen Hastings
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

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

  if (!response.ok) {
    // no cases (yet) where we want to handle a 40X
    const response_body = await response.json();
    throw new Error(`${response.status} response from Google API: ${JSON.stringify(response_body)}`);
  }
  if (response.status == 204) {
    // 204 response code means no content. response.json() fails
    return {};
  }
  return response.json();
}


async function sendGet(path, params, authToken) {
  pathWithParams = path + '?' + (new URLSearchParams(params)).toString();
  return sendQuery(pathWithParams, 'GET', null, authToken);
}

async function sendPost(path, body, authToken) {
  return sendQuery(path, 'POST', body, authToken);
}


async function getMessages(authToken, maxMessages, beforeEpochMs, afterEpochMs, unreadOnly) {
  // return value is array of https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message

  if (maxMessages == null || maxMessages > 100) {
    // FIXME implement paging with sleeps
    // Gmail API starts giving "Too many concurrent requests for user" 429 errors at anything above 100
    if (maxMessages > 100) {
      console.log('Sorry, We\'re capping this query to 100 messages at once to avoid gmail api concurrency limits.');
    }
    maxMessages = 100;
  }

  var filterQuery = "";
  if (beforeEpochMs) {
    filterQuery = `before:${Math.floor(beforeEpochMs / 1000)} `;
  }
  if (afterEpochMs !== null && afterEpochMs > 0) {
    // after: 0 returns nothing instead of everything older than 0
    filterQuery += `after:${Math.floor(afterEpochMs / 1000)} `;
  }
  if (unreadOnly) {
    filterQuery += "is:unread";
  }

  var params = {maxResults: maxMessages};
  if (filterQuery.length) {
    params.q = filterQuery;
  }
  const messagesResponse = await sendGet('messages', params, authToken);
  const messages = messagesResponse.messages;  // these are {id: <string>, threadID: <string>} objects
  if (unreadOnly) {
    console.log(`Found ${messages.length} unread messages.`);
    if (messagesResponse.resultSizeEstimate > 100) {
      console.log('If you don\'t mark your emails as unread, this chrome extension probably wont work for you :(');
      console.log('Or if you really just do have a lot of unread emails today, keep refreshing to filter more recruiting emails.');
    }
  }

  // todo check concurrency
  const messagePromises = messages.map(async function(message) {
    return await sendGet(`messages/${message.id}`, {}, authToken);
  });
  return await Promise.all(messagePromises);
}


async function labelAndMarkAsUnread(messageIDs, labelID, authToken) {
  const requestBody = {
    ids: messageIDs,
    addLabelIds: [labelID],
    removeLabelIds: ['UNREAD']
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

async function threadHasLabel(threadID, labelID, authToken) {
  /**
   *  The Gmail UI only lets you apply a label to a thread as opposed to a single message,
   *  and sometimes it will only attach the labelID to the FIRST message on the thread. So to know
   *  for sure if a single message is logically part of a thread, you must check all messages in the
   *  thread.
   *
   * https://webapps.stackexchange.com/questions/74238/how-do-i-work-around-labels-being-applied-to-individual-messages-and-not-convers
   *
   */
  const response = await sendGet(`threads/${threadID}`, {}, authToken);
  const messages = response.messages;
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].labelIds.includes(labelID)) {
      return true;
    }
  }
  return false;
}


module.exports = {
  getMessages,
  getOrCreateLabel,
  labelAndMarkAsUnread,
  threadHasLabel
};
