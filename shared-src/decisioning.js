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

import * as natural from 'natural';
import * as tf from '@tensorflow/tfjs';

const CONFIDENCE_THRESHOLD = 0.5;
const USE_BIGRAMS = true;


function predictRecruiting(vocabulary, model, messages) {
    // returns array of booleans, whether each message is recruiting
    // todo don't let one malformed message break the whole function

    const featureVectors = messages.map(message => {
        const text = getPlainTextFromMsgPart(message.payload);
        return oneHotVectorize(text, vocabulary);
    })
    const probs = model.predict(tf.tensor2d(featureVectors)).dataSync();
    return probs.map(prob => prob > CONFIDENCE_THRESHOLD);
}


function base64Decode(encoded) {
    return atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
}


function getPlainTextFromMsgPart(msgPart) {
    // ignoring html bodies
    var allText = "";
    if (msgPart.mimeType.includes("plain")) {
        allText = allText.concat(base64Decode(msgPart.body.data));
    }
    if (msgPart.mimeType.includes("multipart")) {
        const subParts = msgPart.parts;
        const subPartTexts = subParts.map(part => getPlainTextFromMsgPart(part));
        allText = allText.concat(subPartTexts.join(" "));
    }
    return allText;
}


function oneHotVectorize(text, vocabulary) {
    var counts = {};
    for (var i = 0; i < vocabulary.length; i++) {
        counts[vocabulary[i]] = 0;
    }
    const tokenizedText = tokenizeText(text);
    for (var i = 0; i < tokenizedText.length; i++) {
        const token = tokenizedText[i];
        if (vocabulary.includes(token)) {
            counts[token] += 1
        }
    }
    const vector = vocabulary.map(word => counts[word]);
    return vector;
}

function tokenizeText(text) {
    const textArray = (new natural.WordTokenizer()).tokenize(text);
    const stemmedText = textArray.map(natural.PorterStemmer.stem);
    if (!USE_BIGRAMS) {
        return stemmedText;
    }
    const bigrams = natural.NGrams.bigrams(stemmedText); // array of arrays length 2
    const bigramTokens = bigrams.map(bigram => bigram.join('$')); // is arbitrary delimeter
    return stemmedText.concat(bigramTokens);
}

// todo this logs an error in browser
module.exports = {
    getPlainTextFromMsgPart,
    oneHotVectorize,
    predictRecruiting,
    tokenizeText
};

