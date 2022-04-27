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
const LATEST_EPOCH_FILENAME = 'LATEST_EPOCH_S';
const OLDEST_EPOCH_FILENAME = 'OLDEST_EPOCH_S';

const MY_TRAINING_LABEL_ID = 'Label_8613293660186101195'; // replace with yours


function getNowEpoch() {
    // ms to s, which google wants
    return Math.floor(Date.now() / 1000);
}

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
        return getNowEpoch();
    }
}

async function storeLatestMessages() {
    const latestEpoch = readLatestEpoch();
    console.log(`Storing messages newer than latest run of epoch time ${latestEpoch}`);

    // might have a little bit of overlap next run if the below query returns any messages received between now
    // and this command's termination, but that's ok since no duplicates will be stored, just overwritten
    const newLatestEpoch = getNowEpoch();

    const authToken = process.env.AUTH_TOKEN;

    const recordedOldestEpoch = readOldestEpoch();
    var oldestEpoch = recordedOldestEpoch;

    // everything sync so we only write the epoch if we've processed messages
    const messages = await gapi.getMessages(authToken, 20, null, latestEpoch);
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

        const msgEpochS = Math.floor(parseInt(messages[i].internalDate) / 1000)
        if (msgEpochS < oldestEpoch * 1000) {
            oldestEpoch = msgEpochS;
        }
    };
    fs.writeFileSync(LATEST_EPOCH_FILENAME, newLatestEpoch.toString())
    if (oldestEpoch < recordedOldestEpoch) {
        fs.writeFileSync(OLDEST_EPOCH_FILENAME, oldestEpoch.toString())
    }
}

async function backfillOldMessages(maxMessages) {
    console.log(`Storing at most ${maxMessages} messages older than`);

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
