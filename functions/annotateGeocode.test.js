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

describe('Testing a one-to-three correspondence between each location and their corresponding data entries in fillWriteRequest', () => {

    const latCol = fakeColumns.latColumn;
    const lngCol = fakeColumns.lngColumn;
    const addressCol = fakeColumns.addressColumn;

    let vals = [0, 0, 0];
    let rowNum = 0;

    function getExpectedVals(write_back) { 
        vals[0] = write_back.geocode.location.lat;
        vals[1] = write_back.geocode.location.lng;
        vals[2] = write_back.geocode.canonical_address;
    }

    updateRow = (write_back) => rowNum = write_back.row_num;

    getExpectedStrings = (rowNum) => [`${fakeSheetID}!${latCol}${rowNum}`,`${fakeSheetID}!${lngCol}${rowNum}`,`${fakeSheetID}!${addressCol}${rowNum}`];

    function testFillWriteRequest(fakeWriteBack, nullAddress) {
        let result = mockGeocode.fillWriteRequest([fakeWriteBack], fakeColumns, fakeSheetID);

        if (nullAddress) expect(result.length).toBe(2);   
        else expect(result.length).toBe(3);

        getExpectedVals(fakeWriteBack);
        const expected = getExpectedStrings(updateRow(fakeWriteBack));
        
        for (let i = 0; i < result.length; ++i) {
            expect(result[i].range).toBe(expected[i]);
            expect(result[i].values[0][0]).toBe(vals[i]);
        }
    }

    test('Non-null canonical address (1)', () => {
        testFillWriteRequest(fakeWriteBack, false);
    });

    test('Non-null canonical address (2)', () => {
        fakeGeocode.canonical_address = 'another fake address';
        fakeGeocode.location.lat = 200;
        fakeGeocode.location.lng = 201;
        fakeWriteBack.row_num = 42;
        testFillWriteRequest(fakeWriteBack, false);
    });

    test('Null canonical address', () => {
        fakeGeocode.canonical_address = null;
        testFillWriteRequest(fakeWriteBack, true);
    });

    test('Undefined location fields', () => {
        fakeGeocode.canonical_address = 'back to a non-null fake address';
        fakeGeocode.location.lat = undefined;
        fakeGeocode.location.lng = undefined;
        testFillWriteRequest(fakeWriteBack, false);
    })
});

describe('Testing functionality within geocodeAddress()', () => {
    test('If the entry is cached in realtime db, simply return it', async() => {
        mockExist = true;
        expect(await mockGeocode.geocodeAddress('Hello')).toBe('Cached geocode');
    });
    test('On a good response, cache geocode values and return them', async() => {
        mockExist = false;
        expect(await mockGeocode.geocodeAddress('Hello')).not.toBeUndefined();
        expect(mockFirebaseVal).toHaveBeenCalled();
        expect(mockFirebaseSet).toHaveBeenCalled();
    });
    test('On a bad response status, code should throw an error', () => {
        mockMapsResponse.status = 300;
        const expectedError = new Error(`status: ${mockMapsResponse.status} req: ${mockMapsResponse.config.url} ${JSON.stringify(mockMapsResponse.config.params)} result: ${mockMapsResponse.data}`);
        expect(mockGeocode.geocodeAddress('Hello')).rejects.toEqual(expectedError);
    });
//     // It seems like we are still returning data even when the data is bad? Need to check with someone
//     // test('On bad data results, code should also throw an error', () => {
//     //     mockMapsResponse.status = 200;
//     //     mockMapsResponse.data.results = [];
//     //     const expectedError = new Error(`status: ${mockMapsResponse.status} req: ${mockMapsResponse.config.url} ${JSON.stringify(mockMapsResponse.config.params)} result: ${mockMapsResponse.data}`);
//     //     expect(mockGeocode.geocodeAddress('Hello')).rejects.toEqual(expectedError);
//     // });
});

describe('Testing functionality for createGeocodePromises() + doGeocode()', () => {
    test('With multiple entries and succesfull geocode, code should return an array of promises for each entry', async() => {
        const copyNoAnnotation = JSON.parse(JSON.stringify(noAnnotation));
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockResolvedValue(fakeGeocode.complete_1);
        const { promises } = mockIndex.createGeocodePromises(copyNoAnnotation, fakeIndices);
        expect(promises.length).toEqual(3);
    });
    test('With multiple entries, code should have well-defined behavior for successful and failed geocodeAddress calls', async() => {
        const copyNoAnnotation = JSON.parse(JSON.stringify(noAnnotation));
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress')
            .mockResolvedValueOnce(fakeGeocode.complete_1)
            .mockRejectedValueOnce(new Error('Some error with geocodeAddress!'))
            .mockResolvedValueOnce(fakeGeocode.complete_2);
        const { promises, to_write_back } = mockIndex.createGeocodePromises(copyNoAnnotation, fakeIndices);
        await Promise.all(promises);
        expect(promises.length).toEqual(3);
        expect(to_write_back.length).toEqual(2);
        expect(copyNoAnnotation[1][fakeIndices.lat]).toEqual('N/A');
        expect(copyNoAnnotation[1][fakeIndices.lng]).toEqual('N/A');
        expect(copyNoAnnotation[0][fakeIndices.lat]).toEqual(fakeGeocode.complete_1.location.lat);
        expect(copyNoAnnotation[0][fakeIndices.lng]).toEqual(fakeGeocode.complete_1.location.lng);
    });

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
