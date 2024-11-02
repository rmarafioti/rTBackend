const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// Middleware to check if the user is a member
const requireOwnerRole = (req, res, next) => {
  if (res.locals.userRole !== "owner") {
    return res.status(403).json({ error: "Access forbidden: Owners only." });
  }
  next();
};

// GET route to get logged-in owner's information
router.get("/", requireOwnerRole, async (req, res, next) => {
  try {
    // Access the owner from res.locals, set by the middleware in api/index.js
    const owner = res.locals.user;

    if (!owner) {
      return res.status(401).json({ error: "Owner not authenticated" });
    }

    // Query the database for the owner's details
    const ownerData = await prisma.owner.findUnique({
      where: { id: owner.id },
      include: { ownerBusiness: true },
    });

    // Send the owner's information as a response
    res.json(ownerData);
  } catch (error) {
    console.error("Error retrieving owner information:", error);
    next(error);
  }
});

// POST route to create a new business
router.post("/business", requireOwnerRole, async (req, res, next) => {
  try {
    const { id: owner_id } = res.locals.user;
    const { businessName, code } = req.body;

    const newBusiness = await prisma.business.create({
      data: {
        businessName,
        code,
        owner_id,
      },
    });

    res.json(newBusiness);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
