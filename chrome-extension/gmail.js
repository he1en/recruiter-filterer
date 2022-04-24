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
      // todo create label if doesn't exist already
      const labelID = getOrCreateLabel(LABELNAME, authToken);

      // todo rework for better parallelization over messages
      // const messages = await getMessages(authToken);
      // const messageIDsToLabel = findRecruitingMessages(messages);
      // labelMessages(messageIDsToLabel, LABELNAME, authToken);
    }
  );
}
