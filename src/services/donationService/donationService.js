const sbAdmin = require("../../config/db/db");

async function saveDonationToDB({ name, email, profession, address, addressHomeTown, amount, phone }) {
  try {
    const { data, error } = await sbAdmin
      .from("musji_sepende_detail")
      .insert([
        {
          name,
          email,
          profession,
          address,
          address_home_town: addressHomeTown,
          amount,
          phone
        }
      ])
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return { success: false, error };
    }

    console.log("✅ Donation stored:", data);
    return { success: true, data };
  } catch (err) {
    console.error("❌ Exception:", err);
    return { success: false, error: err };
  }
}

module.exports = { saveDonationToDB };
