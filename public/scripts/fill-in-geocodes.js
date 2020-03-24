function fillInGeocodes() {
    var sheetResponses = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form Responses 1");
    var sheetModerated = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("moderated");
    var data = sheetResponses.getDataRange().getValues();
    var moderatedData = sheetModerated.getDataRange().getValues();
    
    var moderatedColumn;
    var addressColumn;
    var latColumn;
    var lngColumn;
    
    // Get the column index for the 'moderated' column from the moderated sheet.
    // Note that the 'stable' header is row 2 (index 1).
    for (var i = 0; i < moderatedData[1].length; i++) {
      if (moderatedData[1][i] == "approved") {
        moderatedColumn = i;
      } 
    }
    
    // Get the number of rows populated in the responses sheet and get the column 
    // indices for spreadsheet  
    for (var i = 0; i < data[1].length; i++) {
      if (data[1][i] == "address") {
        addressColumn = i;
      } else if (data[1][i] == "lat") {
        latColumn = i;
      } else if (data[1][i] == "lng") {
        lngColumn = i;
      } 
    }
    // Figure out which rows aren't geocoded yet.
    // Start with the 3rd row (index = 2), since the first 2 rows are headers.
    for (var i = 2; i < data.length; i++) {
      // Geocode un-geocoded rows that *have* been moderated and populate the lat/lng values
      // into the responses sheet.
      if ((isNaN(data[i][latColumn]) || typeof data[i][latColumn] == 'undefined' || data[i][latColumn] == "") &&
           moderatedData[i][moderatedColumn] == "x") {
        address = data[i][addressColumn];
        if (data[i][addressColumn] != "N/A") {
          var response = Maps.newGeocoder().geocode(address);
          Utilities.sleep(500);
          var cellLat = sheetResponses.getRange(i + 1, latColumn + 1);
          var cellLng = sheetResponses.getRange(i + 1, lngColumn + 1);
       
          if (response.results.length > 0) {
            var location = response.results[0].geometry.location;  
            // Cell IDs are 1-based.  (Confusing, right?)
            cellLat.setValue(location.lat);          
            cellLng.setValue(location.lng);
          } else {
            cellLat.setValue("N/A");          
            cellLng.setValue("N/A");
          }        
        }      
      }
    }
  }