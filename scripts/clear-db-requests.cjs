const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearRequests() {
  console.log('🧹 Limpiando únicamente la tabla payment_requests en Supabase...');
  
  const { data, error } = await supabase
    .from('payment_requests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('❌ Error al eliminar las solicitudes:', error.message);
  } else {
    console.log('✅ Solicitudes eliminadas exitosamente de Supabase.');
  }
}

clearRequests();
