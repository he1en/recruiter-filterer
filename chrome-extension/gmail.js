console.log('hello from gmail.js')

const LABELNAME = "Recruiting"

window.onload = function() {
  document.querySelector('button').addEventListener('click', doStuff)
};

async function doStuff() {
  console.log('button clicked')
  chrome.identity.getAuthToken(
    {'interactive': true},
    async function (authToken) {
      console.log(authToken);

      console.log(`Checking for label ${LABELNAME} and creating if it does not exist.'`)
      const labelID = await getOrCreateLabel(LABELNAME, authToken);

      // todo rework for better parallelization over messages
      const rawMessages = await getMessages(authToken, 10);
      console.log(rawMessages)
      const parsedMessages = rawMessages.map(msg => new Message(msg.id, msg.payload));
      const messageIDsToLabel = findRecruitingMessages(parsedMessages);
      console.log(`Found ${messageIDsToLabel.length} recruiting messages. Labeling them now.`)
      labelMessages(messageIDsToLabel, labelID, authToken);
    }
  );
}


class Message {
  constructor(id, payload) {
    this.id = id;
    this.headers = payload.headers;

    if (payload.mimeType.includes("multipart")) {
      const parts = payload.parts;
      for (var i = 0; i < parts.length; i++) {
        this.parsePart(parts[i]);
      }
    } else {
      this.parsePart(payload);
    }
  }

  parsePart(part) {
    if (part.mimeType.includes("html")) {
      this.htmlBody = base64Decode(part.body.data);
    } else if (part.mimeType.includes("plain")) {
      this.plainTextBody = base64Decode(part.body.data);
    } else {
      console.log("noncorming part in message id " + this.id);
      console.log(part);
    }
  }

  getSubject() {
    for (var i = 0; i < this.headers.length; i++) {
      if (this.headers[i].name == 'Subject') {
        return this.headers[i].value;
      }
    }
  }
}


function base64Decode(encoded) {
  return atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
}
