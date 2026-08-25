import nodemailer from 'nodemailer';

const FROM_ADDRESS = process.env.EXMAIL_FROM || 'sheng.yu@juyi-supplychain.com.cn';
const RECIPIENTS = (process.env.EXMAIL_RECIPIENTS || 'contact@juyi-chr.com, juyi0036@gmail.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function getTransporter() {
  if (!process.env.EXMAIL_AUTH_CODE || !process.env.EXMAIL_ADDRESS) {
    throw new Error('Missing EXMAIL_ADDRESS or EXMAIL_AUTH_CODE environment variables');
  }
  return nodemailer.createTransport({
    host: process.env.EXMAIL_SMTP_HOST || 'smtp.exmail.qq.com',
    port: parseInt(process.env.EXMAIL_SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: process.env.EXMAIL_ADDRESS,
      pass: process.env.EXMAIL_AUTH_CODE,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const transporter = getTransporter();

  try {
    // Newsletter subscription
    if (req.body.type === 'newsletter') {
      const { company, name, email } = req.body;
      const companyName = company || name || '';
      if (!companyName || !email) {
        return res.status(400).json({ error: 'Company and email are required' });
      }

      const html = `<div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                   <h2 style="color: #ea580c;">Newsletter Subscription</h2>
                   <p><strong>Company:</strong> ${companyName}</p>
                   <p><strong>Email:</strong> ${email}</p>
                 </div>`;
      const text = `New Newsletter Subscription\nCompany: ${companyName}\nEmail: ${email}`;

      await transporter.sendMail({
        from: `"JUYI CHR Website" <${FROM_ADDRESS}>`,
        to: RECIPIENTS,
        subject: `[JUYI CHR] Newsletter Subscription: ${companyName}`,
        text,
        html,
      });

      return res.status(200).json({ success: true });
    }

    // Contact inquiry
    const { name, email, data } = req.body;
    const company = data?.company || 'N/A';
    const phone = data?.phone || 'N/A';
    const category = data?.category || 'N/A';
    const messageText = data?.message || 'N/A';

    let html = '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">';
    html += '<h2 style="color: #ea580c; margin-bottom: 20px;">New Lead Generated</h2>';
    html += '<div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">';
    html += '<p><strong>Name:</strong> ' + (name || 'N/A') + '</p>';
    html += '<p><strong>Email:</strong> ' + (email || 'N/A') + '</p>';
    html += '</div>';
    html += '<div style="background: #f8fafc; padding: 16px; border-radius: 8px;">';
    html += '<h3 style="margin-top: 0;">Consultation Details</h3>';
    html += '<ul style="line-height: 1.8;">';
    html += '<li><strong>Company:</strong> ' + company + '</li>';
    html += '<li><strong>Phone:</strong> ' + phone + '</li>';
    html += '<li><strong>Category:</strong> ' + category + '</li>';
    html += '<li><strong>Message:</strong><br/>' + messageText.replace(/\n/g, '<br/>') + '</li>';
    html += '</ul></div></div>';

    let text = 'New Lead from Juyi Website\n\n';
    text += 'Name: ' + (name || 'N/A') + '\n';
    text += 'Email: ' + (email || 'N/A') + '\n';
    text += 'Company: ' + company + '\n';
    text += 'Phone: ' + phone + '\n';
    text += 'Category: ' + category + '\n';
    text += 'Message: ' + messageText;

    await transporter.sendMail({
      from: `"JUYI CHR Website" <${FROM_ADDRESS}>`,
      to: RECIPIENTS,
      subject: '[JUYI CHR] New Lead: ' + (name || 'Unknown'),
      text,
      html,
    });

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error.message);
    return res.status(500).json({ message: 'Error', error: error.message });
  }
}
