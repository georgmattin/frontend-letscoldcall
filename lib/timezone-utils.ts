// Utility functions for detecting timezone from phone numbers

// US Area Code to Timezone mapping (most common area codes)
const US_AREA_CODE_TIMEZONES: { [key: string]: string } = {
  // Pacific Time (UTC-8/-7)
  // California
  '209': 'America/Los_Angeles', // Stockton, California
  '213': 'America/Los_Angeles', // Los Angeles, California
  '279': 'America/Los_Angeles', // Sacramento, California
  '310': 'America/Los_Angeles', // West Los Angeles, California
  '323': 'America/Los_Angeles', // Los Angeles, California
  '341': 'America/Los_Angeles', // Oakland, California
  '350': 'America/Los_Angeles', // Stockton, California
  '408': 'America/Los_Angeles', // San Jose, California
  '415': 'America/Los_Angeles', // San Francisco, California
  '424': 'America/Los_Angeles', // West Los Angeles, California
  '442': 'America/Los_Angeles', // San Diego, California
  '510': 'America/Los_Angeles', // Oakland, California
  '530': 'America/Los_Angeles', // Redding, California
  '559': 'America/Los_Angeles', // Fresno, California
  '562': 'America/Los_Angeles', // Long Beach, California
  '619': 'America/Los_Angeles', // San Diego, California
  '626': 'America/Los_Angeles', // Pasadena, California
  '628': 'America/Los_Angeles', // San Francisco, California
  '650': 'America/Los_Angeles', // San Mateo, California
  '657': 'America/Los_Angeles', // Orange County, California
  '661': 'America/Los_Angeles', // Bakersfield, California
  '669': 'America/Los_Angeles', // San Jose, California
  '707': 'America/Los_Angeles', // Napa, California
  '714': 'America/Los_Angeles', // Orange County, California
  '747': 'America/Los_Angeles', // San Fernando Valley, California
  '760': 'America/Los_Angeles', // Oceanside, California
  '805': 'America/Los_Angeles', // Ventura, California
  '818': 'America/Los_Angeles', // San Fernando Valley, California
  '820': 'America/Los_Angeles', // California
  '831': 'America/Los_Angeles', // Monterey, California
  '840': 'America/Los_Angeles', // California
  '858': 'America/Los_Angeles', // San Diego, California
  '909': 'America/Los_Angeles', // San Bernardino, California
  '916': 'America/Los_Angeles', // Sacramento, California
  '925': 'America/Los_Angeles', // Concord, California
  '949': 'America/Los_Angeles', // Orange County, California
  '951': 'America/Los_Angeles', // Riverside, California
  
  // Washington
  '206': 'America/Los_Angeles', // Seattle, Washington
  '253': 'America/Los_Angeles', // Tacoma, Washington
  '360': 'America/Los_Angeles', // Olympia, Washington
  '425': 'America/Los_Angeles', // Bellevue, Washington
  '509': 'America/Los_Angeles', // Spokane, Washington
  '564': 'America/Los_Angeles', // Washington
  
  // Oregon
  '458': 'America/Los_Angeles', // Oregon
  '503': 'America/Los_Angeles', // Portland, Oregon
  '541': 'America/Los_Angeles', // Eugene, Oregon
  '971': 'America/Los_Angeles', // Portland, Oregon
  
  // Nevada (Pacific portions)
  '775': 'America/Los_Angeles', // Reno, Nevada
  
  // Alaska
  '907': 'America/Anchorage', // Alaska

  // Mountain Time (UTC-7/-6)
  // Arizona (no DST)
  '480': 'America/Phoenix', // Scottsdale, Arizona
  '520': 'America/Phoenix', // Tucson, Arizona
  '602': 'America/Phoenix', // Phoenix, Arizona
  '623': 'America/Phoenix', // Phoenix, Arizona
  '928': 'America/Phoenix', // Flagstaff, Arizona
  
  // Colorado
  '303': 'America/Denver', // Denver, Colorado
  '719': 'America/Denver', // Colorado Springs, Colorado
  '720': 'America/Denver', // Denver, Colorado
  '970': 'America/Denver', // Fort Collins, Colorado
  '983': 'America/Denver', // Colorado
  
  // Utah
  '385': 'America/Denver', // Salt Lake City, Utah
  '435': 'America/Denver', // Southern Utah
  '801': 'America/Denver', // Salt Lake City, Utah
  
  // New Mexico
  '505': 'America/Denver', // Albuquerque, New Mexico
  '575': 'America/Denver', // Las Cruces, New Mexico
  
  // Montana
  '406': 'America/Denver', // Montana
  
  // Wyoming
  '307': 'America/Denver', // Wyoming
  
  // Idaho
  '208': 'America/Denver', // Boise, Idaho
  '986': 'America/Denver', // Idaho
  
  // North Dakota
  '701': 'America/Denver', // North Dakota
  
  // Nevada (Mountain portions)
  '702': 'America/Los_Angeles', // Las Vegas, Nevada
  '725': 'America/Los_Angeles', // Las Vegas, Nevada

  // Central Time (UTC-6/-5)
  // Texas
  '210': 'America/Chicago', // San Antonio, Texas
  '214': 'America/Chicago', // Dallas, Texas
  '254': 'America/Chicago', // Killeen, Texas
  '281': 'America/Chicago', // Houston, Texas
  '325': 'America/Chicago', // Abilene, Texas
  '346': 'America/Chicago', // Houston, Texas
  '361': 'America/Chicago', // Corpus Christi, Texas
  '409': 'America/Chicago', // Beaumont, Texas
  '430': 'America/Chicago', // Northeast Texas
  '432': 'America/Chicago', // Midland, Texas
  '469': 'America/Chicago', // Dallas, Texas
  '512': 'America/Chicago', // Austin, Texas
  '682': 'America/Chicago', // Fort Worth, Texas
  '713': 'America/Chicago', // Houston, Texas
  '726': 'America/Chicago', // San Antonio, Texas
  '737': 'America/Chicago', // Austin, Texas
  '806': 'America/Chicago', // Lubbock, Texas
  '817': 'America/Chicago', // Fort Worth, Texas
  '830': 'America/Chicago', // Fredericksburg, Texas
  '832': 'America/Chicago', // Houston, Texas
  '903': 'America/Chicago', // Tyler, Texas
  '915': 'America/Chicago', // El Paso, Texas
  '936': 'America/Chicago', // Huntsville, Texas
  '940': 'America/Chicago', // Wichita Falls, Texas
  '945': 'America/Chicago', // Dallas, Texas
  '956': 'America/Chicago', // Laredo, Texas
  '972': 'America/Chicago', // Dallas, Texas
  '979': 'America/Chicago', // College Station, Texas
  
  // Louisiana
  '225': 'America/Chicago', // Baton Rouge, Louisiana
  '318': 'America/Chicago', // Shreveport, Louisiana
  '337': 'America/Chicago', // Lafayette, Louisiana
  '504': 'America/Chicago', // New Orleans, Louisiana
  '985': 'America/Chicago', // Houma, Louisiana
  
  // Arkansas
  '327': 'America/Chicago', // Arkansas
  '479': 'America/Chicago', // Fort Smith, Arkansas
  '501': 'America/Chicago', // Little Rock, Arkansas
  '870': 'America/Chicago', // Arkansas
  
  // Missouri
  '235': 'America/Chicago', // Missouri
  '314': 'America/Chicago', // St. Louis, Missouri
  '417': 'America/Chicago', // Springfield, Missouri
  '557': 'America/Chicago', // Missouri
  '573': 'America/Chicago', // Columbia, Missouri
  '636': 'America/Chicago', // St. Charles, Missouri
  '660': 'America/Chicago', // Sedalia, Missouri
  '816': 'America/Chicago', // Kansas City, Missouri
  '975': 'America/Chicago', // Missouri
  
  // Kansas
  '316': 'America/Chicago', // Wichita, Kansas
  '620': 'America/Chicago', // Hutchinson, Kansas
  '785': 'America/Chicago', // Topeka, Kansas
  '913': 'America/Chicago', // Kansas City, Kansas
  
  // Oklahoma
  '405': 'America/Chicago', // Oklahoma City, Oklahoma
  '539': 'America/Chicago', // Tulsa, Oklahoma
  '572': 'America/Chicago', // Oklahoma
  '580': 'America/Chicago', // Lawton, Oklahoma
  '918': 'America/Chicago', // Tulsa, Oklahoma
  
  // Mississippi
  '228': 'America/Chicago', // Gulfport, Mississippi
  '601': 'America/Chicago', // Jackson, Mississippi
  '662': 'America/Chicago', // Tupelo, Mississippi
  '769': 'America/Chicago', // Mississippi
  
  // Alabama
  '205': 'America/Chicago', // Birmingham, Alabama
  '251': 'America/Chicago', // Mobile, Alabama
  '256': 'America/Chicago', // Huntsville, Alabama
  '334': 'America/Chicago', // Montgomery, Alabama
  '659': 'America/Chicago', // Alabama
  '938': 'America/Chicago', // Alabama
  
  // Tennessee
  '423': 'America/New_York', // Chattanooga, Tennessee (Eastern)
  '615': 'America/Chicago', // Nashville, Tennessee
  '629': 'America/Chicago', // Nashville, Tennessee
  '731': 'America/Chicago', // Jackson, Tennessee
  '865': 'America/New_York', // Knoxville, Tennessee (Eastern)
  '901': 'America/Chicago', // Memphis, Tennessee
  '931': 'America/Chicago', // Clarksville, Tennessee
  
  // Illinois
  '217': 'America/Chicago', // Springfield, Illinois
  '224': 'America/Chicago', // Northern Illinois
  '309': 'America/Chicago', // Peoria, Illinois
  '312': 'America/Chicago', // Chicago, Illinois
  '331': 'America/Chicago', // Chicago suburbs, Illinois
  '447': 'America/Chicago', // Illinois
  '464': 'America/Chicago', // Illinois
  '618': 'America/Chicago', // Southern Illinois
  '630': 'America/Chicago', // Chicago suburbs, Illinois
  '708': 'America/Chicago', // Chicago suburbs, Illinois
  '730': 'America/Chicago', // Illinois
  '773': 'America/Chicago', // Chicago, Illinois
  '779': 'America/Chicago', // Northern Illinois
  '815': 'America/Chicago', // Rockford, Illinois
  '847': 'America/Chicago', // Chicago suburbs, Illinois
  '861': 'America/Chicago', // Illinois
  '872': 'America/Chicago', // Chicago, Illinois
  
  // Indiana
  '219': 'America/Chicago', // Gary, Indiana
  '260': 'America/New_York', // Fort Wayne, Indiana (Eastern)
  '317': 'America/New_York', // Indianapolis, Indiana (Eastern)
  '463': 'America/New_York', // Indianapolis, Indiana (Eastern)
  '574': 'America/New_York', // South Bend, Indiana (Eastern)
  '765': 'America/New_York', // Muncie, Indiana (Eastern)
  '812': 'America/New_York', // Evansville, Indiana (Eastern)
  '930': 'America/New_York', // Indiana (Eastern)
  
  // Wisconsin
  '262': 'America/Chicago', // Racine, Wisconsin
  '274': 'America/Chicago', // Wisconsin
  '414': 'America/Chicago', // Milwaukee, Wisconsin
  '534': 'America/Chicago', // Wisconsin
  '608': 'America/Chicago', // Madison, Wisconsin
  '715': 'America/Chicago', // Eau Claire, Wisconsin
  '920': 'America/Chicago', // Green Bay, Wisconsin
  
  // Michigan
  '231': 'America/New_York', // Traverse City, Michigan (Eastern)
  '248': 'America/New_York', // Oakland County, Michigan (Eastern)
  '269': 'America/New_York', // Kalamazoo, Michigan (Eastern)
  '313': 'America/New_York', // Detroit, Michigan (Eastern)
  '517': 'America/New_York', // Lansing, Michigan (Eastern)
  '586': 'America/New_York', // Warren, Michigan (Eastern)
  '616': 'America/New_York', // Grand Rapids, Michigan (Eastern)
  '679': 'America/New_York', // Michigan (Eastern)
  '734': 'America/New_York', // Ann Arbor, Michigan (Eastern)
  '810': 'America/New_York', // Flint, Michigan (Eastern)
  '906': 'America/Chicago', // Upper Peninsula, Michigan (Central)
  '947': 'America/New_York', // Michigan (Eastern)
  '989': 'America/New_York', // Saginaw, Michigan (Eastern)
  
  // Minnesota
  '218': 'America/Chicago', // Duluth, Minnesota
  '320': 'America/Chicago', // St. Cloud, Minnesota
  '507': 'America/Chicago', // Rochester, Minnesota
  '612': 'America/Chicago', // Minneapolis, Minnesota
  '651': 'America/Chicago', // St. Paul, Minnesota
  '763': 'America/Chicago', // Minneapolis suburbs, Minnesota
  '952': 'America/Chicago', // Minneapolis suburbs, Minnesota
  
  // Iowa
  '319': 'America/Chicago', // Cedar Rapids, Iowa
  '515': 'America/Chicago', // Des Moines, Iowa
  '563': 'America/Chicago', // Davenport, Iowa
  '641': 'America/Chicago', // Mason City, Iowa
  '712': 'America/Chicago', // Sioux City, Iowa
  
  // Nebraska
  '308': 'America/Chicago', // North Platte, Nebraska
  '402': 'America/Chicago', // Omaha, Nebraska
  '531': 'America/Chicago', // Nebraska
  
  // South Dakota
  '605': 'America/Chicago', // South Dakota

  // Eastern Time (UTC-5/-4)
  // New York
  '212': 'America/New_York', // Manhattan, New York
  '315': 'America/New_York', // Syracuse, New York
  '332': 'America/New_York', // New York City, New York
  '347': 'America/New_York', // Brooklyn, New York
  '363': 'America/New_York', // Long Island, New York
  '516': 'America/New_York', // Nassau County, New York
  '518': 'America/New_York', // Albany, New York
  '585': 'America/New_York', // Rochester, New York
  '607': 'America/New_York', // Binghamton, New York
  '631': 'America/New_York', // Suffolk County, New York
  '646': 'America/New_York', // Manhattan, New York
  '680': 'America/New_York', // New York
  '716': 'America/New_York', // Buffalo, New York
  '718': 'America/New_York', // Brooklyn, New York
  '838': 'America/New_York', // New York
  '845': 'America/New_York', // Hudson Valley, New York
  '914': 'America/New_York', // Westchester County, New York
  '917': 'America/New_York', // New York City, New York
  '929': 'America/New_York', // New York City, New York
  '934': 'America/New_York', // Long Island, New York
  
  // New Jersey
  '201': 'America/New_York', // Jersey City, New Jersey
  '551': 'America/New_York', // Northern New Jersey
  '609': 'America/New_York', // Trenton, New Jersey
  '640': 'America/New_York', // New Jersey
  '732': 'America/New_York', // New Brunswick, New Jersey
  '848': 'America/New_York', // Central New Jersey
  '856': 'America/New_York', // Camden, New Jersey
  '862': 'America/New_York', // Newark, New Jersey
  '908': 'America/New_York', // Elizabeth, New Jersey
  '973': 'America/New_York', // Newark, New Jersey
  
  // Pennsylvania
  '215': 'America/New_York', // Philadelphia, Pennsylvania
  '223': 'America/New_York', // Central Pennsylvania
  '267': 'America/New_York', // Philadelphia, Pennsylvania
  '272': 'America/New_York', // Northeastern Pennsylvania
  '412': 'America/New_York', // Pittsburgh, Pennsylvania
  '445': 'America/New_York', // Philadelphia, Pennsylvania
  '484': 'America/New_York', // Eastern Pennsylvania
  '570': 'America/New_York', // Scranton, Pennsylvania
  '582': 'America/New_York', // Pennsylvania
  '610': 'America/New_York', // Allentown, Pennsylvania
  '717': 'America/New_York', // Harrisburg, Pennsylvania
  '724': 'America/New_York', // Western Pennsylvania
  '814': 'America/New_York', // Erie, Pennsylvania
  '835': 'America/New_York', // Pennsylvania
  '878': 'America/New_York', // Pennsylvania
  
  // Florida
  '239': 'America/New_York', // Fort Myers, Florida
  '305': 'America/New_York', // Miami, Florida
  '321': 'America/New_York', // Melbourne, Florida
  '324': 'America/New_York', // Florida
  '352': 'America/New_York', // Gainesville, Florida
  '386': 'America/New_York', // Daytona Beach, Florida
  '407': 'America/New_York', // Orlando, Florida
  '448': 'America/New_York', // Florida
  '561': 'America/New_York', // West Palm Beach, Florida
  '645': 'America/New_York', // Florida
  '656': 'America/New_York', // Florida
  '689': 'America/New_York', // Orlando, Florida
  '727': 'America/New_York', // Clearwater, Florida
  '728': 'America/New_York', // Florida
  '754': 'America/New_York', // Fort Lauderdale, Florida
  '772': 'America/New_York', // Port St. Lucie, Florida
  '786': 'America/New_York', // Miami, Florida
  '813': 'America/New_York', // Tampa, Florida
  '850': 'America/New_York', // Tallahassee, Florida
  '863': 'America/New_York', // Lakeland, Florida
  '904': 'America/New_York', // Jacksonville, Florida
  '941': 'America/New_York', // Sarasota, Florida
  '954': 'America/New_York', // Fort Lauderdale, Florida
  
  // Georgia
  '229': 'America/New_York', // Albany, Georgia
  '404': 'America/New_York', // Atlanta, Georgia
  '470': 'America/New_York', // Atlanta, Georgia
  '478': 'America/New_York', // Macon, Georgia
  '678': 'America/New_York', // Atlanta, Georgia
  '706': 'America/New_York', // Augusta, Georgia
  '762': 'America/New_York', // Augusta, Georgia
  '770': 'America/New_York', // Atlanta suburbs, Georgia
  '912': 'America/New_York', // Savannah, Georgia
  '943': 'America/New_York', // Georgia
  
  // North Carolina
  '252': 'America/New_York', // Greenville, North Carolina
  '336': 'America/New_York', // Greensboro, North Carolina
  '472': 'America/New_York', // North Carolina
  '704': 'America/New_York', // Charlotte, North Carolina
  '743': 'America/New_York', // Charlotte, North Carolina
  '828': 'America/New_York', // Asheville, North Carolina
  '910': 'America/New_York', // Fayetteville, North Carolina
  '919': 'America/New_York', // Raleigh, North Carolina
  '980': 'America/New_York', // Charlotte, North Carolina
  '984': 'America/New_York', // Raleigh, North Carolina
  
  // South Carolina
  '803': 'America/New_York', // Columbia, South Carolina
  '839': 'America/New_York', // South Carolina
  '843': 'America/New_York', // Charleston, South Carolina
  '854': 'America/New_York', // South Carolina
  '864': 'America/New_York', // Greenville, South Carolina
  
  // Virginia
  '276': 'America/New_York', // Southwest Virginia
  '434': 'America/New_York', // Lynchburg, Virginia
  '540': 'America/New_York', // Roanoke, Virginia
  '571': 'America/New_York', // Northern Virginia
  '703': 'America/New_York', // Arlington, Virginia
  '757': 'America/New_York', // Norfolk, Virginia
  '804': 'America/New_York', // Richmond, Virginia
  
  // Maryland
  '227': 'America/New_York', // Western Maryland
  '240': 'America/New_York', // Montgomery County, Maryland
  '301': 'America/New_York', // Bethesda, Maryland
  '410': 'America/New_York', // Baltimore, Maryland
  '443': 'America/New_York', // Baltimore, Maryland
  '667': 'America/New_York', // Maryland
  
  // Washington D.C.
  '202': 'America/New_York', // Washington, District of Columbia
  '771': 'America/New_York', // Washington, District of Columbia
  
  // Delaware
  '302': 'America/New_York', // Delaware
  
  // Connecticut
  '203': 'America/New_York', // Bridgeport, Connecticut
  '475': 'America/New_York', // Connecticut
  '860': 'America/New_York', // Hartford, Connecticut
  '959': 'America/New_York', // Connecticut
  
  // Massachusetts
  '339': 'America/New_York', // Massachusetts
  '351': 'America/New_York', // Massachusetts
  '413': 'America/New_York', // Springfield, Massachusetts
  '508': 'America/New_York', // Worcester, Massachusetts
  '617': 'America/New_York', // Boston, Massachusetts
  '774': 'America/New_York', // Massachusetts
  '781': 'America/New_York', // Boston suburbs, Massachusetts
  '857': 'America/New_York', // Boston, Massachusetts
  '978': 'America/New_York', // Lowell, Massachusetts
  
  // Rhode Island
  '401': 'America/New_York', // Rhode Island
  
  // Vermont
  '802': 'America/New_York', // Vermont
  
  // New Hampshire
  '603': 'America/New_York', // New Hampshire
  
  // Maine
  '207': 'America/New_York', // Maine
  
  // Kentucky (Eastern)
  '270': 'America/Chicago', // Bowling Green, Kentucky
  '364': 'America/Chicago', // Kentucky
  '502': 'America/New_York', // Louisville, Kentucky
  '606': 'America/New_York', // Eastern Kentucky
  '859': 'America/New_York', // Lexington, Kentucky
  
  // West Virginia
  '304': 'America/New_York', // West Virginia
  '681': 'America/New_York', // West Virginia
  
  // Ohio
  '216': 'America/New_York', // Cleveland, Ohio
  '220': 'America/New_York', // Ohio
  '234': 'America/New_York', // Akron, Ohio
  '283': 'America/New_York', // Cincinnati, Ohio
  '326': 'America/New_York', // Ohio
  '330': 'America/New_York', // Akron, Ohio
  '380': 'America/New_York', // Ohio
  '419': 'America/New_York', // Toledo, Ohio
  '440': 'America/New_York', // Cleveland suburbs, Ohio
  '513': 'America/New_York', // Cincinnati, Ohio
  '567': 'America/New_York', // Toledo, Ohio
  '614': 'America/New_York', // Columbus, Ohio
  '740': 'America/New_York', // Zanesville, Ohio
  '937': 'America/New_York', // Dayton, Ohio
  
  // Hawaii (Hawaii-Aleutian Time)
  '808': 'Pacific/Honolulu', // Hawaii
}

// Country codes to timezone mapping
const COUNTRY_TIMEZONES: { [key: string]: string } = {
  '1': 'America/New_York', // US/Canada - default to Eastern (will be overridden by area code)
  '44': 'Europe/London', // UK
  '49': 'Europe/Berlin', // Germany
  '33': 'Europe/Paris', // France
  '39': 'Europe/Rome', // Italy
  '34': 'Europe/Madrid', // Spain
  '31': 'Europe/Amsterdam', // Netherlands
  '32': 'Europe/Brussels', // Belgium
  '41': 'Europe/Zurich', // Switzerland
  '43': 'Europe/Vienna', // Austria
  '45': 'Europe/Copenhagen', // Denmark
  '46': 'Europe/Stockholm', // Sweden
  '47': 'Europe/Oslo', // Norway
  '358': 'Europe/Helsinki', // Finland
  '372': 'Europe/Tallinn', // Estonia
  '371': 'Europe/Riga', // Latvia
  '370': 'Europe/Vilnius', // Lithuania
  '7': 'Europe/Moscow', // Russia
  '86': 'Asia/Shanghai', // China
  '81': 'Asia/Tokyo', // Japan
  '82': 'Asia/Seoul', // South Korea
  '91': 'Asia/Kolkata', // India
  '61': 'Australia/Sydney', // Australia
  '64': 'Pacific/Auckland', // New Zealand
  '55': 'America/Sao_Paulo', // Brazil
  '52': 'America/Mexico_City', // Mexico
  '54': 'America/Argentina/Buenos_Aires', // Argentina
  '56': 'America/Santiago', // Chile
  '57': 'America/Bogota', // Colombia
  '58': 'America/Caracas', // Venezuela
  '51': 'America/Lima', // Peru
  '593': 'America/Guayaquil', // Ecuador
  '595': 'America/Asuncion', // Paraguay
  '598': 'America/Montevideo', // Uruguay
  '27': 'Africa/Johannesburg', // South Africa
  '20': 'Africa/Cairo', // Egypt
  '234': 'Africa/Lagos', // Nigeria
  '254': 'Africa/Nairobi', // Kenya
}

// Location names for display
const TIMEZONE_DISPLAY_NAMES: { [key: string]: string } = {
  'America/Los_Angeles': 'California',
  'America/Denver': 'Mountain Time',
  'America/Phoenix': 'Arizona',
  'America/Chicago': 'Central Time',
  'America/New_York': 'Eastern Time',
  'Europe/London': 'London',
  'Europe/Berlin': 'Germany',
  'Europe/Paris': 'France',
  'Europe/Rome': 'Italy',
  'Europe/Madrid': 'Spain',
  'Europe/Amsterdam': 'Netherlands',
  'Europe/Brussels': 'Belgium',
  'Europe/Zurich': 'Switzerland',
  'Europe/Vienna': 'Austria',
  'Europe/Copenhagen': 'Denmark',
  'Europe/Stockholm': 'Sweden',
  'Europe/Oslo': 'Norway',
  'Europe/Helsinki': 'Finland',
  'Europe/Tallinn': 'Estonia',
  'Europe/Riga': 'Latvia',
  'Europe/Vilnius': 'Lithuania',
  'Europe/Moscow': 'Moscow',
  'Asia/Shanghai': 'China',
  'Asia/Tokyo': 'Japan',
  'Asia/Seoul': 'South Korea',
  'Asia/Kolkata': 'India',
  'Australia/Sydney': 'Australia',
  'Pacific/Auckland': 'New Zealand',
  'America/Sao_Paulo': 'Brazil',
  'America/Mexico_City': 'Mexico',
  'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Santiago': 'Chile',
  'America/Bogota': 'Colombia',
  'America/Caracas': 'Venezuela',
  'America/Lima': 'Peru',
  'America/Guayaquil': 'Ecuador',
  'America/Asuncion': 'Paraguay',
  'America/Montevideo': 'Uruguay',
  'Africa/Johannesburg': 'South Africa',
  'Africa/Cairo': 'Egypt',
  'Africa/Lagos': 'Nigeria',
  'Africa/Nairobi': 'Kenya',
}

// Detailed US Area Code to Location mapping
const US_AREA_CODE_LOCATIONS: { [key: string]: string } = {
  // Pacific Time - California
  '209': 'Stockton, California',
  '213': 'Los Angeles, California',
  '279': 'Sacramento, California',
  '310': 'West Los Angeles, California',
  '323': 'Los Angeles, California',
  '341': 'Oakland, California',
  '350': 'Stockton, California',
  '408': 'San Jose, California',
  '415': 'San Francisco, California',
  '424': 'West Los Angeles, California',
  '442': 'San Diego, California',
  '510': 'Oakland, California',
  '530': 'Redding, California',
  '559': 'Fresno, California',
  '562': 'Long Beach, California',
  '619': 'San Diego, California',
  '626': 'Pasadena, California',
  '628': 'San Francisco, California',
  '650': 'San Mateo, California',
  '657': 'Orange County, California',
  '661': 'Bakersfield, California',
  '669': 'San Jose, California',
  '707': 'Napa, California',
  '714': 'Orange County, California',
  '747': 'San Fernando Valley, California',
  '760': 'Oceanside, California',
  '805': 'Ventura, California',
  '818': 'San Fernando Valley, California',
  '820': 'California',
  '831': 'Monterey, California',
  '840': 'California',
  '858': 'San Diego, California',
  '909': 'San Bernardino, California',
  '916': 'Sacramento, California',
  '925': 'Concord, California',
  '949': 'Orange County, California',
  '951': 'Riverside, California',
  
  // Pacific Time - Washington
  '206': 'Seattle, Washington',
  '253': 'Tacoma, Washington',
  '360': 'Olympia, Washington',
  '425': 'Bellevue, Washington',
  '509': 'Spokane, Washington',
  '564': 'Washington',
  
  // Pacific Time - Oregon
  '458': 'Oregon',
  '503': 'Portland, Oregon',
  '541': 'Eugene, Oregon',
  '971': 'Portland, Oregon',
  
  // Pacific Time - Nevada
  '702': 'Las Vegas, Nevada',
  '725': 'Las Vegas, Nevada',
  '775': 'Reno, Nevada',
  
  // Alaska
  '907': 'Alaska',
  
  // Mountain Time - Arizona (no DST)
  '480': 'Scottsdale, Arizona',
  '520': 'Tucson, Arizona',
  '602': 'Phoenix, Arizona',
  '623': 'Phoenix, Arizona',
  '928': 'Flagstaff, Arizona',
  
  // Mountain Time - Colorado
  '303': 'Denver, Colorado',
  '719': 'Colorado Springs, Colorado',
  '720': 'Denver, Colorado',
  '970': 'Fort Collins, Colorado',
  '983': 'Colorado',
  
  // Mountain Time - Utah
  '385': 'Salt Lake City, Utah',
  '435': 'Southern Utah',
  '801': 'Salt Lake City, Utah',
  
  // Mountain Time - New Mexico
  '505': 'Albuquerque, New Mexico',
  '575': 'Las Cruces, New Mexico',
  
  // Mountain Time - Other
  '208': 'Boise, Idaho',
  '307': 'Wyoming',
  '406': 'Montana',
  '701': 'North Dakota',
  '986': 'Idaho',
  
  // Central Time - Texas
  '210': 'San Antonio, Texas',
  '214': 'Dallas, Texas',
  '254': 'Killeen, Texas',
  '281': 'Houston, Texas',
  '325': 'Abilene, Texas',
  '346': 'Houston, Texas',
  '361': 'Corpus Christi, Texas',
  '409': 'Beaumont, Texas',
  '430': 'Northeast Texas',
  '432': 'Midland, Texas',
  '469': 'Dallas, Texas',
  '512': 'Austin, Texas',
  '682': 'Fort Worth, Texas',
  '713': 'Houston, Texas',
  '726': 'San Antonio, Texas',
  '737': 'Austin, Texas',
  '806': 'Lubbock, Texas',
  '817': 'Fort Worth, Texas',
  '830': 'Fredericksburg, Texas',
  '832': 'Houston, Texas',
  '903': 'Tyler, Texas',
  '915': 'El Paso, Texas',
  '936': 'Huntsville, Texas',
  '940': 'Wichita Falls, Texas',
  '945': 'Dallas, Texas',
  '956': 'Laredo, Texas',
  '972': 'Dallas, Texas',
  '979': 'College Station, Texas',
  
  // Central Time - Louisiana
  '225': 'Baton Rouge, Louisiana',
  '318': 'Shreveport, Louisiana',
  '337': 'Lafayette, Louisiana',
  '504': 'New Orleans, Louisiana',
  '985': 'Houma, Louisiana',
  
  // Central Time - Arkansas
  '327': 'Arkansas',
  '479': 'Fort Smith, Arkansas',
  '501': 'Little Rock, Arkansas',
  '870': 'Arkansas',
  
  // Central Time - Missouri
  '235': 'Missouri',
  '314': 'St. Louis, Missouri',
  '417': 'Springfield, Missouri',
  '557': 'Missouri',
  '573': 'Columbia, Missouri',
  '636': 'St. Charles, Missouri',
  '660': 'Sedalia, Missouri',
  '816': 'Kansas City, Missouri',
  '975': 'Missouri',
  
  // Central Time - Kansas
  '316': 'Wichita, Kansas',
  '620': 'Hutchinson, Kansas',
  '785': 'Topeka, Kansas',
  '913': 'Kansas City, Kansas',
  
  // Central Time - Oklahoma
  '405': 'Oklahoma City, Oklahoma',
  '539': 'Tulsa, Oklahoma',
  '572': 'Oklahoma',
  '580': 'Lawton, Oklahoma',
  '918': 'Tulsa, Oklahoma',
  
  // Central Time - Mississippi
  '228': 'Gulfport, Mississippi',
  '601': 'Jackson, Mississippi',
  '662': 'Tupelo, Mississippi',
  '769': 'Mississippi',
  
  // Central Time - Alabama
  '205': 'Birmingham, Alabama',
  '251': 'Mobile, Alabama',
  '256': 'Huntsville, Alabama',
  '334': 'Montgomery, Alabama',
  '659': 'Alabama',
  '938': 'Alabama',
  
  // Central Time - Tennessee
  '615': 'Nashville, Tennessee',
  '629': 'Nashville, Tennessee',
  '731': 'Jackson, Tennessee',
  '901': 'Memphis, Tennessee',
  '931': 'Clarksville, Tennessee',
  
  // Central Time - Illinois
  '217': 'Springfield, Illinois',
  '224': 'Northern Illinois',
  '309': 'Peoria, Illinois',
  '312': 'Chicago, Illinois',
  '331': 'Chicago suburbs, Illinois',
  '447': 'Illinois',
  '464': 'Illinois',
  '618': 'Southern Illinois',
  '630': 'Chicago suburbs, Illinois',
  '708': 'Chicago suburbs, Illinois',
  '730': 'Illinois',
  '773': 'Chicago, Illinois',
  '779': 'Northern Illinois',
  '815': 'Rockford, Illinois',
  '847': 'Chicago suburbs, Illinois',
  '861': 'Illinois',
  '872': 'Chicago, Illinois',
  
  // Central Time - Indiana
  '219': 'Gary, Indiana',
  
  // Eastern Time - Indiana
  '260': 'Fort Wayne, Indiana',
  '317': 'Indianapolis, Indiana',
  '463': 'Indianapolis, Indiana',
  '574': 'South Bend, Indiana',
  '765': 'Muncie, Indiana',
  '812': 'Evansville, Indiana',
  '930': 'Indiana',
  
  // Central Time - Wisconsin
  '262': 'Racine, Wisconsin',
  '274': 'Wisconsin',
  '414': 'Milwaukee, Wisconsin',
  '534': 'Wisconsin',
  '608': 'Madison, Wisconsin',
  '715': 'Eau Claire, Wisconsin',
  '920': 'Green Bay, Wisconsin',
  
  // Eastern Time - Michigan
  '231': 'Traverse City, Michigan',
  '248': 'Oakland County, Michigan',
  '269': 'Kalamazoo, Michigan',
  '313': 'Detroit, Michigan',
  '517': 'Lansing, Michigan',
  '586': 'Warren, Michigan',
  '616': 'Grand Rapids, Michigan',
  '679': 'Michigan',
  '734': 'Ann Arbor, Michigan',
  '810': 'Flint, Michigan',
  '947': 'Michigan',
  '989': 'Saginaw, Michigan',
  
  // Central Time - Michigan
  '906': 'Upper Peninsula, Michigan',
  
  // Central Time - Minnesota
  '218': 'Duluth, Minnesota',
  '320': 'St. Cloud, Minnesota',
  '507': 'Rochester, Minnesota',
  '612': 'Minneapolis, Minnesota',
  '651': 'St. Paul, Minnesota',
  '763': 'Minneapolis suburbs, Minnesota',
  '952': 'Minneapolis suburbs, Minnesota',
  
  // Central Time - Iowa
  '319': 'Cedar Rapids, Iowa',
  '515': 'Des Moines, Iowa',
  '563': 'Davenport, Iowa',
  '641': 'Mason City, Iowa',
  '712': 'Sioux City, Iowa',
  
  // Central Time - Nebraska
  '308': 'North Platte, Nebraska',
  '402': 'Omaha, Nebraska',
  '531': 'Nebraska',
  
  // Central Time - South Dakota
  '605': 'South Dakota',
  
  // Eastern Time - New York
  '212': 'Manhattan, New York',
  '315': 'Syracuse, New York',
  '332': 'New York City, New York',
  '347': 'Brooklyn, New York',
  '363': 'Long Island, New York',
  '516': 'Nassau County, New York',
  '518': 'Albany, New York',
  '585': 'Rochester, New York',
  '607': 'Binghamton, New York',
  '631': 'Suffolk County, New York',
  '646': 'Manhattan, New York',
  '680': 'New York',
  '716': 'Buffalo, New York',
  '718': 'Brooklyn, New York',
  '838': 'New York',
  '845': 'Hudson Valley, New York',
  '914': 'Westchester County, New York',
  '917': 'New York City, New York',
  '929': 'New York City, New York',
  '934': 'Long Island, New York',
  
  // Eastern Time - New Jersey
  '201': 'Jersey City, New Jersey',
  '551': 'Northern New Jersey',
  '609': 'Trenton, New Jersey',
  '640': 'New Jersey',
  '732': 'New Brunswick, New Jersey',
  '848': 'Central New Jersey',
  '856': 'Camden, New Jersey',
  '862': 'Newark, New Jersey',
  '908': 'Elizabeth, New Jersey',
  '973': 'Newark, New Jersey',
  
  // Eastern Time - Pennsylvania
  '215': 'Philadelphia, Pennsylvania',
  '223': 'Central Pennsylvania',
  '267': 'Philadelphia, Pennsylvania',
  '272': 'Northeastern Pennsylvania',
  '412': 'Pittsburgh, Pennsylvania',
  '445': 'Philadelphia, Pennsylvania',
  '484': 'Eastern Pennsylvania',
  '570': 'Scranton, Pennsylvania',
  '582': 'Pennsylvania',
  '610': 'Allentown, Pennsylvania',
  '717': 'Harrisburg, Pennsylvania',
  '724': 'Western Pennsylvania',
  '814': 'Erie, Pennsylvania',
  '835': 'Pennsylvania',
  '878': 'Pennsylvania',
  
  // Eastern Time - Florida
  '239': 'Fort Myers, Florida',
  '305': 'Miami, Florida',
  '321': 'Melbourne, Florida',
  '324': 'Florida',
  '352': 'Gainesville, Florida',
  '386': 'Daytona Beach, Florida',
  '407': 'Orlando, Florida',
  '448': 'Florida',
  '561': 'West Palm Beach, Florida',
  '645': 'Florida',
  '656': 'Florida',
  '689': 'Orlando, Florida',
  '727': 'Clearwater, Florida',
  '728': 'Florida',
  '754': 'Fort Lauderdale, Florida',
  '772': 'Port St. Lucie, Florida',
  '786': 'Miami, Florida',
  '813': 'Tampa, Florida',
  '850': 'Tallahassee, Florida',
  '863': 'Lakeland, Florida',
  '904': 'Jacksonville, Florida',
  '941': 'Sarasota, Florida',
  '954': 'Fort Lauderdale, Florida',
  
  // Eastern Time - Georgia
  '229': 'Albany, Georgia',
  '404': 'Atlanta, Georgia',
  '470': 'Atlanta, Georgia',
  '478': 'Macon, Georgia',
  '678': 'Atlanta, Georgia',
  '706': 'Augusta, Georgia',
  '762': 'Augusta, Georgia',
  '770': 'Atlanta suburbs, Georgia',
  '912': 'Savannah, Georgia',
  '943': 'Georgia',
  
  // Eastern Time - North Carolina
  '252': 'Greenville, North Carolina',
  '336': 'Greensboro, North Carolina',
  '472': 'North Carolina',
  '704': 'Charlotte, North Carolina',
  '743': 'Charlotte, North Carolina',
  '828': 'Asheville, North Carolina',
  '910': 'Fayetteville, North Carolina',
  '919': 'Raleigh, North Carolina',
  '980': 'Charlotte, North Carolina',
  '984': 'Raleigh, North Carolina',
  
  // Eastern Time - South Carolina
  '803': 'Columbia, South Carolina',
  '839': 'South Carolina',
  '843': 'Charleston, South Carolina',
  '854': 'South Carolina',
  '864': 'Greenville, South Carolina',
  
  // Eastern Time - Virginia
  '276': 'Southwest Virginia',
  '434': 'Lynchburg, Virginia',
  '540': 'Roanoke, Virginia',
  '571': 'Northern Virginia',
  '703': 'Arlington, Virginia',
  '757': 'Norfolk, Virginia',
  '804': 'Richmond, Virginia',
  
  // Eastern Time - Maryland
  '227': 'Western Maryland',
  '240': 'Montgomery County, Maryland',
  '301': 'Bethesda, Maryland',
  '410': 'Baltimore, Maryland',
  '443': 'Baltimore, Maryland',
  '667': 'Maryland',
  
  // Eastern Time - Washington D.C.
  '202': 'Washington, District of Columbia',
  '771': 'Washington, District of Columbia',
  
  // Eastern Time - Delaware
  '302': 'Delaware',
  
  // Eastern Time - Connecticut
  '203': 'Bridgeport, Connecticut',
  '475': 'Connecticut',
  '860': 'Hartford, Connecticut',
  '959': 'Connecticut',
  
  // Eastern Time - Massachusetts
  '339': 'Massachusetts',
  '351': 'Massachusetts',
  '413': 'Springfield, Massachusetts',
  '508': 'Worcester, Massachusetts',
  '617': 'Boston, Massachusetts',
  '774': 'Massachusetts',
  '781': 'Boston suburbs, Massachusetts',
  '857': 'Boston, Massachusetts',
  '978': 'Lowell, Massachusetts',
  
  // Eastern Time - Rhode Island
  '401': 'Rhode Island',
  
  // Eastern Time - Vermont
  '802': 'Vermont',
  
  // Eastern Time - New Hampshire
  '603': 'New Hampshire',
  
  // Eastern Time - Maine
  '207': 'Maine',
  
  // Eastern Time - Kentucky
  '502': 'Louisville, Kentucky',
  '606': 'Eastern Kentucky',
  '859': 'Lexington, Kentucky',
  
  // Central Time - Kentucky
  '270': 'Bowling Green, Kentucky',
  '364': 'Kentucky',
  
  // Eastern Time - Tennessee (partial)
  '423': 'Chattanooga, Tennessee',
  '865': 'Knoxville, Tennessee',
  
  // Eastern Time - West Virginia
  '304': 'West Virginia',
  '681': 'West Virginia',
  
  // Eastern Time - Ohio
  '216': 'Cleveland, Ohio',
  '220': 'Ohio',
  '234': 'Akron, Ohio',
  '283': 'Cincinnati, Ohio',
  '326': 'Ohio',
  '330': 'Akron, Ohio',
  '380': 'Ohio',
  '419': 'Toledo, Ohio',
  '440': 'Cleveland suburbs, Ohio',
  '513': 'Cincinnati, Ohio',
  '567': 'Toledo, Ohio',
  '614': 'Columbus, Ohio',
  '740': 'Zanesville, Ohio',
  '937': 'Dayton, Ohio',
  
  // Hawaii
  '808': 'Hawaii',
}

/**
 * Extract and clean phone number to get country code and area code
 */
function parsePhoneNumber(phoneNumber: string) {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Handle different formats
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    // US/Canada number: +1AAANNNNNNN
    return {
      countryCode: '1',
      areaCode: cleaned.substring(1, 4),
      fullNumber: cleaned
    }
  } else if (cleaned.length >= 10) {
    // International number - try to extract country code
    for (const countryCode of Object.keys(COUNTRY_TIMEZONES).sort((a, b) => b.length - a.length)) {
      if (cleaned.startsWith(countryCode)) {
        return {
          countryCode,
          areaCode: null,
          fullNumber: cleaned
        }
      }
    }
  }
  
  // Default to US if we can't determine
  if (cleaned.length === 10) {
    // Assume US number without country code
    return {
      countryCode: '1',
      areaCode: cleaned.substring(0, 3),
      fullNumber: '1' + cleaned
    }
  }
  
  return {
    countryCode: null,
    areaCode: null,
    fullNumber: cleaned
  }
}

/**
 * Get timezone from phone number
 */
export function getTimezoneFromPhoneNumber(phoneNumber: string): string | null {
  const parsed = parsePhoneNumber(phoneNumber)
  
  // For US/Canada numbers, check area code first
  if (parsed.countryCode === '1' && parsed.areaCode) {
    const timezone = US_AREA_CODE_TIMEZONES[parsed.areaCode]
    if (timezone) {
      return timezone
    }
  }
  
  // Fall back to country code
  if (parsed.countryCode) {
    return COUNTRY_TIMEZONES[parsed.countryCode] || null
  }
  
  return null
}

/**
 * Get display name for timezone
 */
export function getTimezoneDisplayName(timezone: string): string {
  return TIMEZONE_DISPLAY_NAMES[timezone] || timezone
}

/**
 * Get local time for a timezone
 */
export function getLocalTimeForTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return formatter.format(now)
  } catch (error) {
    console.error('Error formatting time for timezone:', timezone, error)
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

/**
 * Get formatted local time info from phone number
 */
export function getLocalTimeFromPhoneNumber(phoneNumber: string): {
  location: string
  time: string
  timezone: string
} | null {
  const timezone = getTimezoneFromPhoneNumber(phoneNumber)
  
  if (!timezone) {
    return null
  }
  
  // For US numbers, try to get detailed location first
  const parsed = parsePhoneNumber(phoneNumber)
  let location = getTimezoneDisplayName(timezone)
  
  if (parsed.countryCode === '1' && parsed.areaCode) {
    const detailedLocation = US_AREA_CODE_LOCATIONS[parsed.areaCode]
    if (detailedLocation) {
      location = detailedLocation
    }
  }
  
  const time = getLocalTimeForTimezone(timezone)
  
  return {
    location,
    time,
    timezone
  }
} 