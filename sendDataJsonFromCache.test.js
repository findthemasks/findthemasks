const nock = require('nock');
const https = require('https');
const regeneratorRuntime = require('regenerator-runtime');
const { sendDataJsonFromCache } = require('./rootRoutes');
const mockDataJson = require('./sendDataJson');
const { hasUncaughtExceptionCaptureCallback } = require('process');

const spyOnPathGenerator = jest.spyOn(mockDataJson, 'generatePath');
const spyOnHttpRequest = jest.spyOn(mockDataJson, 'makeHttpRequest');

test('Testing caching logic will not request new data if cache has not expired', () => {
  const spyOnSendDataJson = jest.spyOn(mockDataJson, 'sendDataJson');
  spyOnSendDataJson.mockReturnValueOnce('');
  const today = new Date();
  const cache = {
    US: {
      expires_at: today.setDate(today.getDate() + 1),
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
  }
  Object.keys(countries).forEach((key) => {
    expect(mockDataJson.generatePath('prefix', countries[key])).toBe(`/findthemasks.appspot.com/prefix-${countries[key]}.json`)
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
      .get(`/findthemasks.appspot.com/prefix-US.json`)
      .reply(200, 'Hello');
    expect(mockDataJson.makeHttpRequest(options)).resolves.toBe('Hello');
  });

  test ('Testing that we are rejecting promisses on bad status code', () => {
    const options = {
      hostname: 'storage.googleapis.com',
      port: 443,
      path: mockDataJson.generatePath('prefix', 'US'),
      method: 'GET',
    };
    const mockNode = nock('https://storage.googleapis.com:443')
    .get(`/findthemasks.appspot.com/prefix-US.json`)
    .reply(500, 'Stop');
    expect(mockDataJson.makeHttpRequest(options)).rejects.toThrow(new Error(`Bad status code: 500`));
  });
});

//Not done with these tests but everything else seems functional
describe('Testing how sendDataJson deals with the returned value/error', () => {
  test('Testing if we are able to update cached data on a success data fetch', async () => {
    const spyOnSendDataJson = jest.spyOn(mockDataJson, 'sendDataJson');
    const today = new Date();
    const cache = {
      US: {
        expires_at: today.setDate(today.getDate() - 1),
      },
    };
    spyOnHttpRequest.mockResolvedValueOnce('Hello');
    spyOnSendDataJson.mockImplementation((cache, countryCode, res) => {
      expect(cache[countryCode].data).toBe('Hello');
    });
    // The spy seems to be keeping track of previous sendDataJson calls too, need to come back to this.
    await sendDataJsonFromCache(cache, 'prefix', 'US', null);
    // expect(spyOnSendDataJson).toHaveBeenCalledTimes(1);
  });
});