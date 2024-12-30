const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// GET request to retrieve all businesses
router.get("/", async (req, res, next) => {
  try {
    const businessData = await prisma.business.findMany(); // Fetch all businesses
    res.json(businessData); // Return the data as JSON
  } catch (error) {
    console.error("Error retrieving business information:", error);
    next(error);
  }
});

module.exports = router;
