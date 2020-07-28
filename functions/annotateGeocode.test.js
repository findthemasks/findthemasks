const mockIndex = require ('./index.js').testRefactor;
const mockGeocode = require('./geocode.js').methods;
const mockFirebaseFunctions = require('firebase-functions');
const mockAdmin = require ('firebase-admin');
const mockBottleneck = require('bottleneck');
const mockClient = require("@googlemaps/google-maps-services-js").Client;
const {notApprovedMissingGeocode, missingColumns, approvedNoLatLng, noAnnotation, fakeGeocode, mockMapsResponse, fakeIndices, fakeWriteBack, fakeColumns, fakeSheetID} = require('./unittest/fakeData.js');
const regeneratorRuntime = require('regenerator-runtime');
const fakeData = require('./unittest/fakeData.js');

// Due to limitations with jest mocking need to declare some mock function to be used for module mocks
const mockFirebaseVal = jest.fn(() => {
    return {
        geocode: 'Cached geocode',
    };
});
const mockFirebaseSet = jest.fn();
let mockExist = true;


// Mocking out firebase-functions to have predetermined config variables which probably wont get used
jest.mock('firebase-functions', () => {
    return {
        config: jest.fn(() => {
            return {
                googleapi: 'fakeGoogleAPi',
                findthemasks: {
                    geocode_key: 'Hello',
                }
            };
        })
    };
});
// Mocked out any possible reference to the database. This is used to test functionality within geocodeAddress
jest.mock('firebase-admin', () => {
    return {
        database: jest.fn(() => ({
            ref: jest.fn(() => {
                return {
                    once: jest.fn(() => {
                        return {
                            val: mockFirebaseVal,
                            exists: jest.fn(() => mockExist),
                        };
                    }),
                    set: mockFirebaseSet
                }
            })
        })),
        initializeApp: jest.fn(),
    };
});
// Mocked out the entire bottleneck that controls our call to maps API
jest.mock('bottleneck', () => {
    return jest.fn().mockImplementation(() => {
        return {
            schedule: jest.fn(() => {
                return mockMapsResponse;
            })
        }
    });
});

// test ('End to end testing to make sure every function gets ran once on an address that needs annotation', async() => {
//     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockImplementation(() => Promise.resolve(fakeGeocode));
//     const data = await mockIndex.annotateGeocode(approvedNoLatLng);
//     expect(data).toStrictEqual({
//         numGeocodes : 1,
//         numWritebacks : 1,
//     });
// });

test('Testing whether or not we are able to find the column of corresponding labels', () => {
    expect(() => {mockIndex.getIndexColumn(missingColumns)}).toThrow();
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