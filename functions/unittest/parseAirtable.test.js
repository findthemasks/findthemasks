const mockAirtable = require ('../airtable-shared-view.js');

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
    const copyTestColumn = Object.assign([], testColumn);
    const returnColumns = mockAirtable.mapColumns(copyTestColumn);
    expect(returnColumns.first).toBeDefined();
    expect(returnColumns.first.ftm_name).toEqual('matched-string');
    expect(returnColumns.second.ftm_name).toBeUndefined();
  });
  test('There should be a default function for valueTranslator, specific functions should be used to match the column type', () => {
    const copyTestColumn = Object.assign([], testColumn);
    const returnColumns = mockAirtable.mapColumns(copyTestColumn);
    expect(returnColumns.first.valueTranslator).toEqual(mockAirtable.identityTranslator);
    expect(returnColumns.second.valueTranslator).not.toEqual(mockAirtable.identityTranslator);
    expect(returnColumns.second.valueTranslator).toEqual(expect.any(Function));
  });
});

describe('The value translators should have pre-defined behavior for different column entries', () => {
  const typeOptions = {
    choices: {
      first_choice: {
        name: 'first choice',
      },
      second_choice: {
        name: 'second choice',
      }
    },
  };
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
      typeOptions: typeOptions,
    },
    {
      name: 'Third column',
      type: 'multiSelect',
      id: 'third',
      typeOptions: typeOptions,
    },
    {
      name: 'Fourth column',
      type: 'foreignKey',
      id: 'fourth',
    }
  ];
  const returnColumns = mockAirtable.mapColumns(testColumn);

  test('The default value translator should trim all white spaces before and after the column value', () => {
    expect(returnColumns.first.valueTranslator(' whitespaces ')).toEqual('whitespaces');
  });
  test('The select value translator should go through the dictionary for select column and return name associated with id', () => {
    expect(returnColumns.second.valueTranslator('first_choice')).toEqual('first choice');
  });
  test('The multiselect value translator accept an array of ids and return all the associated names in a String', () => {
    expect(returnColumns.third.valueTranslator(['first_choice', 'second_choice'])).toEqual('first choice,second choice');
  });
  test('The foreignKey value translator accepts an array of values and return a String with the names of all the foreign rows', () => {
    const testInput = [
      {
        foreignRowDisplayName: 'First Value',
      },
      {
        foreignRowDisplayName: 'Second Value',
      },
    ];
    expect(returnColumns.fourth.valueTranslator(testInput)).toEqual('First Value,Second Value');
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
  test('parseAirtableData() should return the correct data structure', () => {
    const received = mockAirtable.parseAirtableData(testData);
    expect(received.length).toEqual(1);
    expect(received[0].row).toEqual(1);
    expect(Object.entries(received[0]).length).toEqual(3);
  });
});