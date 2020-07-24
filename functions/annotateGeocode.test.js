const mockIndex = require ('./index.js').testRefactor;
const mockGeocode = require('./geocode.js').methods;
const mockFirebaseFunctions = require('firebase-functions');
const mockAdmin = require ('firebase-admin');
const mockBottleneck = require('bottleneck');
const mockClient = require("@googlemaps/google-maps-services-js").Client;
const {notApprovedMissingGeocode, missingColumns, approvedNoLatLng, noAnnotation, fakeGeocode, mockMapsResponse, fakeIndices, fakeWriteBack, fakeComplete_2, fakeNullAddress, fakeNullLocation, fakeColumns, fakeSheetID} = require('./unittest/fakeData.js');
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
    var currIndex = 0;
    test('Null canonical address', () => {
        mockGeocode.to_write_back.push(fakeNullAddress);
        var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);

        var rowNum = fakeNullAddress.row_num;

        var latCol = fakeColumns.latColumn;
        var lngCol = fakeColumns.lngColumn;
        var addressCol = fakeColumns.addressColumn;
            
        var val1 = fakeNullAddress.geocode.location.lat;
        var val2 = fakeNullAddress.geocode.location.lng;
        var val3 = fakeNullAddress.geocode.canonical_address;

        expect(result.length).toBe(2);
    
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val1);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val2);
        ++currIndex;

    });

    test('Non-null canonical address (1)', () => {

        mockGeocode.to_write_back.push(fakeWriteBack);

        var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);
    
        var rowNum = fakeWriteBack.row_num;

        var latCol = fakeColumns.latColumn;
        var lngCol = fakeColumns.lngColumn;
        var addressCol = fakeColumns.addressColumn;
    
        var val1 = fakeWriteBack.geocode.location.lat;
        var val2 = fakeWriteBack.geocode.location.lng;
        var val3 = fakeWriteBack.geocode.canonical_address;

        expect(result.length).toBe(3 + 2); // previous test should have length 2
    
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val1);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val2);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val3);
        ++currIndex;
    });

    test('Non-null canonical address (2)', () => {
        mockGeocode.to_write_back.push(fakeComplete_2);

        var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);
    
        var rowNum = fakeComplete_2.row_num;

        var latCol = fakeColumns.latColumn;
        var lngCol = fakeColumns.lngColumn;
        var addressCol = fakeColumns.addressColumn;
    
        var val1 = fakeComplete_2.geocode.location.lat;
        var val2 = fakeComplete_2.geocode.location.lng;
        var val3 = fakeComplete_2.geocode.canonical_address;
    
        expect(result.length).toBe(3 + 3 + 2);
    
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val1);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val2);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val3);
        ++currIndex;
    });

    test('Null location', () => {
        mockGeocode.to_write_back.push(fakeNullLocation);

        var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);
    
        var rowNum = fakeNullLocation.row_num;

        var latCol = fakeColumns.latColumn;
        var lngCol = fakeColumns.lngColumn;
        var addressCol = fakeColumns.addressColumn;
    
        var val3 = fakeNullLocation.geocode.canonical_address;
    
        expect(result.length).toBe(3 + 3 + 3 + 2);
    
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(undefined);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(undefined);
        ++currIndex;
        expect(result[currIndex].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);
        expect(result[currIndex].values[0][0]).toBe(val3);

    });

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