function sendQuery(path, requestMethod, authToken, callbackFn) {
  fetch(
    'https://gmail.googleapis.com/gmail/v1/' + path,
    {
      'method': requestMethod,
      headers: {
        authorization: `Bearer ${authToken}`
      }
    }
  ).then(response => response.json()).then(data => callbackFn(data))
}
