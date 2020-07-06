jest.mock('https');
jest.mock('./sendDataJson', () => ({
  sendDataJson: (cache, countryCode, res) => cache[countryCode].data,
}));

const regeneratorRuntime = require('regenerator-runtime');
const https = require('https');
const { sendDataJsonFromCache } = require('./rootRoutes');

test('Testing caching logic will not request new data if cache has not expired', () => {
  const today = new Date();
  const cache = {
    US: {
      expires_at: today.setDate(today.getDate() + 1),
    },
  };
  expect(sendDataJsonFromCache(cache, null, 'US', null)).toBeUndefined();
});
