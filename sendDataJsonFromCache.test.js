jest.mock('https');
jest.mock('./sendDataJson', () => ({
    sendDataJson : (cache, countryCode, res) => {
        return cache[countryCode].data;
    }
}));

const regeneratorRuntime = require("regenerator-runtime");
const https = require('https');
const { sendDataJsonFromCache } = require ('./rootRoutes');

test ('Testing caching logic will not request new data if cache has not expired',() =>{
const today = new Date();
const cache = {
    US : {
    expires_at: today.setDate(today.getDate()+1),
    },
}
expect(sendDataJsonFromCache(cache, null,'US',null)).toBeUndefined();
});

// describe ("Testing functions if we need to cache data", () => {
//     test("Testing that the right path is generated and caching works for one country", async () => {
//       const today = new Date();
//       let currentCountry = 'US';
//       const verifyCache = {
//         US : {
//           expires_at: today.setDate(today.getDate()-1),
//         },
//         CA: {
//           expires_at: today.setDate(today.getDate()-1),
//         }
//       }
//       const fakeData = {
//         firstRequester: "Hospital",
//         secondRequester: "Medical center"
//       }
//       const callBackFn = (fakeData) =>{
//         const newExpiresAt = new Date(today.getTime() + (5 * 60 * 1000));
//           // eslint-disable-next-line no-param-reassign
//         verifyCache['US'] = {
//           expires_at: newExpiresAt,
//           data: fakeData,
//         }; 
//         sendDataJson(verifyCache, 'US', null);
//       }
//       sendDataJson.mockImplementation((cache, countryCode, res) => {
//         expect (cache[countryCode].data).toBe(fakeData);
//       });
//       https.request.mockImplementation((options) => {
//         expect (options.path).toBe(`/findthemasks.appspot.com/prefix1-${currentCountry}.json`);
//         callBackFn(fakeData);
//       });
//      sendDataJsonFromCache(verifyCache, 'prefix1', 'US', null);
//      currentCountry = 'CA';
//      sendDataJsonFromCache(verifyCache, 'prefix1', 'CA', null);
//     });
// }); 
