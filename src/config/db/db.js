const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const sbAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "donation-server/1.0" } }
  }
);

module.exports = sbAdmin;
