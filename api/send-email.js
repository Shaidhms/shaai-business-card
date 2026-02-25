const { Resend } = require('resend');
const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Defensive body parsing
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    if (!body) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    const { name, phone, email, role, photo, framedPhoto, date, event, venue } = body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    console.log('Processing connection for:', name);

    // Upload raw photo to Vercel Blob for inline email display
    let photoUrl = null;
    if (photo && typeof photo === 'string' && photo.startsWith('data:image')) {
      try {
        const base64Data = photo.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`selfies/${name.replace(/\s+/g, '-')}-${Date.now()}.jpg`, buffer, {
          access: 'public',
          contentType: 'image/jpeg',
        });
        photoUrl = blob.url;
        console.log('Photo uploaded to blob:', photoUrl);
      } catch (e) {
        console.warn('Blob upload failed:', e.message);
      }
    }

    // Framed photo (with GFF banner) as downloadable attachment
    let attachments = [];
    if (framedPhoto && typeof framedPhoto === 'string' && framedPhoto.startsWith('data:image')) {
      try {
        const base64Data = framedPhoto.split(',')[1];
        attachments.push({
          filename: `${name.replace(/\s+/g, '-')}-GFF2026.jpg`,
          content: Buffer.from(base64Data, 'base64'),
        });
        console.log('Framed photo attachment added');
      } catch (e) {
        console.warn('Framed photo failed:', e.message);
      }
    }

    // ===== EMAIL 1: Notification to Shaid =====
    const photoHtml = photoUrl ? `
  <div style="padding: 4px 14px 12px; text-align: center;">
    <img src="${photoUrl}" alt="Selfie with ${name}" style="width: 100%; max-width: 420px; border-radius: 16px; display: block; margin: 0 auto;" />
  </div>` : '';

    const notifyHtml = `
<div style="font-family: -apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; max-width: 460px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e8e8e8;">
  <div style="text-align: center; padding: 24px 40px 8px;">
    <img src="https://shaai-business-card.vercel.app/gff-logo.png" alt="Global Freelancers Festival 2026" style="width: 280px; height: auto; display: inline-block;" />
  </div>
  <div style="text-align: center; padding: 0 20px 12px;">
    <div style="font-size: 10px; letter-spacing: 3px; color: rgba(0,0,0,0.35); text-transform: uppercase;">Summit &bull; Expo &bull; Workshops &bull; Awards</div>
  </div>
  <div style="padding: 16px 20px 0; text-align: center;">
    <span style="display: inline-block; background: linear-gradient(135deg, #FF6B35, #F7931E); border-radius: 9999px; padding: 6px 18px; font-size: 11px; color: #fff; font-weight: 700; letter-spacing: 1px;">NEW CONNECTION</span>
  </div>
  <div style="padding: 16px 24px 4px; text-align: center;">
    <div style="font-size: 30px; font-weight: 800; color: #1a1a1a; line-height: 1.1; letter-spacing: -0.5px;">${name}</div>
    <div style="margin-top: 6px; font-size: 15px; color: #FF6B35; font-weight: 600;">${role || 'Not provided'}</div>
    <div style="margin-top: 4px; font-size: 13px; color: rgba(0,0,0,0.35); font-weight: 500;">${date}</div>
  </div>
  <div style="margin: 14px 20px; height: 1px; background: #eee;"></div>
  ${photoHtml}
  <div style="padding: 0 14px 8px;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;"><tr><td style="background: #f5f5f7; border-radius: 16px; padding: 18px 22px;"><table style="width: 100%; border-collapse: collapse;"><tr><td style="vertical-align: middle;"><div style="font-size: 11px; color: rgba(0,0,0,0.4); font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Phone</div><div style="font-size: 17px; color: #1a1a1a; font-weight: 600; margin-top: 4px;">${phone || 'Not provided'}</div></td><td style="width: 44px; vertical-align: middle; text-align: right;"><div style="width: 40px; height: 40px; background: linear-gradient(135deg, #00D084, #00B37D); border-radius: 12px; text-align: center; line-height: 40px; font-size: 18px; color: #fff;">&#9742;</div></td></tr></table></td></tr></table>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;"><tr><td style="background: #f5f5f7; border-radius: 16px; padding: 18px 22px;"><table style="width: 100%; border-collapse: collapse;"><tr><td style="vertical-align: middle;"><div style="font-size: 11px; color: rgba(0,0,0,0.4); font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Email</div><div style="font-size: 17px; color: #1a1a1a; font-weight: 600; margin-top: 4px;">${email || 'Not provided'}</div></td><td style="width: 44px; vertical-align: middle; text-align: right;"><div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0693E3, #0573B5); border-radius: 12px; text-align: center; line-height: 40px; font-size: 16px; color: #fff;">&#9993;</div></td></tr></table></td></tr></table>
  </div>
  <div style="padding: 8px 14px 8px;">
    <table style="width: 100%; border-collapse: collapse;"><tr><td style="background: #f5f5f7; border-radius: 16px; padding: 22px;"><table style="width: 100%; border-collapse: collapse;"><tr><td style="vertical-align: top; padding-right: 16px;"><div style="font-size: 9px; letter-spacing: 3px; color: rgba(0,0,0,0.3); text-transform: uppercase; font-weight: 700;">Connected at</div><div style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 6px; line-height: 1.3;">${event}</div><div style="font-size: 12px; color: rgba(0,0,0,0.45); margin-top: 6px; line-height: 1.5;">${venue}</div></td><td style="width: 80px; vertical-align: top; text-align: center;"><div style="background: linear-gradient(135deg, #FF6B35, #E8541E); border-radius: 14px; padding: 12px 8px; text-align: center;"><div style="font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">FEB</div><div style="font-size: 28px; font-weight: 800; color: #ffffff; line-height: 1; margin-top: 2px;">28</div><div style="font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 600; margin-top: 2px;">2026</div></div></td></tr></table><div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.06);"><span style="display: inline-block; background: rgba(255,107,53,0.1); border-radius: 8px; padding: 5px 12px; font-size: 10px; color: #FF6B35; font-weight: 600; margin-right: 4px;">Summit</span><span style="display: inline-block; background: rgba(6,147,227,0.1); border-radius: 8px; padding: 5px 12px; font-size: 10px; color: #0693E3; font-weight: 600; margin-right: 4px;">Expo</span><span style="display: inline-block; background: rgba(155,81,224,0.1); border-radius: 8px; padding: 5px 12px; font-size: 10px; color: #9B51E0; font-weight: 600; margin-right: 4px;">Workshops</span><span style="display: inline-block; background: rgba(0,208,132,0.1); border-radius: 8px; padding: 5px 12px; font-size: 10px; color: #00D084; font-weight: 600;">Awards</span></div></td></tr></table>
  </div>
  <div style="padding: 16px 24px 22px; text-align: center; border-top: 1px solid #eee; margin: 8px 14px 0;">
    <div style="font-size: 14px; font-weight: 700; color: #1a1a1a;">Muhibbuddin Shaid Hakkeem</div>
    <div style="margin-top: 6px; font-size: 11px; color: rgba(0,0,0,0.45); line-height: 1.5;">Freelancing, Web Development &amp; Digital Solutions</div>
    <div style="font-size: 11px; color: #FF6B35; font-weight: 600;">Turning Ideas Into Reality</div>
    <div style="margin-top: 10px;"><a href="https://www.shaid360.com" style="font-size: 12px; color: #0693E3; text-decoration: none; font-weight: 600;">www.shaid360.com</a><span style="color: rgba(0,0,0,0.15); margin: 0 8px;">&bull;</span><a href="tel:+916380257066" style="font-size: 12px; color: #0693E3; text-decoration: none; font-weight: 600;">+91 63802 57066</a></div>
  </div>
</div>`;

    // ===== EMAIL 2: Thank-you to the connection =====
    const firstName = name.split(' ')[0];
    const baseUrl = 'https://shaai-business-card.vercel.app';

    const thankYouPhotoHtml = photoUrl ? `
  <div style="padding: 24px 32px 0;">
    <img src="${photoUrl}" alt="Our photo together" style="width: 100%; border-radius: 12px; display: block;" />
    <div style="font-size: 12px; color: #999; margin-top: 10px;">IIT Madras Research Park &bull; Feb 28, 2026</div>
  </div>` : '';

    const thankYouHtml = `
<div style="font-family: -apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">

  <!-- GFF Logo -->
  <div style="padding: 28px 32px 0; text-align: center;">
    <img src="${baseUrl}/gff-logo.png" alt="GFF 2026" style="width: 180px; height: auto; display: inline-block;" />
  </div>

  <!-- Personal greeting -->
  <div style="padding: 24px 32px 0;">
    <div style="font-size: 26px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">Hey ${firstName}! &#x1F44B;</div>
    <div style="font-size: 15px; color: #555; margin-top: 14px; line-height: 1.75;">
      It was really great meeting you at <strong>GFF 2026</strong>! Loved our conversation. Here's a little keepsake from our meetup.
    </div>
  </div>

  <!-- Photo -->
  ${thankYouPhotoHtml}

  <!-- Divider -->
  <div style="margin: 28px 32px; border-top: 1px solid #eee;"></div>

  <!-- Personal intro -->
  <div style="padding: 0 32px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 52px; vertical-align: top;">
          <img src="${baseUrl}/photo.jpg" alt="Shaid" style="width: 52px; height: 52px; border-radius: 50%; display: block;" />
        </td>
        <td style="padding-left: 14px; vertical-align: top;">
          <div style="font-size: 16px; font-weight: 700; color: #1a1a1a;">Muhibbuddin Shaid Hakkeem</div>
          <div style="font-size: 13px; color: #777; margin-top: 4px; line-height: 1.55;">Freelancer &bull; Gen AI Architect &bull; Web Developer</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Conversational CTA -->
  <div style="padding: 24px 32px 0;">
    <div style="font-size: 15px; color: #555; line-height: 1.75;">
      If you ever have an idea you'd like to bring to life, whether it's a website, an AI-powered tool, or anything digital, I'd love to help. Just reply to this email or reach out anytime:
    </div>
  </div>

  <!-- Simple text links -->
  <div style="padding: 20px 32px 0;">
    <div style="font-size: 14px; line-height: 2.2; color: #333;">
      &#9993;&ensp;<a href="mailto:mail2shaid@gmail.com" style="color: #0D9488; text-decoration: none; font-weight: 600;">mail2shaid@gmail.com</a><br/>
      &#9742;&ensp;<a href="tel:+916380257066" style="color: #0D9488; text-decoration: none; font-weight: 600;">+91 63802 57066</a><br/>
      &#127760;&ensp;<a href="https://www.shaid360.com" style="color: #0D9488; text-decoration: none; font-weight: 600;">shaid360.com</a><br/>
      &#128101;&ensp;<a href="https://www.linkedin.com/in/muhibbuddin-shaid-hakkeem-26a06921/" style="color: #0D9488; text-decoration: none; font-weight: 600;">LinkedIn Profile</a>
    </div>
  </div>

  <!-- Sign-off -->
  <div style="padding: 28px 32px 36px;">
    <div style="font-size: 15px; color: #555; line-height: 1.6;">
      Looking forward to staying in touch!<br/>
      <strong style="color: #1a1a1a;">Shaid</strong>
      <div style="font-size: 12px; color: #999; margin-top: 6px; line-height: 1.5;">Freelancing, Web Development &amp; Digital Solutions<br/>Turning Ideas Into Reality</div>
    </div>
  </div>

</div>`;

    const validEmail = email && email !== 'Not provided' && email.includes('@');
    console.log('Sending emails for:', name, '| Connection email:', email, '| Valid:', validEmail);

    // Send both emails in parallel for speed
    const emailPromises = [
      resend.emails.send({
        from: 'Shaid | Freelancer | GFF 2026 <connect@shaid360.com>',
        to: 'mail2shaid@gmail.com',
        subject: `New Connection: ${name} - GFF 2026`,
        html: notifyHtml,
        attachments,
      }),
    ];

    if (validEmail) {
      emailPromises.push(
        resend.emails.send({
          from: 'Shaid | Freelancer | GFF 2026 <connect@shaid360.com>',
          replyTo: 'connect@shaid360.com',
          to: email,
          subject: `Great meeting you, ${firstName}! - GFF 2026`,
          html: thankYouHtml,
          attachments,
        })
      );
    }

    const results = await Promise.allSettled(emailPromises);

    // Log results
    const notifyResult = results[0];
    if (notifyResult.status === 'fulfilled' && !notifyResult.value.error) {
      console.log('Notify email sent:', notifyResult.value.data.id);
    } else {
      const err = notifyResult.status === 'rejected' ? notifyResult.reason?.message : JSON.stringify(notifyResult.value?.error);
      console.error('Notify email error:', err);
    }

    let thankYouId = null;
    let thankYouError = null;
    if (results[1]) {
      const thankResult = results[1];
      if (thankResult.status === 'fulfilled' && !thankResult.value.error) {
        thankYouId = thankResult.value.data.id;
        console.log('Thank-you email sent:', thankYouId);
      } else {
        thankYouError = thankResult.status === 'rejected'
          ? { message: thankResult.reason?.message || 'Promise rejected' }
          : thankResult.value?.error;
        console.error('Thank-you email error:', JSON.stringify(thankYouError));
      }
    } else {
      console.log('Skipping thank-you email - no valid email provided');
    }

    return res.status(200).json({
      success: true,
      notifyId: notifyResult.value?.data?.id || null,
      thankYouId,
      thankYouError,
      emailUsed: validEmail ? email : null,
    });
  } catch (err) {
    console.error('Server error:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
