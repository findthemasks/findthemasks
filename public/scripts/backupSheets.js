/*
  Create a backup of each country's sheet in a country-specific
  Google Drive folder.
*/
function backupSheets() {
  
  var sheets = [{
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
  
  var formattedDate = Utilities.formatDate(new Date(), "PST", "yyyy-MM-dd' 'HH:mm:ss");
  
  var sheetsFolder = DriveApp.getFolderById("1scY72enARHyBS5nKow6qeT4TLH9feL09");
  
  for (var i = 0; i < sheets.length; i++) {
    var name = "Backup of " + sheets[i].name + " " + formattedDate;
  
    var file = DriveApp.getFileById(sheets[i].sheet_id);
  
    var destination = DriveApp.getFolderById(sheets[i].backup_folder_id);
  
    // Makes a copy of file with name "name" in the "destination" folder.
    file.makeCopy(name, destination);
  }
  
  // HACKHACKHACK
  // By default, any time you make a copy of a Google Sheet that is associated
  // with a form, a copy of the associated form is made.  This function deletes
  // those copies.
  cleanupFormCopies(sheetsFolder);
}

function cleanupFormCopies(folder) {
  var filesIterator = folder.getFiles();
  
  while (filesIterator.hasNext()) {
    var file = filesIterator.next();
    if (file.getName().indexOf("Copy of #findthemasks form") == -1) {
      continue;
    } else {
      Logger.log("Found file to clean up: " + file.getName());
      folder.removeFile(file);
    }
  }  
}
