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

console.log('hello from gmail.js')

import {isRecruiting, getPlainTextFromMsgPart} from '../shared-src/decisioning.js';
import {getMessages, getOrCreateLabel, labelMessages, threadHasLabel} from '../shared-src/gapiQueries.js';

const LABELNAME = "Recruiting"

window.onload = function() {
  document.querySelector('button').addEventListener('click', doStuff)
};

async function doStuff() {
  console.log('button clicked');
  chrome.identity.getAuthToken(
    {'interactive': true},
    async function (authToken) {
      console.log(authToken);

      console.log(`Checking for label ${LABELNAME} and creating if it does not exist.`)
      const labelID = await getOrCreateLabel(LABELNAME, authToken);

      // fixme rework for better parallelization over messages
      const rawMessages = await getMessages(authToken, 1, null, null);
      // const parsedMessages = rawMessages.map(msg => new Message(msg.id, msg.payload));
      const messageIDsToLabel = findRecruitingMessages(rawMessages);
      if (messageIDsToLabel.length > 0) {
        console.log(`Found ${messageIDsToLabel.length} recruiting messages. Labeling them now.`);
        labelMessages(messageIDsToLabel, labelID, authToken);
      } else {
        ('Found no new recruiting messages this time.');
      }
    }
  );
}

function findRecruitingMessages(messageJSONs) {
  const idsToReturn = [];
  for (var i = 0; i < messageJSONs.length; i++) {
    try {
      if (isRecruiting(messageJSONs[i])) {
        idsToReturn.push(messageJSONs[i].id)
        console.log(messageJSONs[i].snippet + ' IS RECRUITING')
      }
    } catch (err) {
      console.log(`error in deciding message [${messageJSONs[i].snippet}]:`);
      console.log(err)
    }

  }
  return idsToReturn;
}


// class Message {
//   constructor(id, payload) {
//     this.id = id;
//     this.headers = payload.headers;

//     if (payload.mimeType.includes("multipart")) {
//       const parts = payload.parts;
//       for (var i = 0; i < parts.length; i++) {
//         this.parsePart(parts[i]);
//       }
//     } else {
//       this.parsePart(payload);
//     }
//   }

//   parsePart(part) {
//     if (part.mimeType.includes("html")) {
//       this.htmlBody = base64Decode(part.body.data);
//     } else if (part.mimeType.includes("plain")) {
//       this.plainTextBody = base64Decode(part.body.data);
//     } else {
//       console.log("noncorming part in message id " + this.id);
//       console.log(part);
//     }
//   }

//   getSubject() {
//     for (var i = 0; i < this.headers.length; i++) {
//       if (this.headers[i].name == 'Subject') {
//         return this.headers[i].value;
//       }
//     }
//   }
// }
