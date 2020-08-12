const express = require('express');
const https = require('https');
const setCurrentUrl = require('./middleware/setCurrentUrl.js');

const router = express.Router();
router.use(setCurrentUrl);

const herokuVersion = process.env.HEROKU_RELEASE_VERSION;

router.get('/exec', (req, res, next) => {
  if (!req.query.cmd) {
    res.status(400).send('Invalid command');
    return;
  }

  const options = {
    hostname: 'us-central1-findthemasks.cloudfunctions.net',
    port: 443,
    path: `/exec?cmd=${req.query.cmd}`,
    method: 'GET',
  };

  let newData = '';
  const dataReq = https.request(options, (dataRes) => {
    dataRes.on('data', (d) => {
      newData += d;
    });
    dataRes.on('end', () => {
      let message = newData;
      let alertClass = 'alert-success';
      let title = 'Success';

      if (dataRes.statusCode !== 200) {
        title = 'Error Failure';
        message = 'Request received. Thank you for updating FindTheMasks! '
          + 'There was a server error, but your update or removal request was likely handled correctly '
          + 'nonetheless. If your entry has not received an updated date on the FindTheMasks.com map '
          + 'or been removed from the FindTheMasks.com map within 24 hours, please contact us at '
          + 'data@findthemasks.com.';
        alertClass = 'alert-danger';
        console.log(dataRes.statusCode, newData);
      }

      res.render('apiresult', {
        version: herokuVersion,
        layout: 'static',
        title,
        ogTitle: 'Command Result',
        ogUrl: `http://${req.hostname}${req.originalUrl}`,
        ogDescription: 'Result of command request',
        commandResult: message,
        alertClass,
      });
    });
  });

  dataReq.on('error', (error) => {
    console.log(error);
    res.status(500).send('Encounted an error. Please email contact@findthemasks.com for further assistance.');
  });

  dataReq.end();
});

module.exports = router;
