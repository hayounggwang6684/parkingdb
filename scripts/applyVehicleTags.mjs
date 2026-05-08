import { createClient } from '@supabase/supabase-js';
import { getVehicleTags } from '../src/vehicleTags.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: vehicles, error: fetchError } = await supabase
  .from('vehicles')
  .select('id, car_model');

if (fetchError) {
  throw fetchError;
}

for (const vehicle of vehicles) {
  const tags = getVehicleTags(vehicle.car_model);
  const { error } = await supabase
    .from('vehicles')
    .update({
      vehicle_type: tags.vehicleType,
      mechanical_parking: tags.mechanicalParking,
      mechanical_note: tags.mechanicalNote,
    })
    .eq('id', vehicle.id);

  if (error) {
    throw error;
  }
}

console.log(`Tagged ${vehicles.length} vehicles.`);
