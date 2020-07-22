const mockIndex = require ('./index.js').testRefactor;
const mockGeocode = require('./geocode.js').methods;
const {notApprovedMissingGeocode, missingColumns, approvedNoLatLng, noAnnotation, fakeGeocode, fakeWriteBack, fakeColumns, fakeSheetID, testLength} = require('./unittest/fakeData.js');
const regeneratorRuntime = require('regenerator-runtime');
const { exampleObjectMetadata } = require('firebase-functions-test/lib/providers/storage');

// test ('End to end testing to make sure every function gets ran once on an address that needs annotation', async() => {
//     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockImplementation(() => Promise.resolve(fakeGeocode));
//     const data = await mockIndex.annotateGeocode(notApprovedMissingGeocode);
//     expect(data).toStrictEqual({
//         numGeocodes : 1,
//         numWritebacks : 1,
//     });
// });

/*test('Testing whether or not we are able to find the column of corresponding labels', () => {
    expect(() => {mockIndex.getIndexColumn(missingColumns)}).toThrow();
});*/

test('Length test', () => {
    expect(Object.keys(testLength).length).toBe(2);
});

test('Testing a one-to-three correspondence between each location and their corresponding data entries in fillWriteRequest', () => {
    var result = mockGeocode.fillWriteRequest(fakeWriteBack, fakeColumns, fakeSheetID);

    var rowNum = fakeWriteBack[0].row_num;
    var latCol = fakeColumns.latColumn;
    var lngCol = fakeColumns.lngColumn;
    var addressCol = fakeColumns.addressColumn;

    var val1 = fakeWriteBack[0].geocode.location.lat;
    var val2 = fakeWriteBack[0].geocode.location.lng;
    var val3 = fakeWriteBack[0].geocode.canonical_address;

    expect(result.length).toBe(3);

    expect(result[0].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
    expect(result[1].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
    expect(result[2].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);

    expect(result[0].values[0][0]).toBe(val1);
    expect(result[1].values[0][0]).toBe(val2);
    expect(result[2].values[0][0]).toBe(val3);
    
});

