const toDataByLocation = require('./toDataByLocation');

test('Testing that an entry wont go through without approval or valid lat and lng', () => {
    const fakeDataApproval = {
        values: [
            [],
            ["approved", "city", "state", "lat", "lng"], // headers 
            ["x", "Seattle", "WA", "47.6674625", "-122.3795306"], // valid entry
            ["", "Burien", "CA", "57.4585642", "-100.3339504"], // invalid approval
            ["x", "Seattle", "WA", "", "-122.3795306"], // invalid latitude 
            ["x", "Seattle", "MO", "30", ""], // invalid longitude
        ]
    };    
    Object.values(toDataByLocation(fakeDataApproval,'makers')).forEach((stateObj) => {
        Object.values(stateObj.cities).forEach((cityObj) => {
            cityObj.entries.forEach((entry) => {
                expect(entry.lat && entry.lng && entry.approved == 'x').toBeTruthy();
            });
        });
    });
});

test ('Testing two entries with same state are under the same state obj', () => {
    const sameStates = {
        values: [
            [],
            ["approved", "city", "state", "lat", "lng"], 
            ["x", "Seattle", "WA", "47.6674625", "-122.3795306"], 
            ["x", "Burien", "WA", "57.4585642", "-100.3339504"], 
        ]
    }; 
    expect(Object.keys(toDataByLocation(sameStates, 'makers')).length).toEqual(1); 
});

test ('Testing two entries with different states are under the different state objs', () => {
    const diffStates = {
        values: [
            [],
            ["approved", "city", "state", "lat", "lng"], 
            ["x", "San Francisco", "CA", "47.6674625", "-122.3795306"], 
            ["x", "Burien", "WA", "57.4585642", "-100.3339504"], 
        ]
    }; 
    expect(Object.keys(toDataByLocation(diffStates, 'makers')).length).toEqual(2); 
});

test ('Testing two entries with same city are under the same city object', () => {
    const sameCities = {
        values: [
            [],
            ["approved", "city", "state", "lat", "lng"], 
            ["x", "San Francisco", "CA", "47.6674625", "-122.3795306"], 
            ["x", "San Francisco", "CA", "57.4585642", "-100.3339504"], 
        ]
    }; 
    expect(Object.keys(Object.values(toDataByLocation(sameCities,'makers'))[0].cities).length).toEqual(1);
});

test ('Testing two entries with different cities are under the different city objects', () => {
    const diffCities = {
        values: [
            [],
            ["approved", "city", "state", "lat", "lng"], 
            ["x", "San Francisco", "CA", "47.6674625", "-122.3795306"], 
            ["x", "Los Angeles", "CA", "57.4585642", "-100.3339504"], 
        ]
    }; 
    expect(Object.keys(Object.values(toDataByLocation(diffCities,'makers'))[0].cities).length).toEqual(2);
});

test('Testing if an entry is undefined, the objects val is ""', () => {
    const undefinedEntries = {
        values: [
            [],
            ["approved", "city", "state", "lat", "lng", "reason"], 
            ["x", "San Francisco", "CA", "47.6674625", "-122.3795306"], 
            ["x", "Santa Monica", "CA", "57.4585642", "-100.3339504"], 
        ]
    }; 
    Object.values(toDataByLocation(undefinedEntries,'makers')).forEach((stateObj) => {
        Object.values(stateObj.cities).forEach((cityObj) => {
            cityObj.entries.forEach((entry) => {
                expect(entry.reason).toBe("");
            });
        });
    });
});