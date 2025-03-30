function sendConformationEmailTemplate(name, email, amount,phone) {
    return `
      <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: #007BFF; color: #ffffff; text-align: center; padding: 20px;">
              <h2 style="margin: 0;">📬 ${amount}</h2>
            </td>
          </tr>
  
          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin-bottom: 25px;">Sie haben eine neue Nachricht vom Kontaktformular Ihrer Website erhalten:</p>
  
              <table width="100%" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 120px;">👤 Name:</td>
                  <td style="padding: 8px;">${name}</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                  <td style="padding: 8px; font-weight: bold;">✉️ E-Mail:</td>
                  <td style="padding: 8px;"><a href="mailto:${email}" style="color: #007BFF;">${email}</a></td>
                </tr>
                <tr>
                <td style="padding: 8px; font-weight: bold;">📞 Telefonnummer:</td>
                <td style="padding: 8px;">${phone}</td>
              </tr>
              </table>
            </td>
          </tr>
  
          <!-- Footer -->
          <tr>
            <td style="background: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #888;">
              Extra Möbelpacker – Umzug Wien &bull; info@extra-moebelpacker.at
            </td>
          </tr>
        </table>
      </div>
    `;
  }
  
  module.exports = createEmailTemplate;
  