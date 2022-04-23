console.log('hello from gmail.js')

window.onload = function() {
  document.querySelector('button').addEventListener('click', doStuff)
};

async function doStuff() {
  console.log('button clicked')
  chrome.identity.getAuthToken(
    {'interactive': true},
    async function (authToken) {
      // todo rework for better parallelization
      const messages = await getMessages(authToken);
      const messageIDsToLabel = findRecruitingMessages(messages);
      // labelMessages(messageIDsToLabel);
    }
  );
}
