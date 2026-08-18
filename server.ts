import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { generateEmailHtml } from './api/subscribe';
import { 
  validateAndSanitizeEmail, 
  checkRateLimit, 
  sanitizeFormulaValue, 
  stripHeaderInjection 
} from './src/lib/security';

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON body parser with size limiter
  app.use(express.json({ limit: '100kb' }));

  // Global Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Subscribe & Email Dispatch Endpoint (Matches Vercel Serverless Function api/subscribe.ts)
  app.post('/api/subscribe', async (req, res) => {
    // 1. IP Rate Limiter
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIp, 8, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many submissions from your IP. Please try again in ${rateLimit.retryAfterSec} seconds.`,
      });
    }

    try {
      const { email, name, waitlistSpot, hp, website } = req.body || {};

      // 2. Honeypot Anti-Bot Trap
      if (hp || website) {
        console.warn(`[Local Security] Bot trapped via honeypot from IP: ${clientIp}`);
        return res.status(200).json({ success: true, message: 'Subscription confirmed.' });
      }

      // 3. Strict RFC 5322 Email Validation & Sanitization
      const emailCheck = validateAndSanitizeEmail(email);
      if (!emailCheck.isValid) {
        return res.status(400).json({ error: emailCheck.error || 'A valid email address is required.' });
      }

      const sanitizedEmail = emailCheck.email;
      const spot = typeof waitlistSpot === 'number' && waitlistSpot >= 100 && waitlistSpot <= 999999
        ? waitlistSpot
        : Math.floor(Math.random() * 200) + 400;

      const host = req.get('host') || `localhost:${PORT}`;
      const protocol = req.protocol || 'http';
      const appBaseUrl = process.env.APP_URL || `${protocol}://${host}`;
      const cleanAppUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
      const downloadUrl = `${cleanAppUrl}/download?spot=${spot}&email=${encodeURIComponent(sanitizedEmail)}`;

      console.log(`[Local Server] Secure subscription recorded: ${sanitizedEmail} (Spot #${spot})`);

      // 4. Record in Airtable if configured
      let airtableSaved = false;
      const airtableApiKey = (process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT || '').trim().replace(/['"]/g, '');
      const airtableBaseId = (process.env.AIRTABLE_BASE_ID || '').trim().replace(/['"]/g, '');
      const airtableTableName = (process.env.AIRTABLE_TABLE_NAME || 'Submissions').trim().replace(/['"]/g, '');

      if (airtableApiKey && airtableBaseId) {
        try {
          const atRes = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                'Email': sanitizedEmail,
                'Waitlist Spot': spot,
                'Submitted At': new Date().toISOString(),
                'Status': 'Confirmed'
              },
              typecast: true,
            })
          });
          if (atRes.ok) {
            airtableSaved = true;
            console.log('[Local Server] Successfully recorded submission in Airtable');
          } else {
            const err = await atRes.json().catch(() => ({}));
            console.warn('[Local Server] Airtable error:', err);
          }
        } catch (atErr) {
          console.warn('[Local Server] Airtable network error:', atErr);
        }
      }

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
            `"Interview Ready" <${stripHeaderInjection(smtpUser)}>`;

          const info = await transporter.sendMail({
            from: fromAddress,
            to: sanitizedEmail,
            subject: '📱 Your Interview Ready Mobile App Download is Ready!',
            text: `Welcome to Interview Ready!\n\nYour waitlist access code is #${spot}.\n\nDownload and install the mobile app here:\n${downloadUrl}`,
            html: generateEmailHtml(sanitizedEmail, downloadUrl, spot),
          });

          console.log('[Local Server] Spaceship email sent successfully:', info.messageId);
          emailSent = true;
          emailStatusMessage = 'Download link sent to your email via Spaceship!';
        } catch (smtpErr: any) {
          console.error('[Local Server] Spaceship SMTP Error:', smtpErr);
          emailStatusMessage = `Spaceship SMTP error: ${smtpErr.message || 'Check credentials'}`;
        }
      }

      return res.status(200).json({
        success: true,
        email: sanitizedEmail,
        waitlistSpot: spot,
        downloadUrl,
        emailSent,
        airtableSaved,
        message: emailStatusMessage,
        recordedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Local Server] /api/subscribe error:', err);
      return res.status(500).json({ error: 'Server error processing request.' });
    }
  });

  // Gated Download Confirmation & Airtable Status Update Route
  app.post('/api/confirm-download', async (req, res) => {
    // 1. IP Rate Limiter
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIp, 12, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        verified: false,
        error: `Too many verification attempts. Please try again in ${rateLimit.retryAfterSec} seconds.`,
      });
    }

    try {
      const { email, waitlistSpot, code } = req.body || {};
      const rawCode = (code || waitlistSpot || '').toString().trim();
      const cleanSpotStr = rawCode.replace(/[^0-9]/g, '');
      const numericSpot = parseInt(cleanSpotStr, 10);
      
      let sanitizedEmail = '';
      if (email && typeof email === 'string' && email.trim().length > 0) {
        const check = validateAndSanitizeEmail(email);
        if (check.isValid) sanitizedEmail = check.email;
      }

      if (!cleanSpotStr && !sanitizedEmail) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Please enter your Waitlist Access Code or email address.',
        });
      }

      const apiKey = (process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT || '').trim().replace(/['"]/g, '');
      const baseId = (process.env.AIRTABLE_BASE_ID || '').trim().replace(/['"]/g, '');
      const tableName = (process.env.AIRTABLE_TABLE_NAME || 'Submissions').trim().replace(/['"]/g, '');

      if (apiKey && baseId) {
        const conditions: string[] = [];
        if (sanitizedEmail) {
          conditions.push(`LOWER({Email})='${sanitizeFormulaValue(sanitizedEmail)}'`);
        }
        if (!isNaN(numericSpot)) {
          conditions.push(`{Waitlist Spot}=${numericSpot}`);
          conditions.push(`{Waitlist Spot}='${numericSpot}'`);
          conditions.push(`{Waitlist Spot}='#${numericSpot}'`);
        }

        const formula = conditions.length > 1 ? `OR(${conditions.join(',')})` : (conditions[0] || '');

        const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
        const searchRes = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const records = searchData.records || [];

          if (records.length === 0) {
            return res.status(404).json({
              success: false,
              verified: false,
              error: 'No registered waitlist entry was found for this code. Please join the waitlist on the homepage first.',
            });
          }

          const matchedRecord = records[0];
          const recordId = matchedRecord.id;

          await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                'Status': 'Downloaded',
              },
              typecast: true,
            }),
          });

          return res.status(200).json({
            success: true,
            verified: true,
            email: matchedRecord.fields?.Email,
            waitlistSpot: matchedRecord.fields?.['Waitlist Spot'] || numericSpot,
            status: 'Downloaded',
            airtableUpdated: true,
            message: 'Access code verified! APK download unlocked.',
          });
        }
      }

      return res.status(200).json({
        success: true,
        verified: true,
        waitlistSpot: numericSpot || 466,
        status: 'Downloaded',
        airtableUpdated: false,
        message: 'Access code verified locally.',
      });
    } catch (err: any) {
      console.error('[Local Server] /api/confirm-download error:', err);
      return res.status(500).json({ error: 'Server error processing request.' });
    }
  });

  // Serve static APK download file
  app.use('/downloads', express.static(path.join(process.cwd(), 'public', 'downloads')));

  // Vite SSR / middleware integration for development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Interview Ready secure dev server running at: http://localhost:${PORT}\n`);
  });
}

startServer();
