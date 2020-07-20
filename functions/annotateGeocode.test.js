const mockIndex = require ('./index.js').testRefactor;
const mockGeocode = require('./geocode.js').methods;
const {notApprovedMissingGeocode, missingColumns, approvedNoLatLng, noAnnotation, fakeGeocode} = require('./unittest/fakeData.js');
const regeneratorRuntime = require('regenerator-runtime');

// test ('End to end testing to make sure every function gets ran once on an address that needs annotation', async() => {
//     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockImplementation(() => Promise.resolve(fakeGeocode));
//     const data = await mockIndex.annotateGeocode(notApprovedMissingGeocode);
//     expect(data).toStrictEqual({
//         numGeocodes : 1,
//         numWritebacks : 1,
//     });
// });

test('Testing whether or not we are able to find the column of corresponding labels', () => {
    expect(() => {mockIndex.getIndexColumn(missingColumns)}).toThrow();
});

