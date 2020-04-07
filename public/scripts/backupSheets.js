const SHEETS = [{
      name: "Austria",
      sheet_id: "19gKSyKmT4yU7F32R3lBM6p0rmMJXusX_uMYDq1CMTIo",
      backup_folder_id: "1tbSRmLPTPL6KnF3yk9JpBUIrnhvpzrHc"
    }, {
      name: "Canada",
      sheet_id: "1STjEiAZVZncXMCUBkfLumRNk1PySLSmkvZuPqflQ1Yk",
      backup_folder_id:"1s5rt7JS4rkPnjcPWigXTq3Cse-EZvN2s"
    }, {
      name: "France",
      sheet_id: "1YGWlGPOfJFEsUP6VTFCVohlsHxKMYA5HppatbLwNBVk",
      backup_folder_id: "1B1IRElP7PDOyk6-1kokFmHPl06pF6y3n"
    },{
      name: "Germany",
      sheet_id: "1qiR4JRvPrbOwlPnEXCoUFWpfZtV9xadjBTCOhVy-dJM",
      backup_folder_id: "1S5MbEBiZr_9AKkMo3L962042kTF7HTGs"
    },{
      name: "Italy",
      sheet_id: "1YHt6G1ghcXrRqXflevxHAwg2XOXmG2Cym6nSS5vXe7Q",
      backup_folder_id: "1Ta9sBWGg-SgN7RDVXHh8NclmaRFFwQvq"
    },{
      name: "Poland",
      sheet_id: "10EsvvozwLTQpn0ejvPjZSWt9lve3fnMHBHltW-v_zkY",
      backup_folder_id: "1sZGvs1sn5Hj2HajxXA97P7SEr95-Ztln"
    },{
      name: "Portugal",
      sheet_id: "1QnyjUUBT_P476dEl0WfQwVnW15Ie7ogty7DiOkMhHLo",
      backup_folder_id: "1KoGtj4DwElse6EDdjRgv-jzRV7h6ZelI"
    },{
      name: "Spain",
      sheet_id: "1S3FO5gmXUvQdsGXjC0hBSUxBJZoaUzy1ctylTjUGOlM",
      backup_folder_id: "1OSMPWsEAx-pyGmHM4nlAQ50IXtt3j_Sa"
    },{
      name: "Switzerland",
      sheet_id: "1mFbEzrWW8XLfrkAL0eCzGd1pCVNl6-QUxkoeubtdbPI",
      backup_folder_id: "15mbX5qyeNNuiIYjb49U8vmi_NYa-eMc3"
    },{
      name: "UK",
      sheet_id: "1qPUdGOEZl-c8sQ6Vlm7h48OZScBOVGjzz88AyGCQvEc",
      backup_folder_id: "1jQAgyDkiH4D1SfRwfg_0t27njDazypU9"
    },{
      name: "USA",
      sheet_id: "1GwP7Ly6iaqgcms0T80QGCNW4y2gJ7tzVND2CktFqnXM",
      backup_folder_id: "1gaKQLiUxeIHGJl3it-sDpAtjGEAhT-wg"
    }];

const SHEETS_FOLDER = "1scY72enARHyBS5nKow6qeT4TLH9feL09";

/*
  Create a backup of each country's sheet in a country-specific
  Google Drive folder.
*/
function backupSheets() {
    
  var formattedDate = Utilities.formatDate(new Date(), "PST", "yyyy-MM-dd' 'HH:mm:ss");
  
  var sheetsFolder = DriveApp.getFolderById(SHEETS_FOLDER);
  
  for (var i = 0; i < SHEETS.length; i++) {
    const name = "Backup of " + SHEETS[i].name + " " + formattedDate;
    const destination = DriveApp.getFolderById(SHEETS[i].backup_folder_id);
    const source = SpreadsheetApp.openById(SHEETS[i].sheet_id);
    
    copySheet(source, destination, name);
  }
}

/*
  If we do a simple file copy, we make a copy of the spreadsheet
  and also the associated form(s) and script files, which is bad.
  To work around this, we create a new spreadsheet and copy in the tabs
  (sheets) from the source sheet.
*/
function copySheet(sourceSpreadsheet, destinationFolder, name) {

  // Create new Spreadsheet in destination with name 'name'
  const newSpreadsheet = SpreadsheetApp.create(name);
  
  const newFile = DriveApp.getFileById(newSpreadsheet.getId());
  const parents = newFile.getParents();

  while (parents.hasNext()) {
    const parent = parents.next();
    parent.removeFile(newFile); // Remove from default folder
  }

  destinationFolder.addFile(newFile);
  
  // Copy tabs one at a time into the new Spreadsheet
  const sheets = sourceSpreadsheet.getSheets();

  sheets.forEach(function(sheet) {
     sheet.copyTo(newSpreadsheet);
  });

  // Remove empty first tab (created with new spreadsheet)
  newSpreadsheet.deleteSheet(newSpreadsheet.getSheets()[0]);
}

