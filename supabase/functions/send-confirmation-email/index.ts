import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is missing from environment variables.")
    }

    // Parse the request payload
    const { contactName, contactEmail, total, items, regId } = await req.json()

    // Validate inputs
    if (!contactEmail || !contactName) {
      return new Response(
        JSON.stringify({ error: "Missing required contact details." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the items list for the email receipt
    let itemsHtml = '';
    if (items && Array.isArray(items)) {
      items.forEach(item => {
        itemsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.title} (x${item.qty})</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.qty * item.price).toFixed(2)}</td>
          </tr>
        `;
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2c3e50; text-align: center;">Registration Confirmed!</h2>
        <p>Dear ${contactName},</p>
        <p>Thank you for registering for the <strong>Sleepy Hollows Invitational Golf Tournament</strong>! We are thrilled to have you join us for a great day of golf benefiting NOVA Youth Ensembles.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #555;">Event Details</h3>
          <p><strong>Date:</strong> Thursday, October 29, 2026<br>
          <strong>Time:</strong> 9:00 AM Shotgun Start<br>
          <strong>Location:</strong> Herndon Centennial Golf Course, Herndon, VA</p>
        </div>

        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px;">Your Receipt</h3>
        <p style="font-size: 0.9em; color: #777;">Reference ID: #${regId}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f1f1;">
              <th style="padding: 10px; text-align: left;">Package</th>
              <th style="padding: 10px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr>
              <td style="padding: 10px; font-weight: bold; text-align: right;">Total Paid:</td>
              <td style="padding: 10px; font-weight: bold; text-align: right; color: #27ae60;">$${parseFloat(total).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <p>If you have any questions or need to make changes to your player roster, please contact us at info@sleepyhollows.com or call (703) 887-6509.</p>
        
        <p style="margin-top: 40px; font-size: 0.8em; color: #888; text-align: center;">
          Sleepy Hollows Studio<br>
          Herndon, Virginia
        </p>
      </div>
    `;

    // Send the email via Resend REST API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${resendApiKey}\`
      },
      body: JSON.stringify({
        from: 'Sleepy Hollows <info@sleepyhollows.com>',
        to: [contactEmail],
        subject: 'Your Registration is Confirmed: Sleepy Hollows Invitational',
        html: htmlContent
      })
    })

    const resendResponse = await res.json()

    if (!res.ok) {
      console.error("Resend API error:", resendResponse)
      throw new Error("Failed to send email via Resend.")
    }

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent." }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Edge function error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
