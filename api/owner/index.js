const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// Route to get logged-in owner's information
router.get("/", async (req, res, next) => {
  try {
    // Access the user from res.locals, set by the middleware in api/index.js
    const owner = res.locals.user;

    if (!owner) {
      return res.status(401).json({ error: "Owner not authenticated" });
    }

    // Send the owner's information as a response, including related business data
    const ownerData = await prisma.owner.findUnique({
      where: { id: owner.id },
      include: { ownerBusiness: true }, // Include related business data
    });

    res.json(ownerData);
  } catch (error) {
    console.error("Error retrieving owner information:", error);
    next(error);
  }
});

// Post route to create a new business
router.post("/business", async (req, res, next) => {
  console.log("Authenticated user:", res.locals.user);

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
