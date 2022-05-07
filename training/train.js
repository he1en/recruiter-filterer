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


//const tf = require('@tensorflow/tfjs');
const tf = require('@tensorflow/tfjs-node');  // needed for saving a model to local filesystem to work. But using tfjs to share code with browser
const fs = require('fs');
const natural = require('natural');
const decisioning = require ('../shared-src/decisioning');


const TRAIN_P = 85;
const TEST_P = 15;
console.assert(TRAIN_P + TEST_P === 100);
const MAX_TEXT_FEATURES = 500;
const DESCENT_EPOCHS = 100;
const CONFIDENCE_THRESHOLD = 0.5;


// fixme make these paths work even if not run from training/
const POS_DIR = './email_data/recruiting';
const NEG_DIR = './email_data/not_recruiting';
const CLASSIFIER_DIR = './temp_classifiers';

function getMessageTextFromSetItem(item) {
    var filePath;
    if (item.recruiting) {
        filePath = POS_DIR + '/' + item.name;
    } else {
        filePath = NEG_DIR + '/' + item.name;
    }
    const msgJSON = JSON.parse(fs.readFileSync(filePath));
    return decisioning.getPlainTextFromMsgPart(msgJSON.payload);
}

function testModel(model, testSet) {
    var truePositives = [];
    var trueNegatives = [];
    var falsePositives = [];
    var falseNegatives = [];

    for (var i = 0; i < testSet.length; i++) {
        const messageText = getMessageTextFromSetItem(testSet[i]);
        const vector = vectorize(messageText);
        const prob = model.predict(tf.tensor2d([vector])).dataSync()[0];
        const classifiedRecruiting = prob > CONFIDENCE_THRESHOLD;
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
    console.log(`${truePositives.length} were true positives (${truePositives.length / testSet.length * 100}%)`);
    console.log(`${trueNegatives.length} were true negatives (${trueNegatives.length / testSet.length * 100}%)`);
    console.log(`${falsePositives.length} were false positives (${falsePositives.length / testSet.length * 100}%)`);
    console.log(`${falseNegatives.length} were false negatives (${falseNegatives.length / testSet.length * 100}%)`);

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

const vocabulary = ["opportunity", "background", "chat", "fit", "hiring", "sourcer", "recruiter", "exciting", "helen", "affirm"];

// in train
// for every doc in train set
// add all stemmed words and bigrams to a list
// take certain numbr of them to limit to MAX_FEATURES-- how to choose??
// this is the vocab. save it

function vectorize(text) {
    var counts = {};
    for (var i = 0; i < vocabulary.length; i++) {
        counts[vocabulary[i]] = 0;
    }
    const tokenizedText = (new natural.WordTokenizer()).tokenize(text);
    const stemmedText = tokenizedText.map(natural.PorterStemmer.stem);
    for (var i = 0; i < stemmedText.length; i++) {
        word = stemmedText[i];
        if (vocabulary.includes(word)) {
            counts[word] += 1
        }
    }
    const vector = vocabulary.map(word => counts[word]);
    return vector;
}

function docsToVectorsAndLabels(docs) {
    const vectors = [];
    const labels = [];
    for (var i = 0; i < docs.length; i++) {
        const messageText = getMessageTextFromSetItem(docs[i]);
        const vector = vectorize(messageText);
        vectors.push(vector);
        if (docs[i].recruiting) {
            labels.push(1);
        } else {
            labels.push(0);
        }
    }
    return {vectors, labels};
}

async function trainModel(trainSet) {
    const {vectors, labels} = docsToVectorsAndLabels(trainSet);

    const model = tf.sequential();
    // units: 1 means one number output
    // sigmoid activation for
    // shape [10] means each doc is a 10 length vector
    model.add(tf.layers.dense({units: 1, inputShape: [vocabulary.length], activation: 'sigmoid'}));
    // choose adam gradient descent
    // binaryCrossentropy is used when we want 0 or 1 classification
    // metrics don't affect training, just used later for evaluation. binaryAccuracy is easier to read, just shows percentange of transactions are labeled
    // correctly
    // cross entropy penalizes being further from label more, but accuracy is just binary
    model.compile({optimizer: 'adam', loss: 'binaryCrossentropy', metrics: 'binaryAccuracy'});
    // valiodation batch size 32 by default
    const fittingHistory = await model.fit(tf.tensor2d(vectors), tf.tensor(labels), {epochs: DESCENT_EPOCHS});
    console.log(fittingHistory);
    const filepath = `file://${CLASSIFIER_DIR}/tf_adam_${Date.now()}`;
    model.save(filepath);
    model.summary();
    return model;
}

async function evaluateModel(model, testSet) {
    const {vectors, labels} = docsToVectorsAndLabels(testSet);

    const result = model.evaluate(tf.tensor2d(vectors), tf.tensor(labels));
    const loss = result[0]; // diff between label and probability
    const accuracy = result[1]; // what % of transactions are correctly labeled
    console.log('Loss: ');
    loss.print();
    console.log('Accuracy: ');
    accuracy.print();
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

const loadModel = process.argv.includes('--load');
if (loadModel) {
    const modelLoc = process.argv[process.argv.length - 1];  // fixme: assumption
    tf.loadLayersModel(`file://${modelLoc}/model.json`).then(model => testModel(model, testSet));

} else {
    trainModel(trainSet).then(model => evaluateModel(model, testSet));
}


