const express = require('express');
const router = express.Router();
const registerController = require('../controller/registerController');

router.get('/register', registerController.renderRegister);


module.exports = router;
