const constants = require('./constants.js');
const ftmEncrypt = require('./ftp-encrypt.js');
const { google } = require('googleapis');

async function exec(req, res) {
  const command = ftmEncrypt.decrypt(req.query.c);
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: constants.SHEETS[command.c],
    range: `Combined$A{}`
  };

  request.auth = client;
  let response = await sheets.spreadsheets.values.get(request);
  const data = response.data;

  if (command.a === 'r') {
    // Get sheets api.
    // Check if approved. If yes, unapprove, note takedown, refresh.
    res.status(200).send('removed');
  } else if (command.a === 'g') {
    // Check if approved. If yes, resubmit. Find new entry. Unapprove old. Note duplicate.
    res.status(200).send('verified');
  } else {
    res.status(418).send('I am not a teapot');
  }
}

module.exports = { exec };
