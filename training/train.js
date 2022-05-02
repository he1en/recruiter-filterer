//import * as tf from '@tensorflow/tfjs';
const fs = require('fs');
const natural = require('natural');


function getTextAndLabels() {
    // todo

    const rawText = [ // using just "snippet" field of message json for now
        "Hey Helen, hope you&#39;re doing well. Just following up to see if you have any interest in a brief conversation about what we&#39;re building at Hardfin?",
        "Hey Helen, I&#39;m hoping to connect even if timing isn&#39;t ideal right now. We plan on seeding 100+ companies in the next 4 years so we&#39;re building a network of high-potential future CTOs and we",
        "Total $21.13 April 17, 2022 Thanks for riding, Helen We&#39;re glad to have you as an Uber Rewards Gold Member. Total $21.13 You earned 42 points on this trip Trip Fare $17.72 Subtotal $17.72",
        "6:30 in Nopa sounds perfect! Any places you like? Things that come to mind for me are the Souvla on Divis and Barrel Head Brewhouse but I&#39;m not incredibly familiar with the area."
    ];

    // const labels = [1, 1, 0, 0];
    const labels = ['recruiting', 'recruiting', 'not', 'not'];

    // zip 
    return rawText.map((text, i) => [text, labels[i]]);
}

// const docs = getTextAndLabels();
// const classifier = new natural.BayesClassifier();
// for (var i = 0; i < docs.length; i++) {
//     classifier.addDocument(docs[i][0], docs[i][1]);
// }
// classifier.train();

// console.log(classifier.classify('Hey Helen, Senior Engineer at company?'));
// console.log(classifier.classify('LongReads + Open Thread'));

// classifier.save('classifier.json', function (err, classifier) {
//     if (err) {
//       console.log(err)
//     }
//     // the classifier is saved to the classifier.json file!
//   })

const positiveDocs = readDir(1, './email_data/recruiting').map(vectorizeMessageBody);
//const negativeDocs = readDir(20, './email_data/not_recruiting').map(vectorizeMessageBody);

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