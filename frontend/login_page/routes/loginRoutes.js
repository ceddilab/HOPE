const express = require('express');
const router = express.Router();
const loginController = require('../controller/loginController');

// ✅ CORRECT WAY:
router.get('/login', loginController.showLoginPage);   // get = show login form
router.post('/login', loginController.loginUser);      // post = process login form

module.exports = router;
