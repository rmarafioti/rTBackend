// api/member/index.js
const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// Middleware to check if the user is a member
const requireMemberRole = (req, res, next) => {
  if (res.locals.userRole !== "member") {
    return res.status(403).json({ error: "Access forbidden: Members only." });
  }
  next();
};

// GET route to get logged-in member's information
router.get("/", requireMemberRole, async (req, res, next) => {
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
router.post("/business", requireMemberRole, async (req, res, next) => {
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

// logged in member creates a drop
router.post("/createdrop", requireMemberRole, async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    if (!member) {
      return res.status(401).json({ error: "Member not authenticated" });
    }

    const newDrop = await prisma.drop.create({
      data: {
        member: {
          connect: { id: member.id },
        },
        date: null,
        total: 0,
        memberCut: 0,
        businessCut: 0,
        memberOwes: 0,
        businessOwes: 0,
        paid: false,
      },
    });

    res.json(newDrop);
  } catch (e) {
    console.error("Error creating a drop:", e);
    next(e);
  }
});

// logged in member create a service
router.post("/createservice", requireMemberRole, async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    if (!member) {
      return res.status(401).json({ error: "Member not authenticated" });
    }

    const {
      drop_id,
      description,
      cash = 0,
      credit = 0,
      deposit = 0,
      giftCertAmount = 0,
    } = req.body;

    // Ensure the drop exists and belongs to the member
    const drop = await prisma.drop.findUnique({
      where: { id: drop_id },
    });

    if (!drop || drop.member_id !== member.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to add service to this drop." });
    }

    const newService = await prisma.service.create({
      data: {
        drop: {
          connect: { id: drop_id },
        },
        description,
        cash,
        credit,
        deposit,
        giftCertAmount,
      },
    });

    res.json(newService);
  } catch (e) {
    console.error("Error creating a service", e);
    next(e);
  }
});

// logged in member can update a service
router.patch(
  "/updateservice/:service_id",
  requireMemberRole,
  async (req, res, next) => {
    try {
      // Access the member from res.locals, set by the middleware in api/index.js
      const member = res.locals.user;

      if (!member) {
        return res.status(401).json({ error: "Member not authenticated" });
      }

      const { service_id } = req.params; // Get service_id from the route parameter
      const {
        description,
        cash = 0,
        credit = 0,
        deposit = 0,
        giftCertAmount = 0,
      } = req.body;

      // Ensure the drop exists and belongs to the member
      const service = await prisma.service.findUnique({
        where: { id: +service_id },
        include: { drop: true },
      });

      if (!service || service.drop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this service." });
      }

      const updatedService = await prisma.service.update({
        where: { id: +service_id },
        data: {
          description,
          cash,
          credit,
          deposit,
          giftCertAmount,
        },
      });

      res.json(updatedService);
    } catch (e) {
      console.error("Error updating service", e);
      next(e);
    }
  }
);

module.exports = router;
