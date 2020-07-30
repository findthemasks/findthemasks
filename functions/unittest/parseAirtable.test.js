const mockAirtable = require ('../airtable-shared-view.js');
const { parseAirtableData } = require('../airtable-shared-view.js');

describe('mapColumn() should detect any ftm-name in [] and set up the appropriate translator based on column type', () => {
  const testColumn = [
    {
      name: 'This string should not be matched [matched-string]',
      type: 'text',
      id: 'first',
    },
    {
      name: 'Nothing should match here',
      type: 'select',
      id: 'second',
    },
  ];  
  test('If the column name has a string encapsulated in [], regex should match and a ftm-name property should be made', () => {
    const copyTestColumn = JSON.parse(JSON.stringify(testColumn));
    const returnColumns = mockAirtable.unitTestFunctions.mapColumns(copyTestColumn);
    expect(returnColumns.first).toBeDefined();
    expect(returnColumns.first.ftm_name).toEqual('matched-string');
    expect(returnColumns.second.ftm_name).toBeUndefined();
  });
  test('There should be a default function for valueTranslator, specific functions should be used to match the column type', () => {
    const copyTestColumn = JSON.parse(JSON.stringify(testColumn));
    const returnColumns = mockAirtable.unitTestFunctions.mapColumns(copyTestColumn);
    expect(returnColumns.first.valueTranslator).toEqual(mockAirtable.unitTestFunctions.identityTranslator);
    expect(returnColumns.second.valueTranslator).not.toEqual(mockAirtable.unitTestFunctions.identityTranslator);
    expect(returnColumns.second.valueTranslator).toEqual(expect.any(Function));
  });
});

describe('parseAirtableData() should be able to go through each row and generate usable data structure for us', () => {
  const testData = {
    data: {
      table: {
        columns: [
          {
            name: 'This string should not be matched [matched-string]',
            type: 'text',
            id: 'first',
          },
          {
            name: 'Nothing should match here',
            type: 'text',
            id: 'second',
          },
        ],
        rows: [
          {
            id: 1,
            cellValuesByColumnId: {
              first: ' this string has an intial space to be trimmed by default valueTranslator',
              second: 'the key for this data should not be the ftm_name',
              third: 'This should not be part of the final data since it does not match a column'
            },
          },
        ],
      },
    },
  };
  test('Code should go through each key-value pair in a row and generate a new data structure', () => {
    const received = parseAirtableData(testData);
    expect(received.length).toEqual(1);
    expect(received[0].row).toEqual(1);
    expect(received[0]['Nothing should match here']).toEqual('the key for this data should not be the ftm_name');
    expect(received[0]['matched-string']).toEqual('this string has an intial space to be trimmed by default valueTranslator');
    expect(Object.entries(received[0]).length).toEqual(3);
  });
});