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

      const labelID = await getOrCreateLabel(LABELNAME, authToken);

      // todo rework for better parallelization over messages
      const messages = await getMessages(authToken, 10);
      const messageIDsToLabel = findRecruitingMessages(messages);
      labelMessages(messageIDsToLabel, labelID, authToken);
    }
  );
}
