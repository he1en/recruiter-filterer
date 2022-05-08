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


function isRecruiting(message) {
    const body = getPlainTextFromMsgPart(message.payload);
    return (
        body.includes("your background") ||
        body.includes("great fit")
    )
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

// todo this logs an error in browser
module.exports = {
    isRecruiting,
    getPlainTextFromMsgPart,
};

