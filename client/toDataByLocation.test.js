const toDataByLocation = require('./toDataByLocation');

test('filters out entries without approval', () => {
  const fakeDataApproval = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng'], // headers 
      ['x', 'Seattle', 'WA', '47.6674625', '-122.3795306'], // valid entry
      ['', 'Burien', 'CA', '57.4585642', '-100.3339504'], // invalid approval
    ]
  };
  const expected = {
    "WA": {
      "cities": {
        "seattle": {
          "entries": [
            {"approved": "x", "city": "Seattle", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "WA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(fakeDataApproval,'makers')).toEqual(expected);
});

test('filters out entries without valid longitude', () => {
  const fakeDataLong = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng'], // headers 
      ['x', 'Seattle', 'WA', '47.6674625', '-122.3795306'], // valid entry
      ['x', 'Seattle', 'MO', '30', ''], // invalid longitude
    ]
  };
  const expected = {
    "WA": {
      "cities": {
        "seattle": {
          "entries": [
            {"approved": "x", "city": "Seattle", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "WA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(fakeDataLong,'makers')).toEqual(expected);
});

test('filters out entries without valid latitude', () => {
  const fakeDataLat = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng'], // headers 
      ['x', 'Seattle', 'WA', '47.6674625', '-122.3795306'], // valid entry
      ['x', 'Seattle', 'WA', '', '-122.3795306'], // invalid latitude 
    ]
  };
  const expected = {
    "WA": {
      "cities": {
        "seattle": {
          "entries": [
            {"approved": "x", "city": "Seattle", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "WA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(fakeDataLat,'makers')).toEqual(expected);
});

test ('checks two entries with same state are under the same state obj', () => {
  const sameStates = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng'], 
      ['x', 'Seattle', 'WA', '47.6674625', '-122.3795306'], 
      ['x', 'Burien', 'WA', '57.4585642', '-100.3339504'], 
    ]
  }; 
  const expected = {
    "WA": {
      "cities": {
        "burien": {
          "entries": [
            {"approved": "x", "city": "Burien", "datasetKey": "makers", "lat": "57.4585642", "lng": "-100.3339504", "state": "WA"}]}, "seattle": {"entries": [{"approved": "x", "city": "Seattle", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "WA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(sameStates, 'makers')).toEqual(expected);
});

test ('checks two entries with different states are under different state objs', () => {
  const diffStates = {
      values: [
        [],
        ['approved', 'city', 'state', 'lat', 'lng'], 
        ['x', 'San Francisco', 'CA', '47.6674625', '-122.3795306'], 
        ['x', 'Burien', 'WA', '57.4585642', '-100.3339504'], 
      ]
  }; 
  expected = {
    "CA": {
      "cities": {
        "san francisco": {
          "entries": [
            {"approved": "x", "city": "San Francisco", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "CA"}
          ]
        }
      }
    },
    "WA": {
      "cities": {
        "burien": {
          "entries": [
            {"approved": "x", "city": "Burien", "datasetKey": "makers", "lat": "57.4585642", "lng": "-100.3339504", "state": "WA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(diffStates, 'makers')).toEqual(expected);
});

test ('checks two entries with same city are under the same city object', () => {
  const sameCities = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng'], 
      ['x', 'San Francisco', 'CA', '47.6674625', '-122.3795306'], 
      ['x', 'San Francisco', 'CA', '57.4585642', '-100.3339504'], 
    ]
  }; 
  const expected = {
    "CA": {
      "cities": {
        "san francisco": {
          "entries": [
            {"approved": "x", "city": "San Francisco", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "CA"}, {"approved": "x", "city": "San Francisco", "datasetKey": "makers", "lat": "57.4585642", "lng": "-100.3339504", "state": "CA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(sameCities, 'makers')).toEqual(expected);
});

test ('checks two entries with different cities are under the different city objects', () => {
  const diffCities = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng'], 
      ['x', 'San Francisco', 'CA', '47.6674625', '-122.3795306'], 
      ['x', 'Los Angeles', 'CA', '57.4585642', '-100.3339504'], 
    ]
  }; 
  const expected = {
    "CA": {
      "cities": {
        "los angeles": {
          "entries": [
            {"approved": "x", "city": "Los Angeles", "datasetKey": "makers", "lat": "57.4585642", "lng": "-100.3339504", "state": "CA"}]}, "san francisco": {"entries": [{"approved": "x", "city": "San Francisco", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "state": "CA"}
          ]
        }
      }
    }
  };
  expect(toDataByLocation(diffCities,'makers')).toEqual(expected);
});

test('if entry is undefined, the objects val should be ""', () => {
  const undefinedEntries = {
    values: [
      [],
      ['approved', 'city', 'state', 'lat', 'lng', 'reason'], 
      ['x', 'San Francisco', 'CA', '47.6674625', '-122.3795306'], 
      ['x', 'Santa Monica', 'CA', '57.4585642', '-100.3339504'], 
    ]
  }; 
  const expected = {
    "CA": {
      "cities": {
        "san francisco": {
          "entries": [
            {"approved": "x", "city": "San Francisco", "datasetKey": "makers", "lat": "47.6674625", "lng": "-122.3795306", "reason": "", "state": "CA"}
          ]
        }, 
        "santa monica": {
          "entries": [
            {"approved": "x", "city": "Santa Monica", "datasetKey": "makers", "lat": "57.4585642", "lng": "-100.3339504", "reason": "", "state": "CA"}
          ]
        }
      }
    }
  }
  expect(toDataByLocation(undefinedEntries, 'makers')).toEqual(expected);
});