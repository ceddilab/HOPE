const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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

// ✅ Middleware to parse form data from POST requests
app.use(express.urlencoded({ extended: true }));

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

// ✅ 404 Error Handling
app.use((req, res, next) => {
  res.status(404).render('404'); // Custom 404 page, assuming a 404.ejs file exists
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
