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

// Fisrt check if the user in an owner...
router.use((req, res, next) => {
  const userRole = res.locals.userRole;

  if (userRole !== "member" && userRole !== "owner") {
    return res
      .status(403)
      .json({ error: "Access forbidden: Owners and Members only" });
  }

  next();
});

//use this route for the archive month feature
// GET Owner can access all member drops for a specific year by id / member can access their drops for a specific year by id
router.get("/drops/:year/:memberId", async (req, res, next) => {
  try {
    const user = res.locals.user; // Retrieve the authenticated user
    const { year, memberId } = req.params;
    const yearInt = parseInt(year, 10);

    // Validate the year parameter
    if (isNaN(yearInt) || yearInt < 2000 || yearInt > 2100) {
      return res.status(400).json({ error: "Invalid year parameter" });
    }

    // Fetch the drops based on the user's role
    let drops;

    if (user.role === "owner") {
      // Fetch the member to validate their business belongs to the owner
      const member = await prisma.member.findUnique({
        where: { id: +memberId },
        include: {
          business: true,
        },
      });

      if (!member || member.business?.owner_id !== user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this member's drops" });
      }

      // Fetch all drops for the member within the year
      drops = await prisma.drop.findMany({
        where: {
          member_id: +memberId,
          date: {
            gte: new Date(`${yearInt}-01-01`),
            lte: new Date(`${yearInt}-12-31`),
          },
        },
        include: {
          service: true,
        },
      });
    } else if (user.role === "member") {
      // Members can only access their own drops
      if (+memberId !== user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to access other members' drops" });
      }

      // Fetch all drops for the authenticated member within the year
      drops = await prisma.drop.findMany({
        where: {
          member_id: user.id,
          date: {
            gte: new Date(`${yearInt}-01-01`),
            lte: new Date(`${yearInt}-12-31`),
          },
        },
        include: {
          service: true,
        },
      });
    } else {
      return res.status(403).json({ error: "Access forbidden" });
    }

    res.json({ drops, year: yearInt });
  } catch (error) {
    console.error("Error retrieving drops:", error);
    next(error);
  }
});

//use is route for the member drop feature
// GET logged-in owner can access members drops by id / member can access their drops by id.
router.get("/drops/:drop_id", async (req, res, next) => {
  try {
    const user = res.locals.user; // Retrieve the authenticated user
    const { drop_id } = req.params;

    // Fetch the drop and eagerly load related data
    const getDrop = await prisma.drop.findUnique({
      where: { id: +drop_id },
      include: {
        service: true,
        paidDrop: true,
        member: {
          include: {
            business: true, // Include the business the member belongs to
          },
        },
      },
    });

    // Ensure the drop exists
    if (!getDrop) {
      return res.status(404).json({ error: "Drop not found" });
    }

    // Authorization logic
    if (user.role === "owner") {
      // Owners can access if they own the business linked to the drop
      if (
        !getDrop.member ||
        !getDrop.member.business ||
        getDrop.member.business.owner_id !== user.id
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this drop" });
      }
    } else if (user.role === "member") {
      // Members can access if they created the drop
      if (getDrop.member_id !== user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this drop" });
      }
    }

    // Respond with the drop data
    res.json(getDrop);
  } catch (error) {
    console.error("Error retrieving drop:", error);
    next(error);
  }
});

module.exports = router;
