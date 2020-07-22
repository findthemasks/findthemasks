//const { NamedModulesPlugin } = require("webpack");

const missingColumns = [
    "row_id",
    "approved",
    "reason",
    "mod_status",
    "source",
    "source-row",
    "timestamp",
    "entry_age",
    "name",
    "address",
    "orig_address",
    "city",
    "state",
    "instructions",
    "mail_me",
    "accepting",
    "open_box",
    "request_type",
    "org_type",
    "encrypted_email",
    "rdi",
    "lgtm_link",
    "remove_link",
    "row"
];

const approvedNoLatLng = {
    "values":[
        [
           "Row ID",
           "Approved",
           "Reason",
           "Mod Status",
           "Source",
           "Source-row",
           "Timestamp",
           "Entry Age (in days)",
           "What is the name of the hospital or clinic?",
           "Final Address",
           "Street address for dropoffs?",
           "City",
           "State?",
           "Write drop-off instructions below or paste a link to your organization's own page containing instructions. For written instructions, please include details such as curbside procedure, mailing address, email address, and/or phone number. Please note all information entered here will be made public.",
           "Wants mail",
           "What do you need?",
           "Will you accept open boxes/bags?",
           "Type of request:",
           "Type of organization?",
           "Encrypted Email",
           "Lat",
           "Lng",
           "RDI",
           "Action link for LGTM",
           "Action link for Remove",
           "Row"
        ],
        [
           "row_id",
           "approved",
           "reason",
           "mod_status",
           "source",
           "source-row",
           "timestamp",
           "entry_age",
           "name",
           "address",
           "orig_address",
           "city",
           "state",
           "instructions",
           "mail_me",
           "accepting",
           "open_box",
           "request_type",
           "org_type",
           "encrypted_email",
           "lat",
           "lng",
           "rdi",
           "lgtm_link",
           "remove_link",
           "row"
        ],
        [
           "3",
           "x",
           "",
           "FM",
           "",
           "",
           "3/19/2020 11:14:25",
           "78",
           "Swedish Ballard",
           "5300 Tallman Ave NW\nSeattle, WA 98107",
           "5300 Tallman Ave NW\nSeattle, WA 98107",
           "Seattle",
           "WA",
           "Put in donations bin at registration desk or at medical treatment center.\n\ncoviddonations@swedish.org",
           "",
           "N95s, Surgical Masks",
           "Yes",
           "",
           "Hospital",
           "",
           "",
           "",
           "Commercial",
           "https://findthemasks.com/api/exec?cmd=j43a3knUbOH8vGrWzZ08g6BMOqJcNCxPF__CSSDpEGb-XNThtKWExvFNrMb6psBaa3SfAbX1k0Ok5ZBdcsfvNWba0O4gcxEclqWZyA..",
           "https://findthemasks.com/api/exec?cmd=uW692feUvnGuxG4J0TRp7aldg_HW_EZvfbSQ0Z2nbsdzRXwsfSGVhZZ3TFRQ3USz_TmSY98vjgY9E7ni7U9PLTNynylZ4t3crjG02w..",
           3
        ],
    ]
};

const notApprovedMissingGeocode = {
    "values":[
        [
           "Row ID",
           "Approved",
           "Reason",
           "Mod Status",
           "Source",
           "Source-row",
           "Timestamp",
           "Entry Age (in days)",
           "What is the name of the hospital or clinic?",
           "Final Address",
           "Street address for dropoffs?",
           "City",
           "State?",
           "Write drop-off instructions below or paste a link to your organization's own page containing instructions. For written instructions, please include details such as curbside procedure, mailing address, email address, and/or phone number. Please note all information entered here will be made public.",
           "Wants mail",
           "What do you need?",
           "Will you accept open boxes/bags?",
           "Type of request:",
           "Type of organization?",
           "Encrypted Email",
           "Lat",
           "Lng",
           "RDI",
           "Action link for LGTM",
           "Action link for Remove",
           "Row"
        ],
        [
           "row_id",
           "approved",
           "reason",
           "mod_status",
           "source",
           "source-row",
           "timestamp",
           "entry_age",
           "name",
           "address",
           "orig_address",
           "city",
           "state",
           "instructions",
           "mail_me",
           "accepting",
           "open_box",
           "request_type",
           "org_type",
           "encrypted_email",
           "lat",
           "lng",
           "rdi",
           "lgtm_link",
           "remove_link",
           "row"
        ],
        [
           "3",
           "",
           "",
           "FM",
           "",
           "",
           "3/19/2020 11:14:25",
           "78",
           "Swedish Ballard",
           "5300 Tallman Ave NW\nSeattle, WA 98107",
           "5300 Tallman Ave NW\nSeattle, WA 98107",
           "Seattle",
           "WA",
           "Put in donations bin at registration desk or at medical treatment center.\n\ncoviddonations@swedish.org",
           "",
           "N95s, Surgical Masks",
           "Yes",
           "",
           "Hospital",
           "",
           "",
           "",
           "Commercial",
           "https://findthemasks.com/api/exec?cmd=j43a3knUbOH8vGrWzZ08g6BMOqJcNCxPF__CSSDpEGb-XNThtKWExvFNrMb6psBaa3SfAbX1k0Ok5ZBdcsfvNWba0O4gcxEclqWZyA..",
           "https://findthemasks.com/api/exec?cmd=uW692feUvnGuxG4J0TRp7aldg_HW_EZvfbSQ0Z2nbsdzRXwsfSGVhZZ3TFRQ3USz_TmSY98vjgY9E7ni7U9PLTNynylZ4t3crjG02w..",
           3
        ],
    ]
};

const noAnnotation = {
   "range":"Combined!A1:AI5706",
   "majorDimension":"ROWS",
   "values":[
      [
         "Row ID",
         "Approved",
         "Reason",
         "Mod Status",
         "Source",
         "Source-row",
         "Timestamp",
         "Entry Age (in days)",
         "What is the name of the hospital or clinic?",
         "Final Address",
         "Street address for dropoffs?",
         "City",
         "State?",
         "Write drop-off instructions below or paste a link to your organization's own page containing instructions. For written instructions, please include details such as curbside procedure, mailing address, email address, and/or phone number. Please note all information entered here will be made public.",
         "Wants mail",
         "What do you need?",
         "Will you accept open boxes/bags?",
         "Type of request:",
         "Type of organization?",
         "Encrypted Email",
         "Lat",
         "Lng",
         "RDI",
         "Action link for LGTM",
         "Action link for Remove",
         "Row"
      ],
      [
         "row_id",
         "approved",
         "reason",
         "mod_status",
         "source",
         "source-row",
         "timestamp",
         "entry_age",
         "name",
         "address",
         "orig_address",
         "city",
         "state",
         "instructions",
         "mail_me",
         "accepting",
         "open_box",
         "request_type",
         "org_type",
         "encrypted_email",
         "lat",
         "lng",
         "rdi",
         "lgtm_link",
         "remove_link",
         "row"
      ],
      [
         "3",
         "x",
         "",
         "FM",
         "",
         "",
         "3/19/2020 11:14:25",
         "78",
         "Swedish Ballard",
         "5300 Tallman Ave NW\nSeattle, WA 98107",
         "5300 Tallman Ave NW\nSeattle, WA 98107",
         "Seattle",
         "WA",
         "Put in donations bin at registration desk or at medical treatment center.\n\ncoviddonations@swedish.org",
         "",
         "N95s, Surgical Masks",
         "Yes",
         "",
         "Hospital",
         "",
         "47.6674625",
         "-122.3795306",
         "Commercial",
         "https://findthemasks.com/api/exec?cmd=j43a3knUbOH8vGrWzZ08g6BMOqJcNCxPF__CSSDpEGb-XNThtKWExvFNrMb6psBaa3SfAbX1k0Ok5ZBdcsfvNWba0O4gcxEclqWZyA..",
         "https://findthemasks.com/api/exec?cmd=uW692feUvnGuxG4J0TRp7aldg_HW_EZvfbSQ0Z2nbsdzRXwsfSGVhZZ3TFRQ3USz_TmSY98vjgY9E7ni7U9PLTNynylZ4t3crjG02w..",
         3
      ],
      [
         "7",
         "x",
         "",
         "FM",
         "",
         "",
         "3/19/2020 15:11:30",
         "78",
         "Franciscan Women's Health Associates - Burien",
         "16045 1st Ave S\nBurien, WA 98148",
         "16045 1st Ave S\nBurien, WA 98148",
         "Burien",
         "WA",
         "Bring up stairs to the Women's care desk or call and a staff member will come down to get them.",
         "",
         "N95s, Surgical Masks",
         "Yes",
         "",
         "Outpatient Clinic",
         "",
         "47.4585642",
         "-122.3339504",
         "Commercial",
         "https://findthemasks.com/api/exec?cmd=ggb4jCgY9lN_X5r4E2GDQsF0V3s-IJpdjd2nKYRmWUITjpwhvSwuKLzdgyKskBNmSYKkVxFprrDR1Q56YK8qTPKytiFxOi48DtE-jQ..",
         "https://findthemasks.com/api/exec?cmd=ipaiYY8R_05kk9HqBtvKxJA7h1oSQZ_mlCFTSG2flBI100I9TvRUmjumc84-GIDTbAeYylJ4f0KI2zJ7UgQUb1LNdas9dX2fq12XFw..",
         7
      ],
      [
         "8",
         "x",
         "",
         "FM",
         "",
         "",
         "3/19/2020 15:19:46",
         "78",
         "Moab Regional Hospital",
         "450 Williams Way\nMoab, UT 84532",
         "450 Williams Way\nMoab, UT 84532",
         "Moab",
         "UT",
         "TBD",
         "",
         "N95s, Surgical Masks, Safety Goggles",
         "Yes",
         "",
         "Hospital",
         "",
         "38.5751558",
         "-109.5597751",
         "Commercial",
         "https://findthemasks.com/api/exec?cmd=YXXqINa1zvCtriStCUt5SvthCp65TjnC28TScPVw1hEtRJ8VrZXnJdf1jxCwRzK64wCCCMCzvBhprvDlbheGdwJOqf7YD8yGEo4mcw..",
         "https://findthemasks.com/api/exec?cmd=_C5IMFgMDjVxZHINQ1P6mYE_XqKMz6pL7QblVlAvj4sNRXrvKIoyoJFVWIbseMp-qSLji_WPNjYxcY_BcMcxsYIa4DQwwmanXCJwsA..",
         8
      ],
    ]
};

const fakeGeocode = {
    'canonical_address': 'fake address',
    'location': {
        'lat': 400,
        'lng': 200,
    }
};

const mockMapsResponse = {
   status: 200,
   data: {
       status: 'OK',
       results: [
           {
               formatted_address: '123 Wash',
               geometry:{
                   location: {
                       lat: '123',
                       lng: '345',
                   }
               }
           }
       ]
   },
   config: {
      url: 'Config URL',
      params: {
         param: 'Config Param',
      },
   },
};

const fakeWriteBack = [
   {
      geocode: fakeGeocode,
      row_num: 5,
   }, 
]

const fakeColumns = {
   latColumn: "lat",
   lngColumn: "lng",
   addressColumn: "address",
};

const fakeSheetID = "4242";

module.exports = {
    notApprovedMissingGeocode,
    missingColumns,
    approvedNoLatLng,
    noAnnotation,
    fakeGeocode,
    mockMapsResponse,
    fakeWriteBack,
    fakeColumns,
    fakeSheetID,
};