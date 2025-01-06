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

router.get("/memberdrops/:memberId", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const role = res.locals.userRole;
    const { memberId } = req.params;
    console.log("Filtering drops for memberId:", memberId);

    if (!role) {
      return res.status(403).json({ error: "Access forbidden: Invalid role" });
    }

    let drops = [];
    let memberDetails = null;

    if (role === "owner") {
      // Fetch drops for the specific member
      drops = await prisma.drop.findMany({
        where: {
          member_id: parseInt(memberId, 10),
          member: {
            business: {
              owner_id: user.id,
            },
          },
        },
        include: {
          member: true,
          service: true,
        },
      });

      // Fetch member details (name)
      memberDetails = await prisma.member.findUnique({
        where: {
          id: parseInt(memberId, 10),
        },
        select: {
          memberName: true,
        },
      });
    }

    // If no drops found or memberName is missing, fallback
    if (!memberDetails) {
      memberDetails = { memberName: "Unknown Member" };
    }

    res.json({ drops, memberDetails });
  } catch (error) {
    console.error("Error fetching drops by memberId:", error);
    next(error);
  }
});

module.exports = router;
