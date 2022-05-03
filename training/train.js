//import * as tf from '@tensorflow/tfjs';
const fs = require('fs');
const natural = require('natural');


const TRAIN_P = 80;
const VALIDATION_P = 0;
const TEST_P = 20;
console.assert(TRAIN_P + VALIDATION_P + TEST_P === 100);

const POS_DIR = './email_data/recruiting';
const NEG_DIR = './email_data/not_recruiting';
const BAYES_CLASSIFIER_FILE = 'bayes_classifier.json';

function getMessageTextFromSetItem(item) {
    var filePath;
    if (item.recruiting) {
        filePath = POS_DIR + '/' + item.name;
    } else {
        filePath = NEG_DIR + '/' + item.name;
    }
    const msgJSON = JSON.parse(fs.readFileSync(filePath));
    return getTextFromMsgPart(msgJSON.payload);
}

function trainClassifier(trainSet) {
    const classifier = new natural.BayesClassifier();

    for (var i = 0; i < trainSet.length; i++) {
        const messageText = getMessageTextFromSetItem(trainSet[i]);
        classifier.addDocument(messageText, trainSet[i].recruiting);
    }
    classifier.train();
    classifier.save(BAYES_CLASSIFIER_FILE, err => {if (err) {throw err;}});
    return classifier;
}

function testClassifier(classifier, testSet) {
    var truePositives = [];
    var trueNegatives = [];
    var falsePositives = [];
    var falseNegatives = [];

    for (var i = 0; i < testSet.length; i++) {
        const messageText = getMessageTextFromSetItem(testSet[i]);
        const classifiedRecruiting = (classifier.classify(messageText) == "true");  // tried to make labels booleans but they got stringified
        if (classifiedRecruiting && testSet[i].recruiting) {
            truePositives.push(testSet[i].name);
        } else if (classifiedRecruiting && !testSet[i].recruiting) {
            falsePositives.push(testSet[i].name);
        } else if (!classifiedRecruiting && testSet[i].recruiting) {
            falseNegatives.push(testSet[i].name);
        } else if (!classifiedRecruiting && !testSet[i].recruiting) {
            trueNegatives.push(testSet[i].name);
        } else {
            throw new Error('You messed up your classifier test logic');
        }
    }
    console.log(`Out of ${testSet.length} test documents:`);
    console.log(`${truePositives.length} were true positives (${Math.floor(truePositives.length / testSet.length * 100)}%)`);
    console.log(`${trueNegatives.length} were true negatives (${Math.floor(trueNegatives.length / testSet.length * 100)}%)`);
    console.log(`${falsePositives.length} were false positives (${Math.floor(falsePositives.length / testSet.length * 100)}%)`);
    console.log(`${falseNegatives.length} were false negatives (${Math.floor(falseNegatives.length / testSet.length * 100)}%)`);

    console.log('False Positives: ', falsePositives);
    console.log('False Negatives: ', falseNegatives);
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var randomInd = Math.floor(Math.random() * (i + 1));
        var shuffleElem = array[i];
        array[i] = array[randomInd];
        array[randomInd] = shuffleElem;
    }
    return array;
}


// read all message filenames
const posLabeledFiles = fs.readdirSync(POS_DIR).map(fileName => ({name: fileName, recruiting: true}));
const negLabeledFiles = fs.readdirSync(NEG_DIR).map(fileName => ({name: fileName, recruiting: false}));

// merge them all together to mix recruiting with non recruiting
// and randomize order to make sure the train/test split will not be on a temporal boundary
const labeledFiles = shuffleArray(posLabeledFiles.concat(negLabeledFiles));

// split into training, test (TODO validation)
const splitInd = Math.floor(TRAIN_P / 100 * labeledFiles.length);
const trainSet = labeledFiles.slice(0, splitInd);
const testSet = labeledFiles.slice(splitInd);

//const classifier = trainClassifier(trainSet);
// testClassifier(classifier, testSet);
const classifier = natural.BayesClassifier.load(BAYES_CLASSIFIER_FILE, null, function (err, classifier) {
    if (err) {
        throw err;
    }
    testClassifier(classifier, testSet);
});


function readDir(numMessages, dirName) {
    const msgJSONs = [];
    const fileNames = fs.readdirSync(dirName);
    for (var i = 0; i < numMessages && i < fileNames.length; i++) {
        const filePath = dirName + '/' + fileNames[i];
        const msgJSON = JSON.parse(fs.readFileSync(filePath));
        msgJSONs.push(msgJSON);
    }
    return msgJSONs;
}

// TO MOVE INTO CHROME EXTENSION

function base64Decode(encoded) {
    return atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
}

function getTextFromMsgPart(msgPart) {
    // ignoring html here
    var allText = "";
    if (msgPart.mimeType.includes("plain")) {
        allText = allText.concat(base64Decode(msgPart.body.data));
    }
    if (msgPart.mimeType.includes("multipart")) {
        const subParts = msgPart.parts;
        const subPartTexts = subParts.map(part => getTextFromMsgPart(part));
        allText = allText.concat(subPartTexts.join(" "));
    }
    return allText; 
}

function vectorizeMessageBody(rawMessage) {
    // todo features such as link wrapping, initial emails

    const plainText = getTextFromMsgPart(rawMessage.payload);
    const tokenizedText = (new natural.WordTokenizer()).tokenize(plainText);
    const stemmedText = tokenizedText.map(natural.PorterStemmer.stem);
    const bigrams = natural.NGrams.bigrams(stemmedText);
    console.log(bigrams);

}