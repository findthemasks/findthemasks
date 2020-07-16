const mockIndex = require ('./index').testRefactor;
const mockGeoCode = require('./geocode');
const spyOnGeocodeAddress = jest.spyOn(mockGeoCode, 'geocodeAddress');
const spyOnWriteback = jest.spyOn(mockGeoCode, 'writeBack');
const regeneratorRuntime = require('regenerator-runtime');

test ('End to end testing to make sure every function gets ran once on an address that needs annotation', async() => {
    const fakeData = {
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
        ]
    }
    const fakeGeocode = {
        'canonical_address' : 'fake address',
        'location' : {
            'lat': 400,
            'lng': 200,
        }
    };
    spyOnGeocodeAddress.mockReturnValue(fakeGeocode);
    const data = await mockIndex.annotateGeocode(fakeData);
    expect(data).toBe({
        numGeocode : 1,
        numWritebacks : 1,
    });
    expect(spyOnGeocodeAddress).toHaveBeenCalled();
    expect(spyOnWriteback).toHaveBeenCalled(); 
});