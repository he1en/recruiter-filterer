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

const tf = require('@tensorflow/tfjs')
const decisioning = require('../shared-src/decisioning.js');
const gapi = require('../shared-src/gapiQueries.js');
const vocabulary = require('./vocabulary.json');

const LABELNAME = "Recruiting";


function findAndLabelMessages(request, sender, responseCallback) {
    console.log(`findAndLabelMessages called by ${sender.url} with request ${request}`);
    chrome.identity.getAuthToken(
        {'interactive': true},
        async function (authToken) {

            // fixme do this on install instead
            console.log(`Checking for label ${LABELNAME} and creating if it does not exist.`)
            const labelID = await gapi.getOrCreateLabel(LABELNAME, authToken);

            // fixme rework for better concurrency of message processing
            const rawMessages = await gapi.getMessages(authToken, null, null, null, true);
            const messageIDsToLabel = await findRecruitingMessages(rawMessages);
            if (messageIDsToLabel.length > 0) {
                gapi.labelAndMarkAsUnread(messageIDsToLabel, labelID, authToken);
                console.log(`Labeled ${messageIDsToLabel.length} new recruiting messages and marked as unread.`);
                // TODO mark messages as unread
            } else {
                console.log('Found no new unread recruiting messages this time.');
            }
            responseCallback('done');
        }
    );
    return true; // makes sure responseCallback is called
}

async function loadModel() {
    return await tf.loadLayersModel('./model/model.json');
}

async function findRecruitingMessages(messageJSONs) {
    model = await loadModel();
    const idsToReturn = [];
    const predictions = decisioning.predictRecruiting(vocabulary, model, messageJSONs);
    for (var i = 0; i < messageJSONs.length; i++) {
        if (predictions[i]) {
          idsToReturn.push(messageJSONs[i].id)
          console.log(`Found recruiting message (snippet = ${messageJSONs[i].snippet}).`);
        }
    }
    return idsToReturn;
}

chrome.runtime.onMessage.addListener(findAndLabelMessages);
