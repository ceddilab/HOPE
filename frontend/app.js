const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
// 🔐 Must match the backend's JWT_SECRET so this server can verify the session cookie
const JWT_SECRET = process.env.JWT_SECRET;

// First-party session cookie. The frontend (not the backend) now owns this cookie,
// so it's set/read/cleared by the same origin the browser is talking to.
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24h — matches the JWT expiry
const cookieOptions = (extra = {}) => ({
  httpOnly: true,                                 // not readable by JS (XSS protection)
  secure: process.env.NODE_ENV === 'production',  // HTTPS-only in production
  sameSite: 'lax',                                // first-party => lax is safe + survives navigation
  path: '/',
  ...extra,
});

// ✅ Set the view engine to EJS
app.set('view engine', 'ejs');

// ✅ Support multiple views folders
app.set('views', [
  path.join(__dirname, 'Greeting_Page/views'),
  path.join(__dirname, 'login_page/views'),
  path.join(__dirname, 'guest_page/views')
]);

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'Greeting_Page/public')));
app.use(express.static(path.join(__dirname, 'login_page/public')));
app.use(express.static(path.join(__dirname, 'guest_page/public')));
app.use('/guest', express.static(path.join(__dirname, 'guest_page/public')));

// ✅ Expose runtime config for browser-side scripts
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.APP_CONFIG = ${JSON.stringify({ BACKEND_URL })};`);
});

// ✅ Middleware to parse request bodies (form posts + JSON from the auth proxy)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Read cookies (needed to inspect the first-party session cookie)
app.use(cookieParser());

// ✅ Expose the logged-in state to every rendered view as `res.locals.user`.
//    The /auth proxy sets a first-party httpOnly JWT cookie named "token"; here we
//    verify it locally with the shared JWT_SECRET so EJS can render the right navbar.
app.use((req, res, next) => {
  res.locals.user = null; // default: logged out (keeps `if (!user)` templates safe)

  const token = req.cookies && req.cookies.token;
  if (token && JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.locals.user = { id: decoded.userId }; // truthy => logged in
    } catch (err) {
      // Invalid/expired/tampered token => treat as logged out
      res.locals.user = null;
    }
  }

  next();
});

// ✅ Load route modules
const greetingRoutes = require('./Greeting_Page/routes/greetingRoutes');
const loginRoutes = require('./login_page/routes/loginRoutes');
const registerRoutes = require('./login_page/routes/registerRoutes');
const guestRoutes = require('./guest_page/routes/guestRoutes');
const clusteringRoutes = require('./guest_page/routes/clustering');

// ✅ Use the route modules
app.use('/', greetingRoutes);
app.use('/', loginRoutes);
app.use('/', registerRoutes);
app.use('/guest', guestRoutes);
app.use('/clustering', clusteringRoutes);  // clustering route for guest card 1

// ✅ Render guest page manually
app.get('/guest', (req, res) => {
  res.render('guest');  // guest_page/views/guest.ejs
});

// ✅ Greeting page
app.get('/', (req, res) => {
  res.redirect('/greeting'); // default redirect to homepage
});
app.get('/home', (req, res) => {
  res.render('greeting');  // Greeting_Page/views/greeting.ejs
});

// ✅ Cards navigation
app.get('/routes', (req, res) => {
  res.render('routes');  // guest_page/views/routes.ejs
});
app.get('/area-info', (req, res) => {
  res.render('area-info');  // guest_page/views/area-info.ejs
});

app.get('/first-aid', (req, res) => {
  res.render('first-aid');  // Ensure the file exists in the views folder
});


// ✅ About Us Page (Greeting_Page/views/about.ejs)
app.get('/AboutUs', (req, res) => {
  res.render('about');  // Changed to 'about' for consistency
});

app.get('/contact', (req, res) => {
  res.render('contact');  // Changed to 'contact' for consistency
});

// ✅ Auth proxy (BFF): the browser talks only to THIS frontend origin.
//    We forward credentials to the backend API server-to-server, then set the JWT
//    it returns as a FIRST-PARTY httpOnly cookie on this domain. This keeps the
//    session cookie first-party (works in every browser) even though the frontend
//    and backend live on separate domains.
async function proxyAuth(upstreamPath, req, res) {
  try {
    const upstream = await fetch(`${BACKEND_URL}${upstreamPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok || !data.success || !data.token) {
      return res
        .status(upstream.status || 400)
        .json({ success: false, message: data.message || 'Authentication failed' });
    }

    // Set the session cookie on OUR domain; never expose the raw token to the browser.
    res.cookie('token', data.token, cookieOptions({ maxAge: SESSION_MAX_AGE }));
    return res.json({ success: true, message: data.message, user: data.user });
  } catch (err) {
    console.error('Auth proxy error:', err);
    return res.status(502).json({ success: false, message: 'Auth service unavailable' });
  }
}

app.post('/auth/login', (req, res) => proxyAuth('/api/auth/login', req, res));
app.post('/auth/signup', (req, res) => proxyAuth('/api/auth/signup', req, res));

// ✅ Logout — clear the first-party session cookie and return to the public home page.
//    clearCookie must use the same path/options the cookie was set with.
app.get('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions());
  res.redirect('/greeting');
});

// ✅ 404 Error Handling
app.use((req, res, next) => {
  res.status(404).render('404'); // Custom 404 page, assuming a 404.ejs file exists
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
