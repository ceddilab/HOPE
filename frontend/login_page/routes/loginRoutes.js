const express = require('express');
const router = express.Router();
const loginController = require('../controller/loginController');

// GET shows the login form. The POST is handled by the backend API
// (/api/auth/login) via browser JS, not by this Express frontend.
router.get('/login', loginController.showLoginPage);

module.exports = router;
