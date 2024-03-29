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

/**
 * Queries email data in bulk and stores raw json (no parising or decoding) of emails.
 * So they can be used later for training without sending queries each time.
 *
 * Usage:
 *      node getData.js --latest
 *      node getData.js --backfill 100
 *
 * --getLatest will query newer messages you received since the last time you ran getData.
 * --backfill will query N messages older than you have stored before.
 * FIXME If a chunk of messages is missing between your most recent ones and older ones, there is
 * no easy way to fill that gap besides manually editing the OLDEST_EPOCH_MS to be the oldest
 * of the recent chunk of messages. This script does not prioritze getting ALL messages,
 * since we don't necessarily need them to train a model. It's unclear if the gmail api even
 * returns messages in chronological order.
 */

const fs = require('fs');
const gapi = require('../shared-src/gapiQueries');

// Used to make sure this run only gets fresh data
// update .gitignore if changing these constants
const LATEST_EPOCH_FILENAME = 'LATEST_EPOCH_MS';
const OLDEST_EPOCH_FILENAME = 'OLDEST_EPOCH_MS';

const MY_TRAINING_LABEL_ID = 'Label_8613293660186101195'; // replace with yours


function readLatestEpoch() {
    try {
        return parseInt(fs.readFileSync(LATEST_EPOCH_FILENAME));
    } catch {
        return 0;
    }
}


function readOldestEpoch() {
    try {
        return parseInt(fs.readFileSync(OLDEST_EPOCH_FILENAME));
    } catch {
        return Date.now();
    }
}

async function hasManualRecruitingLabel(message) {
    if (message.labelIds.includes(MY_TRAINING_LABEL_ID)) {
        return true;
    }
    const threadHasLabel = await gapi.threadHasLabel(message.threadId, MY_TRAINING_LABEL_ID, process.env.AUTH_TOKEN);
    return threadHasLabel;
}

async function writeMessages(messages, prevOldestEpoch) {
    // todo let it write in parallel? Not doing so right now because of complexity in handling partial failures

    var oldestMessageRetrieved = Date.now(); // Date.now() to ensure first message overrwrites this
    for (var i = 0; i < messages.length; i++) {
        // read labelIDs and store in different dir if manually-labeled-recruiting label exists
        var msg_folder;
        if (await hasManualRecruitingLabel(messages[i])) {
            msg_folder = 'recruiting';
        } else {
            msg_folder = 'not_recruiting';
        }
        const path = `email_data/${msg_folder}/${messages[i].id}.json`;
        fs.writeFileSync(path, JSON.stringify(messages[i]));

        const msgEpochS = parseInt(messages[i].internalDate);
        if (msgEpochS < oldestMessageRetrieved) {
            oldestMessageRetrieved = msgEpochS;
        }
    };
    console.log('Oldest message retrieved was from ' + oldestMessageRetrieved);
    if (oldestMessageRetrieved < prevOldestEpoch) {
        console.log('Writing new oldest epoch.')
        fs.writeFileSync(OLDEST_EPOCH_FILENAME, oldestMessageRetrieved.toString())
    }
}

async function storeLatestMessages() {
    const latestEpoch = readLatestEpoch();
    const prevOldestEpoch = readOldestEpoch();
    console.log(`Storing messages newer than latest run of epoch time ${latestEpoch}`);

    // might have a little bit of overlap next run if the below query returns any messages received between now
    // and this command's termination, but that's ok since no duplicates will be stored, just overwritten
    const newLatestEpoch = Date.now();

    // everything sync so we only write the epoch if we've processed messages
    const messages = await gapi.getMessages(process.env.AUTH_TOKEN, 500, null, latestEpoch, false);
    writeMessages(messages, prevOldestEpoch);

    fs.writeFileSync(LATEST_EPOCH_FILENAME, newLatestEpoch.toString());

    // todo if max messages were stored, log that you probably need to start backfilling
    console.log(`Stored ${messages.length} messages.`);
}

async function backfillOldMessages(maxMessages) {
    const oldestEpoch = readOldestEpoch();
    console.log(`Storing at most ${maxMessages} messages older than epoch ${oldestEpoch}.`);

    const messages = await gapi.getMessages(process.env.AUTH_TOKEN, maxMessages, oldestEpoch, null, false);
    writeMessages(messages, oldestEpoch);
    console.log(`Stored ${messages.length} messages.`)

}

const getLatest = process.argv.includes('--latest');
const backfill = process.argv.includes('--backfill');

if (!getLatest && !backfill) {
    console.log('Pass either --latest or --backfill numMessages');
}

if (getLatest) {
    storeLatestMessages();
}
if (backfill) {
    numMessages = process.argv[process.argv.length - 1];  // todo assumption
    backfillOldMessages(numMessages);
}
