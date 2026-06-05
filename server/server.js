require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { users, entity } = require('./db');
const emailService = require('./emailService');
const smsService   = require('./smsService');
const automations  = require('./automations');

// ─── PesaPal Config Helpers ───────────────────────────────────────────────────
const PESAPAL_CONFIG_FILE = path.join(__dirname, 'pesapal-config.json');

function loadPesapalConfig() {
  try {
    if (fs.existsSync(PESAPAL_CONFIG_FILE))
      return JSON.parse(fs.readFileSync(PESAPAL_CONFIG_FILE, 'utf8'));
  } catch {}
  return null;
}

function savePesapalConfig(data) {
  fs.writeFileSync(PESAPAL_CONFIG_FILE, JSON.stringify(data, null, 2));
}

// Generic HTTPS JSON request helper
function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Get a fresh PesaPal OAuth token
async function getPesapalToken(cfg) {
  const base = cfg.environment === 'production'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';
  const resp = await httpsPost(`${base}/api/Auth/RequestToken`, {
    consumer_key: cfg.consumer_key,
    consumer_secret: cfg.consumer_secret,
  });
  if (resp.status !== 200 || !resp.body?.token)
    throw new Error(`PesaPal token error: ${JSON.stringify(resp.body)}`);
  return { token: resp.body.token, base };
}

// Register IPN if not already done (required once per environment)
async function ensurePesapalIpn(cfg, token, base, callbackUrl) {
  if (cfg.ipn_id) return cfg.ipn_id;
  const resp = await httpsPost(`${base}/api/URLSetup/RegisterIPN`, {
    url: callbackUrl,
    ipn_notification_type: 'GET',
  }, { Authorization: `Bearer ${token}` });
  const ipnId = resp.body?.ipn_id || resp.body?.id;
  if (ipnId) {
    cfg.ipn_id = ipnId;
    savePesapalConfig(cfg);
  }
  return ipnId;
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3001;

// JWT secret — always load from env in production
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] FATAL: JWT_SECRET env variable not set in production!');
    process.exit(1);
  }
  console.warn('[SECURITY] JWT_SECRET not set — using dev default. Set JWT_SECRET env var before deploying.');
  return 'reservation-safari-jwt-secret-2024';
})();

// OTA webhook secret — set in env for production
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'safari-ota-webhook-secret';

// Simple in-memory rate limiter for auth endpoints (no extra dependencies)
const _authAttempts = new Map();
const authRateLimit = (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutes
  const max = 20;
  let entry = _authAttempts.get(key);
  if (!entry || now > entry.resetAt) entry = { count: 0, resetAt: now + window };
  entry.count++;
  _authAttempts.set(key, entry);
  if (entry.count > max) {
    return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes and try again.' });
  }
  next();
};
// Clean up stale entries every hour
setInterval(() => {
  const now = Date.now();
  _authAttempts.forEach((v, k) => { if (now > v.resetAt) _authAttempts.delete(k); });
}, 60 * 60 * 1000);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://reservation-safari-frontend.onrender.com'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Admin Middleware ─────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

function enforceAgentSource(name, data, user, existing = {}) {
  if (!user || user.role !== 'agent') return data;
  const owner = user.full_name || user.email || 'Agent';
  const patched = { ...data };

  if (name === 'Booking') {
    patched.booking_source = 'agent';
    patched.agent_name = patched.agent_name || existing.agent_name || owner;
  }
  if (name === 'Client') {
    patched.client_source = 'agent';
    patched.agent_name = patched.agent_name || existing.agent_name || owner;
  }

  return patched;
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', authRateLimit, (req, res) => {
  const { email, password, full_name = '', role = 'admin' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const emailLower = email.toLowerCase().trim();
  if (users.findByEmail(emailLower)) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const user = users.create({ id, email: emailLower, password: hash, full_name, role, created_date: now });

  const token = jwt.sign({ id, email: emailLower, role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, email: emailLower, full_name, role } });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = users.findByEmail(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.put('/api/auth/me', auth, (req, res) => {
  const { full_name, role } = req.body;
  const patch = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (role !== undefined && req.user.role === 'admin') patch.role = role;
  const updated = users.update(req.user.id, patch);
  const { password, ...safeUser } = updated;
  res.json(safeUser);
});

// ─── File Upload ─────────────────────────────────────────────────────────────
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const file_url = `/uploads/${req.file.filename}`;
  res.json({ file_url, filename: req.file.filename });
});

// ─── Entity Routes ────────────────────────────────────────────────────────────
app.get('/api/entities/:name', auth, (req, res) => {
  const { sort = '-created_date', limit = '500' } = req.query;
  res.json(entity.list(req.params.name, sort, parseInt(limit)));
});

app.get('/api/entities/:name/:id', auth, (req, res) => {
  const record = entity.findById(req.params.name, req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

app.post('/api/entities/:name/filter', auth, (req, res) => {
  const { criteria = {}, sort = '-created_date', limit = 500 } = req.body;
  res.json(entity.filter(req.params.name, criteria, sort, parseInt(limit)));
});

app.post('/api/entities/:name', auth, (req, res) => {
  const { id: _id, created_date, updated_date, created_by, ...data } = req.body;
  const now = new Date().toISOString();
  const payload = enforceAgentSource(req.params.name, data, req.user);
  const record = entity.create(req.params.name, {
    ...payload,
    id: uuidv4(),
    created_date: now,
    updated_date: now,
    created_by: req.user.email,
  });
  res.json(record);
  // Fire automation triggers asynchronously (never blocks response)
  automations.dispatchCreate(req.params.name, record);
});

app.put('/api/entities/:name/:id', auth, (req, res) => {
  const { id: _id, created_date, updated_date, created_by, ...data } = req.body;
  const now = new Date().toISOString();
  const existing = entity.findById(req.params.name, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const payload = enforceAgentSource(req.params.name, data, req.user, existing);
  const updated = entity.update(req.params.name, req.params.id, { ...payload, updated_date: now });
  res.json(updated);
  // Fire automation triggers asynchronously
  automations.dispatchUpdate(req.params.name, updated, existing);
});

app.delete('/api/entities/:name/:id', auth, (req, res) => {
  entity.delete(req.params.name, req.params.id);
  res.json({ success: true });
});

// ─── User Management ──────────────────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, (req, res) => {
  res.json(users.all().map(({ password, ...u }) => u));
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { email, password, full_name = '', role = 'user' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const emailLower = email.toLowerCase().trim();
  if (users.findByEmail(emailLower)) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const user = users.create({ id, email: emailLower, password: hash, full_name, role, created_date: now });

  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post('/api/users/invite', auth, adminOnly, async (req, res) => {
  const { email, role = 'user', full_name = '' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const emailLower = email.toLowerCase();
  if (users.findByEmail(emailLower)) return res.status(400).json({ error: 'Email already registered' });
  const id = uuidv4();
  const now = new Date().toISOString();
  const temp_password = 'ChangeMe123!';
  users.create({ id, email: emailLower, password: bcrypt.hashSync(temp_password, 10), full_name, role, created_date: now });

  // Try to send invite email (non-blocking — don't fail the invite if email fails)
  try {
    await emailService.sendEmail({
      to: emailLower,
      subject: 'You have been invited to Safari Reservations',
      html: emailService.inviteEmailHtml({ email: emailLower, full_name, role, temp_password }),
    });
  } catch (emailErr) {
    console.warn('[Invite] Email send failed (not fatal):', emailErr.message);
  }

  res.json({ success: true, id, email: emailLower, role, temp_password });
});

app.put('/api/users/:id', auth, adminOnly, (req, res) => {
  const { full_name, role } = req.body;
  const updated = users.update(req.params.id, { full_name, role });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  const { password, ...safeUser } = updated;
  res.json(safeUser);
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  users.delete(req.params.id);
  res.json({ success: true });
});

// ─── Agent Conversation Routes ────────────────────────────────────────────────

// Simple in-memory store for conversations (in production, use a database)
const conversations = {};

// GET /api/agents/conversations  →  List all conversations for the authenticated user
app.get('/api/agents/conversations', auth, (req, res) => {
  const { agent_name } = req.query;
  const userConversations = Object.values(conversations)
    .filter(c => !agent_name || c.agent_name === agent_name)
    .filter(c => c.user_id === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(userConversations);
});

// POST /api/agents/conversations  →  Create a new conversation
app.post('/api/agents/conversations', auth, (req, res) => {
  const { agent_name, metadata } = req.body;
  if (!agent_name) {
    return res.status(400).json({ error: 'agent_name is required' });
  }
  
  const conversationId = uuidv4();
  const now = new Date().toISOString();
  
  conversations[conversationId] = {
    id: conversationId,
    agent_name: agent_name,
    user_id: req.user.id,
    user_email: req.user.email,
    metadata: metadata || {},
    messages: [],
    created_at: now,
    updated_at: now,
  };
  
  res.status(201).json(conversations[conversationId]);
});

// GET /api/agents/conversations/:id  →  Get a single conversation
app.get('/api/agents/conversations/:id', auth, (req, res) => {
  const convo = conversations[req.params.id];
  
  if (!convo) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  if (convo.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(convo);
});

// POST /api/agents/conversations/:id/messages  →  Add a message to a conversation
app.post('/api/agents/conversations/:id/messages', auth, (req, res) => {
  const convo = conversations[req.params.id];
  
  if (!convo) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  if (convo.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { role, content } = req.body;
  if (!role || !content) {
    return res.status(400).json({ error: 'role and content are required' });
  }
  
  const now = new Date().toISOString();
  
  // Add user message
  convo.messages.push({
    role: role,
    content: content,
    timestamp: now,
  });
  
  // Simulate AI response (in production, integrate with actual LLM)
  const aiResponse = generateAIResponse(content, convo.agent_name);
  convo.messages.push({
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString(),
  });
  
  convo.updated_at = new Date().toISOString();
  
  res.status(201).json(convo);
});

function formatPackage(pkg) {
  const price = pkg.price_per_person ? `$${Number(pkg.price_per_person).toLocaleString()}` : 'Price N/A';
  const duration = pkg.duration_days ? `${pkg.duration_days} days` : 'Duration N/A';
  const destination = pkg.destination || pkg.name || 'Destination N/A';
  const includes = Array.isArray(pkg.includes) ? pkg.includes.join(', ') : pkg.includes || 'No inclusions listed';
  const description = pkg.description ? `${pkg.description}` : '';
  return `${pkg.name} - ${price} per person for ${duration} - ${destination}.${description ? ` ${description}` : ''} Includes: ${includes}.`;
}

function findPackages(query) {
  const packages = entity.list('Package').filter((pkg) => pkg.status === 'active');
  const lowerQuery = query.toLowerCase();
  return packages.filter((pkg) => {
    const haystack = `${pkg.name} ${pkg.destination} ${pkg.category || ''} ${pkg.description || ''} ${pkg.includes || ''}`.toLowerCase();
    return haystack.includes(lowerQuery);
  });
}

function filterPackagesByDestination(destination) {
  const packages = entity.list('Package').filter((pkg) => pkg.status === 'active');
  const lowerDest = destination.toLowerCase();
  return packages.filter((pkg) => pkg.destination.toLowerCase().includes(lowerDest));
}

function filterPackagesByPriceRange(minPrice, maxPrice) {
  const packages = entity.list('Package').filter((pkg) => pkg.status === 'active');
  return packages.filter((pkg) => {
    const price = Number(pkg.price_per_person || 0);
    return price >= minPrice && price <= maxPrice;
  });
}

function filterPackagesByDuration(minDays, maxDays) {
  const packages = entity.list('Package').filter((pkg) => pkg.status === 'active');
  return packages.filter((pkg) => {
    const duration = Number(pkg.duration_days || 0);
    return duration >= minDays && duration <= maxDays;
  });
}

function findClientByName(query) {
  const users = entity.list('Client');
  const lowerQuery = query.toLowerCase();
  return users.find((client) => client.full_name.toLowerCase().includes(lowerQuery));
}

function parseGuestCount(input) {
  const match = input.match(/(\d+)\s*(?:people|guests|persons|person|adults|travelers|travellers|pax)/i);
  return match ? Number(match[1]) : null;
}

function parseDates(input) {
  // First try to match "from X to Y" patterns
  const fromToPattern = /from\s+(\w+\s+\d+)(?:\s*,\s*\d{4})?\s+to\s+(\d+)(?:\s*,\s*\d{4})?/i;
  const fromToMatch = input.match(fromToPattern);
  if (fromToMatch) {
    const startDate = parseDateString(fromToMatch[1] + (fromToMatch[2] ? `, ${fromToMatch[2]}` : ''));
    const endDay = fromToMatch[3];
    // Assume end date is in the same month/year as start date
    const startParts = fromToMatch[1].split(/\s+/);
    const endDate = parseDateString(`${startParts[0]} ${endDay}${fromToMatch[4] ? `, ${fromToMatch[4]}` : ''}`);
    if (startDate && endDate) {
      return [startDate, endDate];
    }
  }
  
  // Fallback to original date parsing
  const datePattern = /(\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\s+(\d{1,2})(?:[,-]?\s*(\d{4}))?/gi;
  const dates = [];
  let match;
  while ((match = datePattern.exec(input))) {
    const month = match[1];
    const day = Number(match[2]);
    const year = Number(match[3] || new Date().getFullYear());
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    const parsed = new Date(Date.UTC(year, monthIndex, day));
    if (!Number.isNaN(parsed.getTime())) {
      dates.push(parsed.toISOString().split('T')[0]);
    }
  }
  return dates.length >= 2 ? dates.slice(0, 2) : dates;
}

function parseDateString(dateStr) {
  const datePattern = /(\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\s+(\d{1,2})(?:[,-]?\s*(\d{4}))?/i;
  const match = dateStr.match(datePattern);
  if (match) {
    const month = match[1];
    const day = Number(match[2]);
    const year = Number(match[3] || new Date().getFullYear());
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    const parsed = new Date(Date.UTC(year, monthIndex, day));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  return null;
}

function getClientDetailsByName(query) {
  const allClients = entity.list('Client');
  const lower = query.toLowerCase();
  return allClients.find((client) => client.full_name.toLowerCase().includes(lower));
}

function generateBookingResponse(content) {
  const lower = content.toLowerCase();
  const packages = entity.list('Package').filter((pkg) => pkg.status === 'active');
  const clients = entity.list('Client');
  
  // Try to extract package from query
  let packageMatch = packages.find((pkg) => lower.includes(pkg.name.toLowerCase()));
  if (!packageMatch) {
    // Try destination match - check if query contains destination words
    packageMatch = packages.find((pkg) => {
      const destWords = pkg.destination.toLowerCase().split(/[, ]+/).filter(w => w.length > 2);
      return destWords.some(word => lower.includes(word));
    });
  }
  
  // Try to extract client from query
  const clientMatch = clients.find((client) => lower.includes(client.full_name.toLowerCase()));
  
  // Parse guest count and dates
  const guests = parseGuestCount(content) || 2;
  const dates = parseDates(content);
  
  // All details present: create booking
  if (packageMatch && clientMatch && dates.length === 2) {
    const packagePrice = Number(packageMatch.price_per_person || 0);
    const total = packagePrice * guests;
    const booking = entity.create('Booking', {
      id: uuidv4(),
      booking_ref: `RS-${Math.floor(Math.random() * 900000 + 100000)}`,
      client_id: clientMatch.id,
      client_name: clientMatch.full_name,
      client_email: clientMatch.email,
      package_id: packageMatch.id,
      package_name: packageMatch.name,
      status: 'confirmed',
      total_amount: total,
      amount_paid: 0,
      start_date: dates[0],
      end_date: dates[1],
      guests,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      created_by: 'booking-assistant',
    });
    return `✅ **Booking confirmed!**\n\n**Guest:** ${clientMatch.full_name}\n**Package:** ${packageMatch.name}\n**Duration:** ${packageMatch.duration_days} days\n**Location:** ${packageMatch.destination}\n**Dates:** ${dates[0]} to ${dates[1]}\n**Guests:** ${guests}\n**Price:** $${packagePrice.toLocaleString()} per person\n**Total:** $${total.toLocaleString()}\n**Booking Ref:** ${booking.booking_ref}\n\n**Includes:** ${packageMatch.includes}`;
  }
  
  // Have package and client but need dates
  if (packageMatch && clientMatch && dates.length === 0) {
    return `Great! I found the **${packageMatch.name}** package for **${clientMatch.full_name}**. \n\nWhen would you like to travel? Please provide the dates (e.g., "March 10 to March 14").`;
  }
  
  // Have package and dates but need client name
  if (packageMatch && !clientMatch && dates.length === 2) {
    return `Perfect! I found **${packageMatch.name}** available for ${dates[0]} to ${dates[1]}. \n\nWhat is the guest's name so I can complete the booking?`;
  }
  
  // Have package and guests but need dates and client
  if (packageMatch && dates.length === 0) {
    return `I can book the **${packageMatch.name}** ($${packageMatch.price_per_person}/person, ${packageMatch.duration_days} days in ${packageMatch.destination}).\n\nTo complete the booking, I'll need:\n1. Guest name\n2. Travel dates (e.g., "March 10 to 14")\n3. Number of guests`;
  }
  
  // Have client but need package and dates
  if (clientMatch && !packageMatch && dates.length === 0) {
    const topPackages = entity.list('Package').filter((pkg) => pkg.status === 'active').slice(0, 3);
    const packageList = topPackages.map((pkg) => `• **${pkg.name}** - $${pkg.price_per_person}/person (${pkg.destination})`).join('\n');
    return `Great! I found **${clientMatch.full_name}** in the system.\n\nWhich package interests you?\n\n${packageList}\n\nAlso, when would you like to travel?`;
  }
  
  return null;
}

function extractDestination(input) {
  const destinations = ['uganda', 'tanzania', 'kenya', 'zambia', 'zimbabwe', 'malawi', 'south africa', 'namibia', 'botswana', 'rwanda', 'congo'];
  const lower = input.toLowerCase();
  return destinations.find((dest) => lower.includes(dest));
}

function extractPriceRange(input) {
  const patterns = [
    { re: /(?:under|below)\s*\$?(\d+)/i, handler: (m) => ({ min: 0, max: Number(m[1]) }) },
    { re: /(?:over|above|more than)\s*\$?(\d+)/i, handler: (m) => ({ min: Number(m[1]), max: 50000 }) },
    { re: /\$(\d+)\s*(?:to|-|–)\s*\$(\d+)/, handler: (m) => ({ min: Number(m[1]), max: Number(m[2]) }) },
    { re: /(?:between|from)\s*\$(\d+)\s*(?:and|to|-|–)\s*\$(\d+)/i, handler: (m) => ({ min: Number(m[1]), max: Number(m[2]) }) },
    { re: /\$(\d+)\s*per person/i, handler: (m) => ({ min: Number(m[1]), max: Number(m[1]) }) },
  ];
  
  for (const { re, handler } of patterns) {
    const match = input.match(re);
    if (match) {
      return handler(match);
    }
  }
  
  return null;
}

function extractDurationPreference(input) {
  const matches = input.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*days?|(\d+)\s*days?|weekend|week/i);
  if (!matches) return null;
  
  if (matches[1] && matches[2]) {
    return { min: Number(matches[1]), max: Number(matches[2]) };
  }
  if (matches[3]) {
    const days = Number(matches[3]);
    return { min: days, max: days };
  }
  if (input.match(/weekend/i)) {
    return { min: 2, max: 3 };
  }
  if (input.match(/week/i)) {
    return { min: 5, max: 8 };
  }
  return null;
}

function isPackageQuery(lower) {
  return [
    'package',
    'packages',
    'safari',
    'trip',
    'tour',
    'vacation',
    'travel',
    'reserve',
    'book',
    'booking',
    'itinerary',
    'destination',
    'cost',
    'price',
    'duration',
    'inclusion',
    'recommend',
    'suggest',
    'adventure',
    'getaway',
    'escape',
  ].some((term) => lower.includes(term));
}

function isBookingIntent(lower) {
  return ['book', 'booking', 'reserve', 'reservation', 'confirm', 'schedule', 'arrange', 'plan'].some((term) => lower.includes(term));
}

function generateAIResponse(userInput, agentName) {
  const input = userInput.trim();
  const lower = input.toLowerCase();

  // Greeting
  if (lower.match(/^(hello|hi|hey|start|help|assist|what can you do)/i)) {
    return `👋 **Welcome to the Safari Booking Assistant!**\n\nI'm here to help you:\n✅ Explore available safari packages\n✅ Find packages by destination, duration, or price\n✅ Create bookings for guests\n✅ Answer questions about safari experiences\n\n**How can I help you today?** You can ask things like:\n• "Show me packages in Kenya"\n• "What packages are under $3,000?"\n• "Book the Masai Mara for John Doe in July"\n• "What's included in the gorilla trek?"`;
  }

  const allPackages = entity.list('Package').filter((pkg) => pkg.status === 'active');

  // Check for specific filter parameters BEFORE generic queries
  
  // Search by destination (check without requiring prepositions)
  const destination = extractDestination(input);
  if (destination) {
    const destPackages = filterPackagesByDestination(destination);
    if (destPackages.length > 0) {
      const lines = destPackages.map((pkg) => formatPackage(pkg));
      return `🗺️ **Safari Packages in ${destination.charAt(0).toUpperCase() + destination.slice(1)}:**\n\n${lines.join('\n\n')}`;
    }
  }

  // Search by price range (be specific to avoid false positives)
  const priceRange = extractPriceRange(input);
  if (priceRange) {
    const pricePackages = filterPackagesByPriceRange(priceRange.min, priceRange.max);
    if (pricePackages.length > 0) {
      const lines = pricePackages.map((pkg) => formatPackage(pkg));
      return `💰 **Packages between $${priceRange.min.toLocaleString()} - $${priceRange.max.toLocaleString()}:**\n\n${lines.join('\n\n')}`;
    } else {
      return `❌ Sorry, I don't have packages in that price range. Our packages range from $${Math.min(...allPackages.map((p) => Number(p.price_per_person))).toLocaleString()} to $${Math.max(...allPackages.map((p) => Number(p.price_per_person))).toLocaleString()}.`;
    }
  }

  // Search by duration
  const durationPref = extractDurationPreference(input);
  if (durationPref) {
    const durationPackages = filterPackagesByDuration(durationPref.min, durationPref.max);
    if (durationPackages.length > 0) {
      const lines = durationPackages.map((pkg) => formatPackage(pkg));
      return `⏱️ **Packages for ${durationPref.min}-${durationPref.max} days:**\n\n${lines.join('\n\n')}`;
    } else {
      return `❌ Sorry, I don't have packages that match that duration. We offer packages from 3 to 8 days.`;
    }
  }

  // List all packages
  if (lower.match(/list all|all packages|show all|^available packages|what packages do|package list/i)) {
    if (!allPackages.length) {
      return '📭 There are currently no active safari packages available.';
    }
    const lines = allPackages.map((pkg) => formatPackage(pkg));
    return `🌍 **All Active Safari Packages:**\n\n${lines.join('\n\n')}`;
  }

  // Try booking creation
  const bookingResponse = generateBookingResponse(input);
  if (bookingResponse) {
    return bookingResponse;
  }

  // Search by keyword
  const packageMatches = findPackages(input);
  if (packageMatches.length === 1) {
    return `🎯 **Package Found:**\n\n${formatPackage(packageMatches[0])}`;
  }

  if (packageMatches.length > 1) {
    const lines = packageMatches.slice(0, 5).map((pkg) => formatPackage(pkg));
    return `🔍 **I found these matching packages:**\n\n${lines.join('\n\n')}`;
  }

  // Generic booking/package query
  if (isBookingIntent(lower) || isPackageQuery(lower)) {
    if (!allPackages.length) {
      return '📭 There are currently no active safari packages available.';
    }
    const lines = allPackages.slice(0, 3).map((pkg) => formatPackage(pkg));
    return `🚀 **I can help with your safari booking!**\n\nHere are some popular packages:\n\n${lines.join('\n\n')}\n\n**To book:** Please tell me:\n1. Package name or destination\n2. Guest name\n3. Travel dates\n4. Number of guests`;
  }

  // Booking status check
  if (lower.match(/status|track|check|reference|ref|booking/i)) {
    return `📋 To check a booking status, please provide the booking reference number (e.g., RS-123456).`;
  }

  // Default helpful response
  return `❓ I can help you find and book safari packages. Try asking me:\n• "Show me packages in Tanzania"\n• "What's available under $2,000?"\n• "Book the Serengeti for 2 people in July"\n• "Tell me about the gorilla trek"`;
}

// GET /api/agents/whatsapp/connect/:name  →  Get WhatsApp connection URL
app.get('/api/agents/whatsapp/connect/:name', auth, (req, res) => {
  const { name } = req.params;
  // In production, this would generate an actual WhatsApp connection link
  // For now, return a placeholder message
  const whatsappLink = `https://wa.me/?text=Hi%20I%20want%20to%20connect%20with%20${encodeURIComponent(name)}%20agent`;
  res.json({
    url: whatsappLink,
    message: 'WhatsApp connection initiated. Scan with your phone to connect.',
  });
});

// ─── Email Routes ─────────────────────────────────────────────────────────────

// Helper: build company object from saved SMTP config + admin user settings
function getCompanyInfo() {
  const cfg = emailService.loadConfig();
  return {
    companyName:    cfg && cfg.sender_name   ? cfg.sender_name   : 'Reservation Safari',
    companyEmail:   cfg && cfg.company_email ? cfg.company_email : (cfg ? cfg.user : ''),
    companyPhone:   cfg && cfg.company_phone ? cfg.company_phone : '',
    companyAddress: cfg && cfg.company_address ? cfg.company_address : '',
    logoUrl:        cfg && cfg.logo_url      ? cfg.logo_url      : '',
    accentColor:    cfg && cfg.accent_color  ? cfg.accent_color  : '#16a34a',
  };
}

// Get SMTP config (password redacted)
app.get('/api/email/config', auth, (req, res) => {
  const config = emailService.loadConfig();
  if (!config) return res.json({ configured: false });
  const { pass, ...safe } = config;
  res.json({ configured: true, ...safe });
});

// Save SMTP config (now includes company info + logo + payment link)
app.post('/api/email/config', auth, (req, res) => {
  try {
    // If SMTP is provided via environment variables (e.g., on Render), do not allow saving via file
    if (process.env.EMAIL_HOST) {
      return res.status(400).json({ error: 'Email is configured via environment variables. Update the service environment variables instead of saving here.' });
    }

    const { host, port, user, pass, sender_name, company_email, company_phone, company_address, logo_url, accent_color, payment_link } = req.body;
    if (!host || !user || !pass) return res.status(400).json({ error: 'host, user, and pass are required' });
    const existing = emailService.loadConfig() || {};
    try {
      emailService.saveConfig({
        ...existing,
        host, port: port || 587, user, pass,
        sender_name:     sender_name     || 'Reservation Safari',
        company_email:   company_email   || '',
        company_phone:   company_phone   || '',
        company_address: company_address || '',
        logo_url:        logo_url        || '',
        accent_color:    accent_color    || '#16a34a',
        payment_link:    payment_link    || '',
      });
    } catch (err) {
      console.error('[server] Failed to save email config:', err && err.message ? err.message : err);
      return res.status(500).json({ error: 'Failed to save email configuration: ' + (err && err.message ? err.message : 'unknown') });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[server] /api/email/config error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Send test email to logged-in admin
app.post('/api/email/test', auth, async (req, res) => {
  try {
    const company = getCompanyInfo();
    await emailService.sendEmail({
      to: req.user.email,
      subject: `✅ Test Email — ${company.companyName}`,
      html: emailService.testEmailHtml({ to: req.user.email, company }),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send invoice email
app.post('/api/email/send-invoice', auth, async (req, res) => {
  try {
    const { invoice_number, client_name, client_email, total, amount_paid, due_date, booking_ref, notes, items, currency } = req.body;
    if (!client_email) return res.status(400).json({ error: 'No client email on this invoice' });
    const company = getCompanyInfo();
    const cfg = emailService.loadConfig();
    let parsedItems = [];
    try { parsedItems = items ? (typeof items === 'string' ? JSON.parse(items) : items) : []; } catch {}
    await emailService.sendEmail({
      to: client_email,
      subject: `Invoice ${invoice_number} — ${company.companyName}`,
      html: emailService.invoiceEmailHtml({
        invoice_number, client_name, client_email, total, amount_paid: amount_paid || 0,
        due_date, booking_ref, notes, items: parsedItems, currency: currency || 'USD',
        payment_link: cfg && cfg.payment_link ? cfg.payment_link : '',
        company,
      }),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send quote email
app.post('/api/email/send-quote', auth, async (req, res) => {
  try {
    const { quote_number, client_name, client_email, total, valid_until, package_name, start_date, end_date, num_guests, inclusions, exclusions, highlights, notes, currency } = req.body;
    if (!client_email) return res.status(400).json({ error: 'No client email on this quote' });
    const company = getCompanyInfo();
    const cfg = emailService.loadConfig();
    await emailService.sendEmail({
      to: client_email,
      subject: `Your Safari Quote ${quote_number} — ${company.companyName}`,
      html: emailService.quoteEmailHtml({
        quote_number, client_name, client_email, total, valid_until,
        package_name, start_date, end_date, num_guests,
        inclusions, exclusions, highlights, notes,
        currency: currency || 'USD',
        payment_link: cfg && cfg.payment_link ? cfg.payment_link : '',
        company,
      }),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send booking confirmation email
app.post('/api/email/send-booking-confirmation', auth, async (req, res) => {
  try {
    const { booking_ref, client_name, client_email, package_name, start_date, end_date, num_guests, total_amount, currency, amount_paid, booking_source, special_requests } = req.body;
    if (!client_email) return res.status(400).json({ error: 'No client email on this booking' });
    const company = getCompanyInfo();
    const cfg = emailService.loadConfig();
    await emailService.sendEmail({
      to: client_email,
      subject: `Booking Confirmed ✅ — ${booking_ref} | ${company.companyName}`,
      html: emailService.bookingConfirmationEmailHtml({
        booking_ref, client_name, client_email, package_name,
        start_date, end_date, num_guests, total_amount,
        currency: currency || 'USD', amount_paid: amount_paid || 0,
        booking_source, special_requests,
        payment_link: cfg && cfg.payment_link ? cfg.payment_link : '',
        company,
      }),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send payment receipt email
app.post('/api/email/send-payment-receipt', auth, async (req, res) => {
  try {
    const { payment_ref, client_name, client_email, amount, currency, payment_date, method, invoice_number, booking_ref, notes } = req.body;
    if (!client_email) return res.status(400).json({ error: 'No client email on this payment' });
    const company = getCompanyInfo();
    await emailService.sendEmail({
      to: client_email,
      subject: `Payment Receipt — ${payment_ref || 'Payment Received'} | ${company.companyName}`,
      html: emailService.paymentReceiptEmailHtml({
        payment_ref, client_name, client_email, amount,
        currency: currency || 'USD', payment_date, method,
        invoice_number, booking_ref, notes, company,
      }),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SMS / WhatsApp Routes ────────────────────────────────────────────────────

// GET SMS config (auth tokens redacted)
app.get('/api/sms/config', auth, (req, res) => {
  const cfg = smsService.loadConfig();
  res.json({
    ...cfg,
    twilio_auth_token: cfg.twilio_auth_token ? '••••••••' : '',
    at_api_key       : cfg.at_api_key        ? '••••••••' : '',
  });
});

// POST SMS config — preserves existing secrets if redacted placeholder is sent back
app.post('/api/sms/config', auth, (req, res) => {
  const existing = smsService.loadConfig();
  const incoming = { ...req.body };
  if (incoming.twilio_auth_token === '••••••••') incoming.twilio_auth_token = existing.twilio_auth_token;
  if (incoming.at_api_key        === '••••••••') incoming.at_api_key        = existing.at_api_key;
  if (incoming.wa_templates && typeof incoming.wa_templates === 'object') {
    incoming.wa_templates = { ...(existing.wa_templates || {}), ...incoming.wa_templates };
  }
  const updated = smsService.saveConfig(incoming);
  // Echo back redacted
  res.json({
    ...updated,
    twilio_auth_token: updated.twilio_auth_token ? '••••••••' : '',
    at_api_key       : updated.at_api_key        ? '••••••••' : '',
  });
});

// Send a test SMS or WhatsApp message.
// For WhatsApp: pass `templateEvent` (booking_received | booking_confirmed |
// payment_receipt | upcoming_reminder) to test an approved template using sample
// data; if omitted, a freeform body is sent (works in sandbox or within 24h window).
app.post('/api/sms/test', auth, async (req, res) => {
  const { to, channel = 'sms', templateEvent } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient phone number required' });
  try {
    const company = getCompanyInfo();
    const body = `${company.companyName}: Test ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} from your reservation system. If you received this, your setup is working!`;
    let result;
    if (channel === 'whatsapp') {
      const cfg = smsService.loadConfig();
      const contentSid = templateEvent && cfg.wa_templates ? cfg.wa_templates[templateEvent] : '';
      if (templateEvent && !contentSid) {
        return res.status(400).json({ error: `No ContentSid configured for "${templateEvent}". Save a template first.` });
      }
      if (contentSid) {
        const sampleBooking = {
          client_name: 'Test Guest', booking_ref: 'TEST-001',
          package_name: 'Sample Safari', start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 5*86400000).toISOString(),
          num_guests: 2, currency: company.currency || 'USD',
        };
        const samplePayment = { client_name: 'Test Guest', amount: 1234, currency: company.currency || 'USD', payment_ref: 'PAY-TEST-001' };
        const contentVariables = smsService.buildWaTemplateVars(templateEvent, { booking: sampleBooking, payment: samplePayment, company });
        result = await smsService.sendWhatsApp({ to, contentSid, contentVariables });
      } else {
        result = await smsService.sendWhatsApp({ to, body });
      }
    } else {
      result = await smsService.sendSms({ to, body });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Twilio credentials without sending anything.
// Body may override the stored values (so the user can test freshly-pasted
// creds before clicking Save); otherwise uses what's already saved.
app.post('/api/sms/verify', auth, async (req, res) => {
  try {
    const stored = smsService.loadConfig();
    const accountSid = (req.body?.accountSid || stored.twilio_account_sid || '').trim();
    let  authToken   = (req.body?.authToken   || '').trim();
    // If caller sent the redacted placeholder, fall back to the stored token
    if (!authToken || authToken === '••••••••') authToken = stored.twilio_auth_token || '';
    const info = await smsService.verifyTwilioCredentials({ accountSid, authToken });
    res.json({ ok: true, ...info });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ─── Server-side Availability Check ──────────────────────────────────────────
// Authoritative check — frontend availability checks call this for overbooking prevention.
app.post('/api/check-availability', auth, (req, res) => {
  const { package_id, start_date, end_date, exclude_booking_id } = req.body;
  if (!package_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'package_id, start_date, and end_date are required' });
  }

  // 1. Check manual date blocks
  const blocks = entity.list('Availability').filter(a =>
    a.package_id === package_id &&
    a.type === 'blocked' &&
    a.start_date <= end_date &&
    (a.end_date || a.start_date) >= start_date
  );
  if (blocks.length > 0) {
    const reason = blocks[0].reason ? `Package unavailable: ${blocks[0].reason}` : 'Package is blocked for these dates';
    return res.json({ available: false, reason });
  }

  // 2. Check confirmed/in-progress bookings for capacity conflicts
  const pkg = entity.findById('Package', package_id);
  const maxGuests = pkg?.max_guests || null;

  const overlapping = entity.list('Booking').filter(b =>
    b.package_id === package_id &&
    b.id !== exclude_booking_id &&
    ['confirmed', 'in_progress'].includes(b.status) &&
    b.start_date && b.end_date &&
    b.start_date <= end_date &&
    b.end_date >= start_date
  );

  if (overlapping.length > 0 && maxGuests) {
    const bookedGuests = overlapping.reduce((sum, b) => sum + (Number(b.num_guests) || 1), 0);
    if (bookedGuests >= maxGuests) {
      return res.json({ available: false, reason: `Package is fully booked (${bookedGuests}/${maxGuests} guests) for these dates` });
    }
  }

  res.json({ available: true, overlapping_bookings: overlapping.length });
});

// ─── OTA Webhook Receiver ─────────────────────────────────────────────────────
// External OTAs POST to this endpoint to push bookings into the system.
// Secure with X-Webhook-Secret header matching the OTA's webhook_secret field.
app.post('/api/webhook/ota', (req, res) => {
  const incomingSecret = req.headers['x-webhook-secret'] || req.body?.secret;
  if (!incomingSecret) return res.status(401).json({ error: 'Missing X-Webhook-Secret header' });

  // Find the OTA whose webhook_secret matches
  const otas = entity.list('OTA');
  const ota = otas.find(o => o.webhook_secret && o.webhook_secret === incomingSecret && o.status === 'active');
  if (!ota) return res.status(401).json({ error: 'Invalid webhook secret or OTA is not active' });

  const { booking: b } = req.body;
  if (!b) return res.status(400).json({ error: 'Request body must contain a "booking" object' });

  const now = new Date().toISOString();
  // Normalise field names from common OTA schemas
  const newBooking = entity.create('Booking', {
    id              : uuidv4(),
    booking_ref     : `OTA-${Date.now().toString(36).toUpperCase()}`,
    booking_source  : 'ota',
    ota_id          : ota.id,
    ota_name        : ota.name,
    ota_reference   : b.reference || b.reservation_id || b.booking_id || '',
    ota_commission_rate: ota.commission_rate || 0,
    client_name     : b.guest_name   || b.client_name   || b.traveller_name || '',
    client_email    : b.guest_email  || b.client_email  || '',
    client_phone    : b.guest_phone  || b.client_phone  || '',
    package_name    : b.product_name || b.package_name  || b.tour_name || '',
    start_date      : b.check_in     || b.start_date    || '',
    end_date        : b.check_out    || b.end_date      || '',
    num_guests      : Number(b.guests || b.num_guests || b.pax || 1),
    total_amount    : Number(b.total_price || b.amount   || b.gross_amount || 0),
    currency        : b.currency || 'USD',
    status          : 'confirmed',
    special_requests: b.special_requests || b.notes || '',
    created_date    : now,
    updated_date    : now,
    created_by      : `ota_webhook:${ota.name}`,
  });

  // Log the sync event
  entity.create('AutomationLog', {
    id             : uuidv4(),
    type           : 'ota_webhook',
    status         : 'sent',
    entity_type    : 'Booking',
    entity_id      : newBooking.id,
    entity_ref     : newBooking.booking_ref,
    recipient_email: newBooking.client_email,
    message        : `OTA booking received from ${ota.name} — ref: ${newBooking.ota_reference || 'n/a'}`,
    created_date   : now,
    updated_date   : now,
    created_by     : 'system',
  });

  // Fire email confirmation automation asynchronously
  automations.dispatchCreate('Booking', newBooking);

  console.log(`[OTA Webhook] Booking ${newBooking.booking_ref} received from ${ota.name}`);
  res.json({ success: true, booking_ref: newBooking.booking_ref, booking_id: newBooking.id });
});

// ─── Automation Routes ────────────────────────────────────────────────────────

// GET automation config
app.get('/api/automations/config', auth, (req, res) => {
  res.json(automations.loadConfig());
});

// Save automation config
app.post('/api/automations/config', auth, (req, res) => {
  const updated = automations.saveConfig(req.body);
  res.json(updated);
});

// Get automation activity logs (recent 200)
app.get('/api/automations/logs', auth, (req, res) => {
  const { limit = 100, type, status } = req.query;
  let logs = entity.list('AutomationLog', '-created_date', 500);
  if (type)   logs = logs.filter(l => l.type   === type);
  if (status) logs = logs.filter(l => l.status === status);
  res.json(logs.slice(0, parseInt(limit)));
});

// Get automation stats
app.get('/api/automations/stats', auth, (req, res) => {
  res.json(automations.getStats());
});

// Manually trigger scheduled checks (admin testing)
app.post('/api/automations/run-check', auth, async (req, res) => {
  const { check } = req.body;
  try {
    if (check === 'overdue') {
      const result = await automations.runOverdueCheck();
      return res.json({ success: true, ...result });
    }
    if (check === 'expiry') {
      const result = await automations.runQuoteExpiryCheck();
      return res.json({ success: true, ...result });
    }
    if (check === 'weekly') {
      const result = await automations.runWeeklyReport();
      return res.json({ success: true, ...result });
    }
    if (check === 'upcoming') {
      const result = await automations.runUpcomingTripReminder();
      return res.json({ success: true, ...result });
    }
    res.status(400).json({ error: 'Unknown check type. Valid: overdue, expiry, weekly, upcoming' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PesaPal Payment Routes ───────────────────────────────────────────────────

// GET config (secrets redacted)
app.get('/api/payment/config', auth, (req, res) => {
  const cfg = loadPesapalConfig();
  if (!cfg) return res.json({ configured: false });
  const { consumer_secret, ...safe } = cfg;
  res.json({ configured: true, ...safe, consumer_secret: consumer_secret ? '••••••••' : '' });
});

// Save / update config
app.post('/api/payment/config', auth, (req, res) => {
  const { consumer_key, consumer_secret, environment } = req.body;
  if (!consumer_key || !consumer_secret) {
    return res.status(400).json({ error: 'consumer_key and consumer_secret are required' });
  }
  const existing = loadPesapalConfig() || {};
  // Reset ipn_id when environment changes so it gets re-registered
  const ipn_id = existing.environment === environment ? (existing.ipn_id || '') : '';
  savePesapalConfig({ ...existing, consumer_key, consumer_secret, environment: environment || 'sandbox', ipn_id });
  res.json({ success: true });
});

// Generate a PesaPal payment link for an invoice or booking
// Body: { invoice_id?, booking_id?, amount, currency, description, client_name, client_email, client_phone? }
app.post('/api/payment/generate-link', auth, async (req, res) => {
  const cfg = loadPesapalConfig();
  if (!cfg || !cfg.consumer_key || !cfg.consumer_secret) {
    return res.status(400).json({ error: 'PesaPal is not configured. Add credentials in Settings → Payments.' });
  }

  const { amount, currency = 'USD', description, client_name, client_email, client_phone, invoice_id, booking_id, invoice_number } = req.body;
  if (!amount || !client_email) return res.status(400).json({ error: 'amount and client_email are required' });

  try {
    const { token, base } = await getPesapalToken(cfg);

    // Build callback URL pointing back to this server
    const serverOrigin = `${req.protocol}://${req.hostname}:${process.env.PORT || 3001}`;
    const callbackUrl  = `${serverOrigin}/api/payment/callback`;

    const ipnId = await ensurePesapalIpn(cfg, token, base, callbackUrl);

    const orderId = invoice_id || booking_id || uuidv4();
    const nameParts = (client_name || '').trim().split(' ');
    const payload = {
      id                    : orderId,
      currency              : currency,
      amount                : Number(amount),
      description           : description || `Safari Payment`,
      callback_url          : callbackUrl,
      notification_id       : ipnId,
      billing_address       : {
        email_address       : client_email,
        phone_number        : client_phone || '',
        country_code        : 'KE',
        first_name          : nameParts[0] || client_name || '',
        last_name           : nameParts.slice(1).join(' ') || '',
        line_1              : '',
        city                : '',
        state               : '',
        postal_code         : '',
        zip_code            : '',
      },
    };

    const resp = await httpsPost(`${base}/api/Transactions/SubmitOrderRequest`, payload, {
      Authorization: `Bearer ${token}`,
    });

    if (!resp.body?.redirect_url) {
      return res.status(500).json({ error: `PesaPal order failed: ${JSON.stringify(resp.body)}` });
    }

    // Optionally store on the invoice record
    if (invoice_id) {
      entity.update('Invoice', invoice_id, {
        payment_link   : resp.body.redirect_url,
        pesapal_order_id: resp.body.order_tracking_id || '',
        updated_date   : new Date().toISOString(),
      });
    }
    if (booking_id) {
      entity.update('Booking', booking_id, {
        payment_link   : resp.body.redirect_url,
        updated_date   : new Date().toISOString(),
      });
    }

    res.json({
      success        : true,
      payment_url    : resp.body.redirect_url,
      order_tracking_id: resp.body.order_tracking_id,
    });
  } catch (err) {
    console.error('[PesaPal] generate-link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PesaPal IPN / callback handler
app.get('/api/payment/callback', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;
  if (!OrderTrackingId) return res.status(400).send('Missing OrderTrackingId');

  try {
    const cfg = loadPesapalConfig();
    if (!cfg) return res.status(500).send('PesaPal not configured');

    const { token, base } = await getPesapalToken(cfg);
    // Query the transaction status
    const statusResp = await new Promise((resolve, reject) => {
      const url = new URL(`${base}/api/Transactions/GetTransactionStatus`);
      url.searchParams.set('orderTrackingId', OrderTrackingId);
      https.get(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      }, (r) => {
        let d = ''; r.on('data', c => (d += c)); r.on('end', () => {
          try { resolve(JSON.parse(d)); } catch { resolve({}); }
        });
      }).on('error', reject);
    });

    const pesapalStatus = statusResp.payment_status_description || '';
    const amount        = statusResp.amount || 0;
    const currency      = statusResp.currency || 'USD';

    // Map PesaPal status → internal status
    const paid = ['Completed', 'COMPLETED'].includes(pesapalStatus);

    automations.logAction('pesapal_callback', paid ? 'sent' : 'skipped', {
      entity_ref: OrderTrackingId,
      message   : `PesaPal callback: ${pesapalStatus} | ref: ${OrderMerchantReference || ''}`,
    });

    if (paid) {
      // Try to match to an invoice by pesapal_order_id or merchant reference
      const invoices = entity.list('Invoice');
      const matched  = invoices.find(i =>
        i.pesapal_order_id === OrderTrackingId ||
        i.id === OrderMerchantReference
      );
      if (matched && matched.status !== 'paid') {
        entity.update('Invoice', matched.id, {
          status       : 'paid',
          amount_paid  : Number(matched.total || 0),
          updated_date : new Date().toISOString(),
        });
        console.log(`[PesaPal] Invoice ${matched.invoice_number} marked paid via IPN`);
      }
    }

    // PesaPal expects a 200 OK
    res.status(200).send('OK');
  } catch (err) {
    console.error('[PesaPal] callback error:', err.message);
    res.status(200).send('OK'); // Always 200 to prevent PesaPal retries
  }
});

// ─── Messages Reply Route ─────────────────────────────────────────────────────
// POST /api/messages/reply
// Body: { conversation_id, client_email, client_name, booking_id?, booking_ref?, subject, body }
// Saves an admin Message entity AND sends an email to the client.
app.post('/api/messages/reply', auth, async (req, res) => {
  const { conversation_id, client_email, client_name, booking_id = '', booking_ref = '', subject, body: msgBody } = req.body;
  if (!client_email || !msgBody) {
    return res.status(400).json({ error: 'client_email and body are required' });
  }

  const now = new Date().toISOString();
  const senderName = req.user.full_name || req.user.email;

  // 1. Persist the reply as a Message entity
  const message = entity.create('Message', {
    id              : uuidv4(),
    conversation_id : conversation_id || `client_${client_email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    booking_id,
    booking_ref,
    client_id       : '',
    client_name,
    client_email,
    sender_type     : 'admin',
    sender_name     : senderName,
    sender_email    : req.user.email,
    subject         : subject || 'Reply from Reservation Safari',
    body            : msgBody,
    message_type    : 'reply',
    is_read         : true,
    status          : 'open',
    created_date    : now,
    updated_date    : now,
    created_by      : req.user.email,
  });

  // 2. Send email to client (non-blocking on failure)
  try {
    if (emailService.loadConfig()?.host) {
      const company = getCompanyInfo();
      const replyHtml = buildReplyEmailHtml({ senderName, client_name, subject, body: msgBody, booking_ref, company });
      await emailService.sendEmail({
        to     : client_email,
        subject: subject || `Message from ${company.companyName}`,
        html   : replyHtml,
      });
    }
  } catch (emailErr) {
    console.warn('[Messages] Reply email send failed (message still saved):', emailErr.message);
  }

  res.json({ success: true, message });
});

// Build a clean HTML email for admin replies
function buildReplyEmailHtml({ senderName, client_name, subject, body, booking_ref, company }) {
  const green = company.accentColor || '#16a34a';
  const escaped = (body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f9fafb;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .hdr{background:linear-gradient(135deg,${green},${green}cc);padding:32px;text-align:center;color:#fff}
  .hdr h1{margin:0;font-size:20px;font-weight:600}
  .hdr p{margin:6px 0 0;opacity:.85;font-size:13px}
  .body{padding:32px}
  .msg{background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid ${green};border-radius:8px;padding:18px 20px;margin:20px 0;font-size:14px;color:#374151;line-height:1.7}
  .ftr{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    ${company.logoUrl ? `<img src="${company.logoUrl}" alt="${company.companyName}" style="height:36px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto">` : ''}
    <h1>${subject || 'Message from ' + company.companyName}</h1>
    ${booking_ref ? `<p>Re: Booking ${booking_ref}</p>` : `<p>${company.companyName}</p>`}
  </div>
  <div class="body">
    <p style="font-size:15px;color:#374151">Dear ${client_name || 'Guest'},</p>
    <div class="msg">${escaped}</div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      This message was sent by <strong>${senderName}</strong> from <strong>${company.companyName}</strong>.<br>
      You can reply to this email or contact us directly.
    </p>
  </div>
  <div class="ftr">${company.companyName} &middot; ${company.companyEmail} &middot; ${company.companyPhone}</div>
</div>
</body></html>`;
}

// ─── Booking QR / Scan Check-in ───────────────────────────────────────────────
// Each booking gets a stable scan_token (lazy-generated). QR encodes {ref,t}.
// Drivers/guides scan at pickup → park entry → lodge → dropoff to build an audit trail.

const SCAN_TYPES = ['pickup', 'park_entry', 'lodge_checkin', 'dropoff'];

function ensureScanToken(booking) {
  if (booking.scan_token) return booking.scan_token;
  const token = crypto.randomBytes(12).toString('hex');
  entity.update('Booking', booking.id, { scan_token: token });
  return token;
}

// GET /api/bookings/:id/qr  →  { qr_data_url, payload, booking_ref }
app.get('/api/bookings/:id/qr', auth, async (req, res) => {
  const b = entity.findById('Booking', req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  const token = ensureScanToken(b);
  const payload = JSON.stringify({ ref: b.booking_ref, t: token });

  try {
    let qr_data_url = b.qr_data_url;
    if (!qr_data_url) {
      qr_data_url = await QRCode.toDataURL(payload, { margin: 1, width: 280, errorCorrectionLevel: 'L' });
      entity.update('Booking', b.id, { qr_data_url });
    }
    res.json({ qr_data_url, payload, booking_ref: b.booking_ref });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/scan-lookup  →  shows booking + existing scans before confirming
app.post('/api/bookings/scan-lookup', auth, (req, res) => {
  const { ref, token } = req.body || {};
  if (!ref || !token) return res.status(400).json({ error: 'ref and token are required' });
  const b = entity.list('Booking').find(x => x.booking_ref === ref);
  if (!b || !b.scan_token || b.scan_token !== token) {
    return res.status(404).json({ error: 'Invalid or unknown QR code' });
  }
  const scans = entity.list('BookingScan')
    .filter(s => s.booking_id === b.id)
    .sort((a, c) => (a.created_date < c.created_date ? 1 : -1));
  res.json({
    booking: {
      id: b.id, ref: b.booking_ref,
      client_name: b.client_name, client_email: b.client_email,
      package_name: b.package_name, start_date: b.start_date, end_date: b.end_date,
      num_guests: b.num_guests, status: b.status,
    },
    scans,
  });
});

// POST /api/bookings/scan  →  records one check-in
app.post('/api/bookings/scan', auth, (req, res) => {
  const { ref, token, scan_type, notes } = req.body || {};
  if (!ref || !token || !scan_type) {
    return res.status(400).json({ error: 'ref, token, and scan_type are required' });
  }
  if (!SCAN_TYPES.includes(scan_type)) {
    return res.status(400).json({ error: `scan_type must be one of: ${SCAN_TYPES.join(', ')}` });
  }
  const role = req.user.role;
  if (!['admin', 'driver', 'guide'].includes(role)) {
    return res.status(403).json({ error: 'Only drivers, guides, and admins can record scans' });
  }
  const b = entity.list('Booking').find(x => x.booking_ref === ref);
  if (!b) return res.status(404).json({ error: 'Booking not found for ref ' + ref });
  if (!b.scan_token || b.scan_token !== token) {
    return res.status(400).json({ error: 'Invalid QR code (token mismatch)' });
  }

  const now = new Date().toISOString();
  const scan = entity.create('BookingScan', {
    id: uuidv4(),
    booking_id: b.id,
    booking_ref: b.booking_ref,
    client_name: b.client_name,
    scan_type,
    scanned_by_email: req.user.email,
    scanned_by_name: req.user.full_name || req.user.email,
    scanned_by_role: role,
    notes: notes || '',
    created_date: now,
    updated_date: now,
    created_by: req.user.email,
  });
  res.json({
    success: true,
    scan,
    booking: {
      id: b.id, ref: b.booking_ref,
      client_name: b.client_name, package_name: b.package_name,
      start_date: b.start_date, end_date: b.end_date,
      num_guests: b.num_guests, status: b.status,
    },
  });
});

// GET /api/bookings/:id/scans  →  audit trail for one booking
app.get('/api/bookings/:id/scans', auth, (req, res) => {
  const scans = entity.list('BookingScan')
    .filter(s => s.booking_id === req.params.id)
    .sort((a, b) => (a.created_date < b.created_date ? 1 : -1));
  res.json(scans);
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
automations.startSchedulers();
app.listen(PORT, () => {
  console.log(`\n✅ Reservation Safari backend running at http://localhost:${PORT}`);
  console.log(`   Database file: ${require('path').join(__dirname, 'data.json')}\n`);
});
