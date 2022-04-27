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
const LATEST_EPOCH_FILENAME = 'LATEST_EPOCH_S'
const OLDEST_EPOCH_FILENAME = 'OLDEST_EPOCH_S'


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
    // and this command's termination, but that's ok since we have handling to not store duplicate messages
    const newLatestEpoch = getNowEpoch();

    const authToken = process.env.AUTH_TOKEN;

    // everything sync so we only write the epoch if we've processed messages
    const messages = await gapi.getMessages(authToken, 5, null, latestEpoch);
    console.log(messages);
    for (var i = 0; i < messages.length; i++) {
        // read labelIDs and store in different dir if manually-labeled-recruiting label exists
        // todo let it write in parallel?
        fs.writeFileSync(`email_data/${messages[i].id}.json`, JSON.stringify(messages[i]));
    };
    fs.writeFileSync(LATEST_EPOCH_FILENAME, newLatestEpoch.toString())
        // todo handle oldest?
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
