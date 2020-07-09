const nock = require('nock');
const https = require('https');
const regeneratorRuntime = require('regenerator-runtime');
const { sendDataJsonFromCache } = require('./rootRoutes');
const mockDataJson = require('./sendDataJson');

mockDataJson.sendDataJson = jest.fn((cache, countryCode, res) => {
  console.log('SendDataJson got called!');
  return cache[countryCode].data;
});


test('Testing caching logic will not request new data if cache has not expired', () => {
  const today = new Date();
  const cache = {
    US: {
      expires_at: today.setDate(today.getDate() + 1),
    },
  };
  expect(sendDataJsonFromCache(cache, null, 'US', null)).toBeUndefined();
  expect(mockDataJson.sendDataJson(cache, 'US', null)).toBeUndefined();
});

test('Testing whether it can insert a new cache entry', done => {
  const spyCallBackFn = jest.spyOn(mockDataJson, 'updateCachedData');
  const today = new Date();
  const cache = {
    US: {
      expires_at: today.setDate(today.getDate() - 1),
    },
  };

  const countryCode = 'US';
  const mockNode = nock('https://localhost:443')
    .persist()
    .get(`/findthemasks.appspot.com/testPrefix-${countryCode}.json`)
    .reply(200, () => { 'hello' });
  const spyOnPathGenerator = jest.spyOn(mockDataJson, 'generatePath');
  try {
    sendDataJsonFromCache(cache, 'testPrefix', 'US', null);
    expect(spyOnPathGenerator).toHaveBeenCalled();
    expect(spyOnPathGenerator).toHaveReturnedWith(`/findthemasks.appspot.com/testPrefix-${countryCode}.json`);
    // expect(spyCallBackFn).toHaveBeenCalled();
  } catch (e) {
    console.error(e);
    done();
  }
});
