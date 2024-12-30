const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// GET request to retrive business info for buisness name on onboard form
router.get("/", async (req, res, next) => {
  try {
    const businessData = await prisma.business.findMany({
      where: { id: business.id },
    });

    res.json(businessData);
  } catch (error) {
    console.error("Error retrieving business information:", error);
    next(error);
  }
});
