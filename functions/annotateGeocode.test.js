const mockIndex = require ('./index.js').testRefactor;
const mockGeocode = require('./geocode.js').methods;
const mockClient = require("@googlemaps/google-maps-services-js").Client;
const {originalDataTemplate, geocodeTemplate, notApprovedMissingGeocode, approvedNoLatLng, noAnnotation, fakeGeocode, mockMapsResponse, fakeIndices, fakeWriteBack, fakeColumns, fakeSheetID} = require('./unittest/fakeData.js');
const regeneratorRuntime = require('regenerator-runtime');

// test('Testing whether or not we are able to find the column of corresponding labels', () => {
//     const missingColumns = JSON.parse(JSON.stringify(originalDataTemplate.values[1]));
//     missingColumns[20]= "";
//     expect(() => {mockIndex.getIndexColumn(missingColumns)}).toThrow();
// });

describe('Testing functionality for createGeocodePromises() + doGeocode()', () => {
    // test('With multiple entries, code should return an array of promises for each entry', async() => {
    //     const copyNoAnnotation = JSON.parse(JSON.stringify(noAnnotation));
    //     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockResolvedValue(fakeGeocode.complete_1);
    //     const { promises } = mockIndex.createGeocodePromises(copyNoAnnotation, fakeIndices);
    //     expect(promises.length).toEqual(3);
    // });
    test('On a successful geocodeAddress() call, doGeocode() should be calling callback and updating entry and geocode', async() => {
        const successGeocode = JSON.parse(JSON.stringify(geocodeTemplate));
        const copyOfEntry = JSON.parse(JSON.stringify(originalDataTemplate.values[2]));
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockResolvedValue(successGeocode);
        const returnGeocode = await mockIndex.doGeocode([], '', copyOfEntry, 3, true, fakeIndices);
        successGeocode.canonical_address = null;
        expect(returnGeocode).toBeDefined();
        expect(returnGeocode).toEqual(successGeocode);
        expect(copyOfEntry[fakeIndices.lat]).toEqual(successGeocode.location.lat);
        expect(copyOfEntry[fakeIndices.lng]).toEqual(successGeocode.location.lng);
    });
    // test('On a failed geocodeAddress() call, no callback function is called and entry lat/lng are set to N/A', () => {
    //     const copyOfEntry = JSON.parse(JSON.stringify(originalDataTemplate.values[2]));
    //     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockRejectedValue(new Error('Some error with geocodeAddress!'));
    //     const returnGeocode = await mockIndex.doGeocode([], '', copyOfEntry, 3, true, fakeIndices);
    // });
    // test('With multiple entries, code should have well-defined behavior for successful and failed geocodeAddress calls', async() => {
    //     const copyNoAnnotation = JSON.parse(JSON.stringify(noAnnotation));
    //     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress')
    //         .mockResolvedValueOnce(fakeGeocode.complete_1)
    //         .mockRejectedValueOnce(new Error('Some error with geocodeAddress!'))
    //         .mockResolvedValueOnce(fakeGeocode.complete_2);
    //     const { promises, to_write_back } = mockIndex.createGeocodePromises(copyNoAnnotation, fakeIndices);
    //     await Promise.all(promises);
    //     console.log(promises);
    //     expect(promises.length).toEqual(3);
    //     expect(to_write_back.length).toEqual(2);
    //     expect(copyNoAnnotation[1][fakeIndices.lat]).toEqual('N/A');
    //     expect(copyNoAnnotation[1][fakeIndices.lng]).toEqual('N/A');
    //     expect(copyNoAnnotation[0][fakeIndices.lat]).toEqual(fakeGeocode.complete_1.location.lat);
    //     expect(copyNoAnnotation[0][fakeIndices.lng]).toEqual(fakeGeocode.complete_1.location.lng);
    // });
});

test('Testing a one-to-three correspondence between each location and their corresponding data entries in fillWriteRequest', () => {
    var result = mockGeocode.fillWriteRequest([fakeWriteBack], fakeColumns, fakeSheetID);

    var rowNum = fakeWriteBack.row_num;
    var latCol = fakeColumns.latColumn;
    var lngCol = fakeColumns.lngColumn;
    var addressCol = fakeColumns.addressColumn;

    var val1 = fakeWriteBack.geocode.location.lat;
    var val2 = fakeWriteBack.geocode.location.lng;
    var val3 = fakeWriteBack.geocode.canonical_address;

    expect(result.length).toBe(3);

    expect(result[0].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
    expect(result[1].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
    expect(result[2].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);

    expect(result[0].values[0][0]).toBe(val1);
    expect(result[1].values[0][0]).toBe(val2);
    expect(result[2].values[0][0]).toBe(val3);
    
});

// describe('Testing the ability to write back to Google Sheets', () => {
//     test('All promises should be resolved before we make the write_request', () => {
//         const blankFillWriteRequest = jest.spyOn(mockGeocode, 'fillWriteRequest')
//             .mockImplementation((to_write_back, columns, COMBINED_WRITEBACK_SHEET) => {
//                 expect(to_write_back.length).toBe(1);
//             });
//         const copyNoAnnotation = JSON.parse(JSON.stringify(approvedNoLatLng));
//         const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockResolvedValue(fakeGeocode.complete_1);
//         mockIndex.annotateGeocode(copyNoAnnotation);
//     });
// });

// test ('End to end testing to make sure every function gets ran once on an address that needs annotation', async() => {
//     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockImplementation(() => Promise.resolve(fakeGeocode.complete_1));
//     const data = await mockIndex.annotateGeocode(approvedNoLatLng);
//     expect(data).toStrictEqual({
//         numGeocodes : 1,
//         numWritebacks : 1,
//     });
// });