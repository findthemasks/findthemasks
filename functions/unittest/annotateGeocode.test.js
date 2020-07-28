const mockIndex = require ('../index.js').testRefactor;
const mockGeocode = require('../geocode.js').methods;
const {originalDataTemplate, geocodeTemplate, fakeWriteBack, fakeIndices, fakeColumns} = require('./fakeData.js');
const regeneratorRuntime = require('regenerator-runtime');

beforeEach(() => {
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
    test('On a failed geocodeAddress() call, no callback function is called and entry lat/lng are set to N/A', async() => {
        const copyOfEntry = JSON.parse(JSON.stringify(originalDataTemplate.values[2]));
        const spyOnGeocodeAddress = jest.spyOn(mockGeocode, 'geocodeAddress').mockRejectedValue(new Error('Some error with geocodeAddress!'));
        const returnGeocode = await mockIndex.doGeocode([], '', copyOfEntry, 3, true, fakeIndices);
        expect(returnGeocode).toBeUndefined();
        expect(copyOfEntry[fakeIndices.lat]).toEqual('N/A');
        expect(copyOfEntry[fakeIndices.lng]).toEqual('N/A');
    });
});

describe('Testing a one-to-three correspondence between each location and their corresponding data entries in fillWriteRequest', () => {
    const latCol = fakeColumns.latColumn;
    const lngCol = fakeColumns.lngColumn;
    const addressCol = fakeColumns.addressColumn;
    let vals = [0, 0, 0];
    function getExpectedVals(write_back) { 
        vals[0] = write_back.geocode.location.lat;
        vals[1] = write_back.geocode.location.lng;
        vals[2] = write_back.geocode.canonical_address;
    }

    getExpectedStrings = (rowNum) => [`fakeSheetID!${latCol}${rowNum}`,`fakeSheetID!${lngCol}${rowNum}`,`fakeSheetID!${addressCol}${rowNum}`];
    function testFillWriteRequest(fakeWriteBack, nullAddress) {
        const result = mockGeocode.fillWriteRequest([fakeWriteBack], fakeColumns, 'fakeSheetID');
        if (nullAddress) expect(result.length).toBe(2);   
        else expect(result.length).toBe(3);
        getExpectedVals(fakeWriteBack);
        const expected = getExpectedStrings(fakeWriteBack.row_num);
        
        for (let i = 0; i < result.length; ++i) {
            expect(result[i].range).toBe(expected[i]);
            expect(result[i].values[0][0]).toBe(vals[i]);
        }
    }
    test('Non-null canonical address (1)', () => {
        testFillWriteRequest(fakeWriteBack, false);
    });
    test('Non-null canonical address (2)', () => {
        fakeWriteBack.geocode.canonical_address = 'another fake address';
        fakeWriteBack.geocode.location.lat = 200;
        fakeWriteBack.geocode.location.lng = 201;
        fakeWriteBack.row_num = 42;
        testFillWriteRequest(fakeWriteBack, false);
    });
    test('Null canonical address', () => {
        fakeWriteBack.geocode.canonical_address = null;
        testFillWriteRequest(fakeWriteBack, true);
    });
    test('Undefined location fields', () => {
        fakeWriteBack.geocode.canonical_address = 'back to a non-null fake address';
        fakeWriteBack.geocode.location.lat = undefined;
        fakeWriteBack.geocode.location.lng = undefined;
        testFillWriteRequest(fakeWriteBack, false);
    })
});

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
