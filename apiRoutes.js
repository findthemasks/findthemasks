const express = require('express');
const https = require('https');

const router = express.Router();

router.get('/exec', (req, res, next) => {
  console.error(req.query);
  console.error('hi');
  if (!req.query.cmd) {
    res.status(400).send('Invalid command');
    return;
  }

  const options = {
    hostname: 'us-central1-findthemasks.cloudfunctions.net',
    port: 443,
    path: `/exec?cmd=${req.params.cmd}`,
    method: 'GET',
  };

  let newData = '';
  const dataReq = https.request(options, (dataRes) => {
    dataRes.on('data', (d) => { newData += d; });
    dataRes.on('end', () => {
      if (dataRes.statusCode === 200) {
        resp.status(200).send('success!');
      } else {
        resp.status(400).send('Encounted an error. Please email contact@findthemasks.com for further assistance.');
      }
    });
  });
});

module.exports = router;
