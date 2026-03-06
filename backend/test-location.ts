import cityTimezones from 'city-timezones';
import tzlookup from 'tz-lookup';

const city = cityTimezones.lookupViaCity('Tokyo');
console.log(city);

if (city && city.length > 0) {
  const { lat, lng } = city[0];
  const timezone = tzlookup(lat, lng);
  console.log(`Timezone for ${city[0].city}:`, timezone);
}
