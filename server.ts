import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { generateEmailHtml } from './api/subscribe';

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON body parser
  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Subscribe & Email Dispatch Endpoint (Matches Vercel Serverless Function api/subscribe.ts)
  app.post('/api/subscribe', async (req, res) => {
    try {
      const { email, name, waitlistSpot } = req.body || {};

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      const trimmedEmail = email.trim().toLowerCase();
      const spot = waitlistSpot || Math.floor(Math.random() * 200) + 400;

      const host = req.get('host') || `localhost:${PORT}`;
      const protocol = req.protocol || 'http';
      const appBaseUrl = process.env.APP_URL || `${protocol}://${host}`;
      const cleanAppUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
      const downloadUrl = `${cleanAppUrl}/download?email=${encodeURIComponent(trimmedEmail)}`;

      console.log(`[Local Server] Processing subscription for: ${trimmedEmail} (Spot #${spot})`);

      let smtpHost = (process.env.SPACESHIP_SMTP_HOST || 'mail.spacemail.com').trim().replace(/['"]/g, '');
      if (smtpHost.includes('@') || !smtpHost.includes('.')) {
        smtpHost = 'mail.spacemail.com';
      }
      const rawPort = (process.env.SPACESHIP_SMTP_PORT || '465').trim().replace(/['"]/g, '');
      const smtpPort = parseInt(rawPort, 10) || 465;
      const isPort465 = smtpPort === 465;
      const secureEnv = (process.env.SPACESHIP_SMTP_SECURE || '').trim().toLowerCase();
      const smtpSecure = secureEnv === 'true' || (secureEnv !== 'false' && isPort465);

      const smtpUser = (process.env.SPACESHIP_SMTP_USER || '').trim().replace(/['"]/g, '');
      const smtpPass = (process.env.SPACESHIP_SMTP_PASS || '').trim().replace(/['"]/g, '');

      let emailSent = false;
      let emailStatusMessage = '';

      if (!smtpUser || !smtpPass) {
        console.warn('[Local Server] SPACESHIP_SMTP_USER or SPACESHIP_SMTP_PASS not set. Email dispatch simulated.');
        emailStatusMessage = 'Email recorded. (Spaceship SMTP credentials pending in .env)';
      } else {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });

          const fromAddress =
            process.env.SPACESHIP_FROM_EMAIL ||
            `"Interview Ready" <${smtpUser}>`;

          const info = await transporter.sendMail({
            from: fromAddress,
            to: trimmedEmail,
            subject: '📱 Your Interview Ready Mobile App Download is Ready!',
            text: `Welcome to Interview Ready!\n\nYour early access spot is #${spot}.\n\nDownload and install the mobile app here:\n${downloadUrl}`,
            html: generateEmailHtml(trimmedEmail, downloadUrl, spot),
          });

          console.log('[Local Server] Spaceship email sent:', info.messageId);
          emailSent = true;
          emailStatusMessage = 'Download email dispatched successfully via Spaceship!';
        } catch (smtpErr: any) {
          console.error('[Local Server] Spaceship SMTP error:', smtpErr);
          emailStatusMessage = `Email recorded, but Spaceship SMTP dispatch failed: ${smtpErr.message}`;
        }
      }

      return res.status(200).json({
        success: true,
        email: trimmedEmail,
        waitlistSpot: spot,
        downloadUrl,
        emailSent,
        message: emailStatusMessage,
        recordedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Local Server] /api/subscribe error:', err);
      return res.status(500).json({ error: 'Server error processing request.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
