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

// PATCH route to update a members percentage
router.patch("/updatepercentage", async (req, res, next) => {
  try {
    const owner = res.locals.user;

    if (!owner) {
      return res.status(401).json({ error: "Owner not authenticated" });
    }

    const { memberId, percentage } = req.body;

    if (!memberId || typeof percentage !== "number") {
      return res
        .status(400)
        .json({ error: "Invalid member ID or percentage value" });
    }

    // Fetch the member to update their percentage
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        business: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!member || member.business.owner_id !== owner.id) {
      return res.status(403).json({
        error: "Not authorized to update this member's percentage",
      });
    }

    const updatedPercentage = await prisma.member.update({
      where: { id: +memberId },
      data: {
        percentage: percentage,
      },
    });

    res.json(updatedPercentage);
  } catch (error) {
    console.error("Error updating member's percentage:", error);
    next(error);
  }
});

// GET logged-in owner can access all member drops sorted by year and month
router.get("/drops/:year/:month/:memberId", async (req, res, next) => {
  try {
    const owner = res.locals.user;

    if (!owner) {
      return res.status(401).json({ error: "Owner not authenticated" });
    }

    const { year, month, memberId } = req.params;

    // Validate year and month
    const yearInt = parseInt(year, 10);
    const monthInt = parseInt(month, 10);

    if (isNaN(yearInt) || yearInt < 2000 || yearInt > 2100) {
      return res.status(400).json({ error: "Invalid year parameter" });
    }

    if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).json({ error: "Invalid month parameter" });
    }

    // Fetch the member by their ID
    const member = await prisma.member.findUnique({
      where: { id: +memberId },
      include: {
        business: true, // Include the business the member belongs to
      },
    });

    // Ensure the member exists and is part of the owner's business
    if (!member || member.business?.owner_id !== owner.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to access this member's drops" });
    }

    // Calculate start and end dates for the month
    const startDate = new Date(
      `${yearInt}-${monthInt.toString().padStart(2, "0")}-01`
    );
    const endDate = new Date(
      `${yearInt}-${monthInt.toString().padStart(2, "0")}-31`
    );

    // Fetch drops for the member within the specified date range
    const drops = await prisma.drop.findMany({
      where: {
        member_id: +memberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true, // Include related services
      },
    });

    // If no drops are found, return a 404 error
    if (!drops || drops.length === 0) {
      return res
        .status(404)
        .json({ error: "No drops found for the given member and date range" });
    }

    // Generate the month name
    const monthName = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(new Date(yearInt, monthInt - 1, 1));

    // Return the drops along with the member name and month name
    res.json({
      member: member.memberName,
      drops,
      month: monthName,
      year: yearInt,
    });
  } catch (error) {
    console.error("Error retrieving drops:", error);
    next(error);
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
        service: true,
        paidDrop: true, // Include services for the drop
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
