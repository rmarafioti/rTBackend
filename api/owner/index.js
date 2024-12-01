const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// Fisrt check if the user in an owner...
router.use((req, res, next) => {
  if (res.locals.userRole !== "owner") {
    return res.status(403).json({ error: "Access forbidden: Owners only" });
  }
  next();
});

// GET route to get logged-in owner's information
router.get("/", async (req, res, next) => {
  try {
    // Access the owner from res.locals, set by the middleware in api/index.js
    const owner = res.locals.user;

    // Query the database for the owner's details
    const ownerData = await prisma.owner.findUnique({
      where: { id: owner.id },
      include: {
        ownerBusiness: {
          include: {
            businessMember: {
              include: {
                drop: {
                  include: {
                    service: true,
                    paidDrop: true,
                    paidNotice: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Send the owner's information as a response
    res.json(ownerData);
  } catch (error) {
    console.error("Error retrieving owner information:", error);
    next(error);
  }
});

// POST route to create a new business
router.post("/business", async (req, res, next) => {
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

// GET logged-in owner can access members drops by id
router.get("/drops/:drop_id", async (req, res, next) => {
  try {
    const owner = res.locals.user;

    if (!owner) {
      return res.status(401).json({ error: "Owner not authenticated" });
    }

    const { drop_id } = req.params;

    // Fetch the drop and eagerly load related data
    const getDrop = await prisma.drop.findUnique({
      where: { id: +drop_id },
      include: {
        service: true, // Include services for the drop
        member: {
          include: {
            business: true, // Include the business the member belongs to
          },
        },
      },
    });

    // Ensure all relationships are loaded and valid
    if (
      !getDrop ||
      !getDrop.member ||
      !getDrop.member.business ||
      getDrop.member.business.owner_id !== owner.id
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to access this drop" });
    }

    res.json(getDrop);
  } catch (error) {
    console.error("Error retrieving drop:", error);
    next(error);
  }
});

// POST route for an owner to mark a drop as paid and create a paidDrop
router.post("/paydrops", async (req, res, next) => {
  try {
    const owner = res.locals.user;

    if (!owner) {
      return res.status(401).json({ error: "Owner not authenticated" });
    }

    const { payee, paidMessage, amount, dropIds, memberId } = req.body;

    if (!dropIds || dropIds.length === 0) {
      return res.status(400).json({ error: "No drops specified for payment" });
    }

    // Create the paidDrop record
    const paidDrop = await prisma.paidDrop.create({
      data: {
        payee,
        paidMessage,
        amount, // Ensure the amount is correctly passed from the request body
      },
    });

    // Update related drops and mark them as paid
    const updateDrops = await prisma.drop.updateMany({
      where: {
        id: { in: dropIds },
        paid: false,
      },
      data: {
        paid: true,
        paidDrop_id: paidDrop.id,
      },
    });

    // Fetch the member to determine the current totals
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Update the member's totalOwe and totalOwed values
    await prisma.member.update({
      where: { id: memberId },
      data: {
        totalOwe: member.totalOwe === paidDrop.amount ? 0 : member.totalOwe,
        totalOwed: member.totalOwed === paidDrop.amount ? 0 : member.totalOwed,
      },
    });

    res.json({ paidDrop, updatedCount: updateDrops.count });
  } catch (e) {
    console.error("Error creating paid drop:", e);
    next(e);
  }
});

module.exports = router;
