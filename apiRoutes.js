const express = require('express');
const https = require('https');

const router = express.Router();

router.get('/command/:cmd', (req, res, next) => {
  res.status(200).send('Done');

  const options = {
    hostname: 'functions.findthemasks.com',
    port: 443,
    path: `/exec/${req.params.cmd}`,
    method: 'GET',
  };

  let newData = '';
  const dataReq = https.request(options, (dataRes) => {
    dataRes.on('data', (d) => { newData += d; });
    dataRes.on('end', () => {
      if (dataRes.statusCode === 200) {
        console.log(dataRes);
      } else {
      }
        console.error(dataRes);
    });
  });
});

module.exports = router;
