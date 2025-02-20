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

router.use((req, res, next) => {
  const userRole = res.locals.userRole;

  if (userRole !== "member" && userRole !== "owner") {
    return res
      .status(403)
      .json({ error: "Access forbidden: Owners and Members only" });
  }
  next();
});

// GET logged-in owner can access members drops by id / member can access their drops by id.
router.get("/drops/:drop_id", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const { drop_id } = req.params;

    const getDrop = await prisma.drop.findUnique({
      where: { id: +drop_id },
      include: {
        service: true,
        paidDrop: true,
        member: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!getDrop) {
      return res.status(404).json({ error: "Drop not found" });
    }

    if (user.role === "owner") {
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
    res.json(getDrop);
  } catch (error) {
    console.error("Error retrieving drop:", error);
    next(error);
  }
});

module.exports = router;
