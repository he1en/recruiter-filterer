// messages here are type Message defined in gapiQueries.json

function findRecruitingMessages(messages) {
  const idsToReturn = [];
  for (var i = 0; i < messages.length; i++) {
    try {
      if (isRecruiting(messages[i])) {
        idsToReturn.push(messages[i].id)
        console.log(messages[i].getSubject() + ' IS RECRUITING')
      }
    } catch (err) {
      console.log(`error in deciding message [${messages[i].getSubject()}]:`);
      console.log(err)
    }

  }
  return idsToReturn;
}

function isRecruiting(message) {
  var bodyToSearch;
  if (message.plainTextBody === undefined) {
    bodyToSearch = message.htmlBody;
  } else {
    bodyToSearch = message.plainTextBody;
  }
 return (
   bodyToSearch.includes("your background") ||
   bodyToSearch.includes("great fit")
 )
}
