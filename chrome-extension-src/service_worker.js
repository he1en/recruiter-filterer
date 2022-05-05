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

console.log('hello from service_worker.js');
//import * as natural from 'natural';

import {isRecruiting, getPlainTextFromMsgPart} from '../shared-src/decisioning.js';
import {getMessages, getOrCreateLabel, labelMessages, threadHasLabel} from '../shared-src/gapiQueries.js';

const LABELNAME = "Recruiting";


function findAndLabelMessages(request, sender, responseCallback) {
    console.log(`findAndLabelMessages called by ${sender.url} with request ${request}`);
    chrome.identity.getAuthToken(
        {'interactive': true},
        async function (authToken) {

            // fixme do this on install instead
            console.log(`Checking for label ${LABELNAME} and creating if it does not exist.`)
            const labelID = await getOrCreateLabel(LABELNAME, authToken);

            // fixme rework for better concurrency of message processing
            const rawMessages = await getMessages(authToken, null, null, null, true);
            const messageIDsToLabel = findRecruitingMessages(rawMessages);
            if (messageIDsToLabel.length > 0) {
                labelMessages(messageIDsToLabel, labelID, authToken);
                console.log(`Labeled ${messageIDsToLabel.length} new recruiting messages.`);
                // TODO mark messages as unread
            } else {
                console.log('Found no new unread recruiting messages this time.');
            }
            responseCallback('done');
        }
    );
    return true; // makes sure responseCallback is called
    // natural.BayesClassifier.load('./model.json', null, async function (err, classifier) {
    //     if (err) {
    //         throw err;
    //     }
    //     console.log('Loaded classifier')
    // });

}

function findRecruitingMessages(messageJSONs) {
    const idsToReturn = [];
    for (var i = 0; i < messageJSONs.length; i++) {
      try {
        if (isRecruiting(messageJSONs[i])) {
          idsToReturn.push(messageJSONs[i].id)
          console.log(`Found recruiting message (snippet = ${messageJSONs[i].snippet}).`);
        }
      } catch (err) {
        console.log(`error in deciding message [${messageJSONs[i].snippet}]:`);
        console.log(err)
      }

    }
    return idsToReturn;
  }

//chrome.tabs.onCreated.addListener(findAndLabelMessages);
chrome.runtime.onMessage.addListener(findAndLabelMessages);
