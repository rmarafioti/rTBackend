// auth/index.js
const router = require("express").Router();
const ownerAuth = require("./indexOwner");
const memberAuth = require("./indexMember");

// Route for owner authentication
router.use("/owner", ownerAuth);

// Route for member authentication
router.use("/member", memberAuth);

module.exports = router;
