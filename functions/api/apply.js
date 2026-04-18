export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name, phone, email, job_title, monthly_income, pathway } = body;

    if (!name || !phone || !job_title || !monthly_income || !pathway) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitize = (s) => String(s || '').slice(0, 500).replace(/[<>]/g, '');

    // Store in D1
    if (env.NGM_DB) {
      await env.NGM_DB.prepare(
        `INSERT INTO leads (name, phone, email, job_title, monthly_income, pathway)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        sanitize(name), sanitize(phone), sanitize(email),
        sanitize(job_title), sanitize(monthly_income), sanitize(pathway)
      ).run();
    }

    // Send email via Resend
    if (env.RESEND_API_KEY) {
      const notifyEmail = env.NOTIFY_EMAIL || 'shazemeen@gmail.com';
      const pathwayLabel = {
        new: 'New Application (direct to NGM)',
        rintiz: 'Converting from RintiZ',
        unsure: 'Not sure yet'
      }[pathway] || pathway;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'NGM Applications <noreply@notbadlah.com>',
          to: notifyEmail,
          subject: `New NGM Application — ${sanitize(name)}`,
          html: `
            <h2 style="font-family:sans-serif;color:#0C1B33;">New NGM Expression of Interest</h2>
            <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:8px 16px 8px 0;color:#666;">Name</td><td style="padding:8px 0;font-weight:600;">${sanitize(name)}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#666;">Phone</td><td style="padding:8px 0;font-weight:600;">${sanitize(phone)}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#666;">Email</td><td style="padding:8px 0;">${sanitize(email) || '—'}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#666;">Job Title</td><td style="padding:8px 0;">${sanitize(job_title)}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#666;">Monthly Income</td><td style="padding:8px 0;">${sanitize(monthly_income)}</td></tr>
              <tr><td style="padding:8px 16px 8px 0;color:#666;">Pathway</td><td style="padding:8px 0;color:#b8900a;font-weight:600;">${pathwayLabel}</td></tr>
            </table>
            <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px;">Submitted via nextgenmillionaire.notbadlah.com</p>
          `
        })
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('apply error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
