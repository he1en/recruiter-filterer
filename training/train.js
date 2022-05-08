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


const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const decisioning = require('../shared-src/decisioning');

const TRAIN_P = 85;
const TEST_P = 15;
console.assert(TRAIN_P + TEST_P === 100);
const MAX_TEXT_FEATURES = 5000;
const DESCENT_EPOCHS = 500;

const POS_DIR = './email_data/recruiting';
const NEG_DIR = './email_data/not_recruiting';
const CLASSIFIER_DIR = './temp_classifiers';


function readMessageJSONFromSetItem(item) {
    var filePath;
    if (item.recruiting) {
        filePath = POS_DIR + '/' + item.name;
    } else {
        filePath = NEG_DIR + '/' + item.name;
    }
    return JSON.parse(fs.readFileSync(filePath));
}


function getMessageTextFromSetItem(item) {
    const msgJSON = readMessageJSONFromSetItem(item);
    return decisioning.getPlainTextFromMsgPart(msgJSON.payload);
}


function buildVocabulary(trainSet) {
    // return array of size MAX_TEXT_FEATURES of the top seen words and bigrams
    var vocabOccurrences = {}
    for (var i = 0; i < trainSet.length; i++) {
        const messageText = getMessageTextFromSetItem(trainSet[i]);
        const tokenizedText = decisioning.tokenizeText(messageText);
        for (var j = 0; j < tokenizedText.length; j++) {
            const token = tokenizedText[j]
            if (token == '0' || parseInt(token)) { // could also remove stop words
                continue;
            }
            if (!vocabOccurrences.hasOwnProperty(token)) {
                vocabOccurrences[token] = 0;
            }
            vocabOccurrences[token] += 1;
        };
    }
    const topWordsAndCounts = Object.entries(vocabOccurrences).sort((a, b) => b[1] - a[1]).slice(0, MAX_TEXT_FEATURES);
    return topWordsAndCounts.map(elem => elem[0]);
}

function docsToVectorsAndLabels(docs, vocabulary) {
    const vectors = [];
    const labels = [];
    for (var i = 0; i < docs.length; i++) {
        const messageText = getMessageTextFromSetItem(docs[i]);
        const vector = decisioning.oneHotVectorize(messageText, vocabulary);
        vectors.push(vector);
        if (docs[i].recruiting) {
            labels.push(1);
        } else {
            labels.push(0);
        }
    }
    return {vectors, labels};
}

function testModel(vocabulary, model, testSet) {
    var truePositives = [];
    var trueNegatives = [];
    var falsePositives = [];
    var falseNegatives = [];

    const messageJSONs = testSet.map(readMessageJSONFromSetItem);
    const predictions = decisioning.predictRecruiting(vocabulary, model, messageJSONs);
    for (var i = 0; i < testSet.length; i++) {
        const classifiedRecruiting = predictions[i];
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


async function evaluateModel(vocabulary, model, testSet) {
    const {vectors, labels} = docsToVectorsAndLabels(testSet, vocabulary);

    const result = model.evaluate(tf.tensor2d(vectors), tf.tensor(labels));
    const loss = result[0]; // diff between label and probability
    const accuracy = result[1]; // what % of transactions are correctly labeled
    console.log('Loss: ');
    loss.print();
    console.log('Accuracy: ');
    accuracy.print();
}


async function trainModel(trainSet, modelNameInfo) {
    const vocabulary = buildVocabulary(trainSet);
    const {vectors, labels} = docsToVectorsAndLabels(trainSet, vocabulary);

    // relatively simple one layer model
    // units: 1 means we want a single number as an output
    // inputShape is saying each input is a vector of size vocabulary.length
    // activation: sigmoid will return a value between 0 and 1
    const model = tf.sequential({
        layers: [
            tf.layers.dense({units: 1, inputShape: [vocabulary.length], activation: 'sigmoid'})
        ]
    });
    // learning using adam gradient descent
    // binaryCrossentropy is used when we want 0 or 1 classification
    // cross entropy penalizes being further from label more
    // metrics don't affect training, just used later for evaluation. binaryAccuracy is easier to read, just
    // shows percentange of transactions are labeled correctly
    model.compile({optimizer: 'adam', loss: 'binaryCrossentropy', metrics: 'binaryAccuracy'});
    // validation batch size will be 32 by default
    // run the descent DESCENT_EPOCHS times
    const fittingHistory = await model.fit(tf.tensor2d(vectors), tf.tensor(labels), {epochs: DESCENT_EPOCHS});
    console.log(fittingHistory);
    model.summary();

    // save model and vocab for later loading
    const dir = `${CLASSIFIER_DIR}/tf_adam_${Date.now()}_${modelNameInfo}`;
    await model.save(`file://${dir}`);
    fs.writeFileSync(`${dir}/vocabulary.json`, JSON.stringify(vocabulary));
    return {vocabulary, model};
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

const loadModel = process.argv.includes('--load');
if (loadModel) {
    const modelLoc = process.argv[process.argv.length - 1];  // fixme: assumption
    const vocabulary = JSON.parse(fs.readFileSync(`${modelLoc}/vocabulary.json`));
    tf.loadLayersModel(`file://${modelLoc}/model.json`).then(model => testModel(vocabulary, model, testSet));
} else {
    var modelNameInfo;
    if (process.argv.length > 2) {
        // optional add some identifying string to name the model when saved
        modelNameInfo = process.argv[process.argv.length - 1];
    } else {
        modelNameInfo = '';
    }
    trainModel(trainSet, modelNameInfo).then(results => {
        evaluateModel(results.vocabulary, results.model, testSet);
        testModel(results.vocabulary, results.model, testSet);
    });
}
