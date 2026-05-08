import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
}

const sedans = [
  '4691',
  '0511',
  '7803',
  '8033',
  '7304',
  '5941',
  '8593',
  '4826',
  '9767',
  '0285',
  '6421',
  '9393',
  '9797',
  '5489',
  '5298',
  '6829',
  '9308',
  '9361',
  '6118',
  '0444',
  '0382',
  '6878',
  '3625',
  '4570',
  '6301',
  '0324',
  '9509',
  '5156',
  '2205',
  '3154',
  '0557',
  '5365',
  '3181',
  '1368',
  '0812',
  '9280',
  '7752',
];

const suvs = [
  '6313',
  '6730',
  '1054',
  '0527',
  '6349',
  '6241',
  '3121',
  '5169',
  '1811',
  '0948',
  '7388',
  '6034',
  '3258',
  '4811',
  '9751',
  '3999',
  '8785',
  '9781',
  '2621',
  '6331',
  '6076',
  '5611',
  '4627',
  '5877',
  '1437',
  '5072',
  '7094',
  '4259',
  '8572',
  '3479',
  '2859',
  '8306',
  '1590',
  '0204',
  '6605',
  '7993',
  '9925',
  '1393',
  '3186',
  '8418',
  '8329',
  '7885',
  '2064',
  '5502',
  '6636',
  '4620',
  '9566',
  '5988',
  '7875',
  '8677',
  '3693',
  '2469',
];

const vehicles = [
  ...sedans.map((plate_number) => ({
    plate_number,
    car_model: '세단',
    memo: '기계식 주차장 뒷자리 등록',
  })),
  ...suvs.map((plate_number) => ({
    plate_number,
    car_model: 'SUV',
    memo: '기계식 주차장 뒷자리 등록',
  })),
];

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('vehicles')
  .upsert(vehicles, {
    onConflict: 'normalized_plate_number',
    ignoreDuplicates: false,
  })
  .select('id');

if (error) {
  throw error;
}

console.log(`Seeded ${data.length} mechanical parking vehicles.`);
