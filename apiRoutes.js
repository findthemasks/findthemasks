const express = require('express');
const https = require('https');

const router = express.Router();

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
    dataRes.on('data', (d) => { newData += d; });
    dataRes.on('end', () => {
      if (dataRes.statusCode === 200) {
        res.status(200).send('success!');
      } else {
        console.log(dataRes);
        res.status(400).send('Encounted an error. Please email contact@findthemasks.com for further assistance.');
      }
    });
  });

  dataReq.on('error', (error) => {
    console.log(error);
    res.status(500).send('Encounted an error. Please email contact@findthemasks.com for further assistance.');
  });

  dataReq.end();
});

module.exports = router;
