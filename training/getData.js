/**
 * Queries email data in bulk and stores raw json (no parising or decoding) of emails.
 * So they can be used later for training without sending queries each time. 
 * 
 * Usage:
 *      node getData.js --getLatest
 *      node getData.js --backfill 100
 */

const fs = require('fs');
const gapi = require ('../chrome-extension/gapiQueries');

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

function writeMessages(messages, prevOldestEpoch) {
    var newOldestEpoch = prevOldestEpoch;
    for (var i = 0; i < messages.length; i++) {
        // read labelIDs and store in different dir if manually-labeled-recruiting label exists
        // todo let it write in parallel?
        var msg_folder;
        if (messages[i].labelIds.includes(MY_TRAINING_LABEL_ID)) {
            msg_folder = 'recruiting';
        } else {
            msg_folder = 'not_recruiting';
        }
        const path = `email_data/${msg_folder}/${messages[i].id}.json`
        fs.writeFileSync(path, JSON.stringify(messages[i]));

        const msgEpochS = parseInt(messages[i].internalDate)
        if (msgEpochS < prevOldestEpoch) {
            newOldestEpoch = msgEpochS;
        }
    };
    if (newOldestEpoch < prevOldestEpoch) {
        fs.writeFileSync(OLDEST_EPOCH_FILENAME, newOldestEpoch.toString())
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
    const messages = await gapi.getMessages(process.env.AUTH_TOKEN, 100, null, latestEpoch);
    writeMessages(messages, prevOldestEpoch);

    fs.writeFileSync(LATEST_EPOCH_FILENAME, newLatestEpoch.toString())

    // todo if max messages were stored, log that you probably need to start backfilling
    console.log(`Stored ${messages.length} messages.`)
}

async function backfillOldMessages(maxMessages) {
    const oldestEpoch = readOldestEpoch();
    console.log(`Storing at most ${maxMessages} messages older than epoch ${oldestEpoch}.`);

    const messages = await gapi.getMessages(process.env.AUTH_TOKEN, maxMessages, oldestEpoch, null);
    writeMessages(messages, oldestEpoch);
    console.log(`Stored ${messages.length} messages.`)

}

const getLatest = process.argv.includes('--getLatest');
const backfill = process.argv.includes('--backfill');
if (!getLatest && !backfill) {
    console.log('Pass either --getLatest or --backfill numMessages');
}

if (getLatest) {
    storeLatestMessages();
}
if (backfill) {
    numMessages = process.argv[process.argv.length - 1];  // todo assumption 
    backfillOldMessages(numMessages);
}
