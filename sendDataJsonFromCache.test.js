const nock = require('nock');
const https = require('https');
const regeneratorRuntime = require('regenerator-runtime');
const { sendDataJsonFromCache } = require('./rootRoutes');
const mockDataJson = require('./sendDataJson');

const spyOnHttpRequest = jest.spyOn(mockDataJson, 'makeHttpRequest');
const spyOnSendDataJson = jest.spyOn(mockDataJson, 'sendDataJson');
const spyOnPathGenerator = jest.spyOn(mockDataJson, 'generatePath');
const today = new Date();

test('Testing caching logic will not request new data if cache has not expired', () => {
  spyOnSendDataJson.mockReturnValueOnce('');
  const cache = {
    US: {
      expires_at: new Date(today.getTime() + (24 * 60 * 60 * 1000)),
    },
  };
  sendDataJsonFromCache(cache, 'prefix', 'US', null);
  expect(spyOnPathGenerator).not.toHaveBeenCalled();
  expect(spyOnSendDataJson).toHaveBeenCalledTimes(1);
});

test('Testing that we are making a correct path for different prefices and countries', () => {
  const countries = {
    1: 'US',
    2: 'CA',
    3: 'FR',
  };
  Object.keys(countries).forEach((key) => {
    expect(mockDataJson.generatePath('prefix', countries[key])).toBe(`/findthemasks.appspot.com/prefix-${countries[key]}.json`);
  });
});

describe('Testing that the promisified http request works', () => {
  test('Testing that we are able to resolve data on a 200', () => {
    const options = {
      hostname: 'storage.googleapis.com',
      port: 443,
      path: mockDataJson.generatePath('prefix', 'US'),
      method: 'GET',
    };
    const mockNode = nock('https://storage.googleapis.com:443')
      .get('/findthemasks.appspot.com/prefix-US.json')
      .reply(200, 'Hello');
    expect(mockDataJson.makeHttpRequest(options)).resolves.toBe('Hello');
  });

  test('Testing that we are rejecting promisses on bad status code', () => {
    const options = {
      hostname: 'storage.googleapis.com',
      port: 443,
      path: mockDataJson.generatePath('prefix', 'US'),
      method: 'GET',
    };
    const mockNode = nock('https://storage.googleapis.com:443')
      .get('/findthemasks.appspot.com/prefix-US.json')
      .reply(500, 'Stop');
    expect(mockDataJson.makeHttpRequest(options)).rejects.toThrow(new Error('Bad status code: 500'));
  });
});

describe('Testing how sendDataJson deals with the returned value/error', () => {
  test('Testing if we are able to update cached data on a success data fetch', async () => {
    cache = {
      US: {
        expires_at: new Date(today.getTime() - (24 * 60 * 60 * 1000)),
      },
    };
    spyOnHttpRequest.mockResolvedValueOnce('Hello');
    spyOnSendDataJson.mockImplementation((cache, countryCode, res) => {
      expect(cache[countryCode].data).toBe('Hello');
    });
    await sendDataJsonFromCache(cache, 'prefix', 'US', null);
    expect(spyOnSendDataJson).toHaveBeenCalled();
  });

  test('Testing if we can handle a rejected promise and send some stale data', async () => {
    cache = {
      US: {
        expires_at: new Date(today.getTime() - (24 * 60 * 60 * 1000)),
      },
    };
    spyOnHttpRequest.mockRejectedValueOnce(new Error('Bad status code: 500'));
    spyOnSendDataJson.mockImplementation((cache, countryCode, res) => {
      expect(cache[countryCode].data).toBeUndefined();
    });
    await sendDataJsonFromCache(cache, 'prefix', 'US', null);
    expect(spyOnSendDataJson).toHaveBeenCalled();
  });
});
