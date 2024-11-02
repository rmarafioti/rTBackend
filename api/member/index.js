// api/member/index.js
const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// GET route to get logged-in member's information
router.get("/", async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    if (!member) {
      return res.status(401).json({ error: "Member not authenticated" });
    }

    // Query the database for the member's details
    const memberData = await prisma.member.findUnique({
      where: { id: member.id },
      include: {
        business: true,
      },
      // Include any related data if necessary, e.g., member-specific associations
    });

    if (!memberData) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Send the member's information as a response
    res.json(memberData);
  } catch (error) {
    console.error("Error retrieving member information:", error);
    next(error);
  }
});

// POST route to link team member to a business
router.post("/business", async (req, res, next) => {
  try {
    const { id: member_id } = res.locals.user;
    const { businessName, code } = req.body;

    // Find the business by businessName and code
    const business = await prisma.business.findUnique({
      where: {
        businessName_code: {
          businessName,
          code,
        },
      },
    });

    // If business is not found throw an error
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Link member to a business by setting the business id to the members table
    const updatedMember = await prisma.member.update({
      where: { id: member_id },
      data: { business_id: business.id },
    });

    res.json(updatedMember);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
