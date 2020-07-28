const mockIndex = require ('../index.js').testRefactor;
const mockGeocode = require('../geocode.js').methods;
const {originalDataTemplate, geocodeTemplate, fakeIndices, fakeColumns} = require('./fakeData.js');
const regeneratorRuntime = require('regenerator-runtime');

beforeEach(() =>{
    jest.clearAllMocks();
});

test('Testing whether or not we are able to find the column of corresponding labels', () => {
    const missingColumns = JSON.parse(JSON.stringify(originalDataTemplate.values[1]));
    missingColumns[20]= "";
    expect(() => {mockIndex.getIndexColumn(missingColumns)}).toThrow();
});

describe('Testing functionality for createGeocodePromises() + doGeocode()', () => {
    test('With multiple entries, code should return an array of promises for each entry', () => {
        const copyData = JSON.parse(JSON.stringify(originalDataTemplate)).values.slice(2);
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockResolvedValue(geocodeTemplate);
        const { promises } = mockIndex.createGeocodePromises(copyData, fakeIndices);
        expect(promises.length).toEqual(2);
    });
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
    // test('On a failed geocodeAddress() call, no callback function is called and entry lat/lng are set to N/A', async() => {
    //     const copyOfEntry = JSON.parse(JSON.stringify(originalDataTemplate.values[2]));
    //     const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockRejectedValue(new Error('Some error with geocodeAddress!'));
    //     const returnGeocode = await mockIndex.doGeocode([], '', copyOfEntry, 3, true, fakeIndices);
    //     expect(returnGeocode).toBeUndefined();
    //     expect(copyOfEntry[fakeIndices.lat]).toEqual('N/A');
    //     expect(copyOfEntry[fakeIndices.lng]).toEqual('N/A');
    // });
});

// describe('Testing a one-to-three correspondence between each location and their corresponding data entries in fillWriteRequest', () => {
//     var currIndex = 0;
//     test('Null canonical address', () => {
//         mockGeocode.to_write_back.push(fakeNullAddress);
//         var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);

//         var rowNum = fakeNullAddress.row_num;

//         var latCol = fakeColumns.latColumn;
//         var lngCol = fakeColumns.lngColumn;
//         var addressCol = fakeColumns.addressColumn;
            
//         var val1 = fakeNullAddress.geocode.location.lat;
//         var val2 = fakeNullAddress.geocode.location.lng;
//         var val3 = fakeNullAddress.geocode.canonical_address;

//         expect(result.length).toBe(2);
    
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val1);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val2);
//         ++currIndex;

//     });

//     test('Non-null canonical address (1)', () => {

//         mockGeocode.to_write_back.push(fakeWriteBack);

//         var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);
    
//         var rowNum = fakeWriteBack.row_num;

//         var latCol = fakeColumns.latColumn;
//         var lngCol = fakeColumns.lngColumn;
//         var addressCol = fakeColumns.addressColumn;
    
//         var val1 = fakeWriteBack.geocode.location.lat;
//         var val2 = fakeWriteBack.geocode.location.lng;
//         var val3 = fakeWriteBack.geocode.canonical_address;

//         expect(result.length).toBe(3 + 2); // previous test should have length 2
    
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val1);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val2);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val3);
//         ++currIndex;
//     });

//     test('Non-null canonical address (2)', () => {
//         mockGeocode.to_write_back.push(fakeComplete_2);

//         var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);
    
//         var rowNum = fakeComplete_2.row_num;

//         var latCol = fakeColumns.latColumn;
//         var lngCol = fakeColumns.lngColumn;
//         var addressCol = fakeColumns.addressColumn;
    
//         var val1 = fakeComplete_2.geocode.location.lat;
//         var val2 = fakeComplete_2.geocode.location.lng;
//         var val3 = fakeComplete_2.geocode.canonical_address;
    
//         expect(result.length).toBe(3 + 3 + 2);
    
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val1);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val2);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val3);
//         ++currIndex;
//     });

//     test('Null location', () => {
//         mockGeocode.to_write_back.push(fakeNullLocation);

//         var result = mockGeocode.fillWriteRequest(fakeColumns, fakeSheetID);
    
//         var rowNum = fakeNullLocation.row_num;

//         var latCol = fakeColumns.latColumn;
//         var lngCol = fakeColumns.lngColumn;
//         var addressCol = fakeColumns.addressColumn;
    
//         var val3 = fakeNullLocation.geocode.canonical_address;
    
//         expect(result.length).toBe(3 + 3 + 3 + 2);
    
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${latCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(undefined);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${lngCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(undefined);
//         ++currIndex;
//         expect(result[currIndex].range).toBe(`${fakeSheetID}!${addressCol}${rowNum}`);
//         expect(result[currIndex].values[0][0]).toBe(val3);

//     });

// });

describe('Testing the ability to write back to Google Sheets', () => {
    test('All promises should be resolved before we make the write_request', () => {
        const blankFillWriteRequest = jest.spyOn(mockGeocode, 'fillWriteRequest')
            .mockImplementation((to_write_back, columns, COMBINED_WRITEBACK_SHEET) => {
                expect(to_write_back.length).toBe(2);
            });
        const copyData = JSON.parse(JSON.stringify(originalDataTemplate));
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockResolvedValue(geocodeTemplate);
        spyOnGeocodeAddress.mockClear();
        mockIndex.annotateGeocode(copyData);
    });
    test ('to_write_back should be shorter than the promises if there are errors in geocodeAddress', () => {
        const blankFillWriteRequest = jest.spyOn(mockGeocode, 'fillWriteRequest')
            .mockImplementation((to_write_back, columns, COMBINED_WRITEBACK_SHEET) => {
                expect(spyOnGeocodeAddress).toHaveBeenCalledTimes(2);
                expect(to_write_back.length).toBe(1);
            });
        const copyData = JSON.parse(JSON.stringify(originalDataTemplate));
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress')
            .mockResolvedValueOnce(geocodeTemplate)
            .mockRejectedValueOnce(new Error('Some error with geocodeAddress!'));
        mockIndex.annotateGeocode(copyData);
    })
});
