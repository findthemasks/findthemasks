import csv
import json
from uszipcode import SearchEngine

search = SearchEngine(simple_zipcode=True)

def getVal(row, num):
  if num > (len(row) -1):
    return ''
  return row[num].strip()

json_array = [[ 'approved',
          'name',
          'website',
          'public_contact',
          'city',
          'state',
          'zip',
          'country',
          'capabilities',
          'products',
          'other_product',
          'face_shield_type',
          'collecting_site',
          'shipping',
          'accepting_volunteers',
          'other_type_of_space',
          'accepting_ppe_requests',
          'org_collaboration',
          'other_capability',
          'lat',
          'lng' ]]

# Duplicate first row to second to match old format.
json_array.append(json_array[0]);

with open('input.csv') as csvfile:
  reader = csv.reader(csvfile)
  for row in reader:
    name = getVal(row, 0)
    city = getVal(row, 3)
    state = getVal(row, 4)
    zipcode = getVal(row, 5)
    if name and city and state and zipcode:
      result = search.by_zipcode(zipcode)
      json_array.append(['x',
          name,
          getVal(row, 1),  # website
          getVal(row, 2),  # public_contact
          city,
          state,
          zipcode,
          getVal(row, 6),   # country
          getVal(row, 7),   # capabilities
          getVal(row, 8),   # products
          getVal(row, 9),   # other_product
          getVal(row, 10),  # face_shield_type
          getVal(row, 11),  # collecting_site
          getVal(row, 12),  # shipping
          getVal(row, 13),  # accepting_volunteers
#          getVal(row, 14), # group_type
          getVal(row, 15),  # other_type_of_space
          getVal(row, 16),  # accepting_ppe_requests
#          getVal(row, 17), # public_confirmation 
#          getVal(row, 18), # face_shields_per_week
#          getVal(row, 19), # cloth_masks_per_week
#          getVal(row, 20), # 3d_printed_masks_per_week
#          getVal(row, 21), # other_items_per_week
#          getVal(row, 22),  # staff
#          getVal(row, 23),  # volunteers
          getVal(row, 24),  # org_collaboration
#          getVal(row, 25), # private_name
          getVal(row, 26),  # other_capability
#          getVal(row, 27), # private_email
#          getVal(row, 28), # private_address
#          getVal(row, 29), # make_sustainable
#          getVal(row, 30), # grant_interest
#          getVal(row, 31), # post_survey_notes
#          getVal(row, 32), # hand_entered
          result.lat,
          result.lng])

out = { 'values': json_array }

print json.dumps(out, indent=2)
