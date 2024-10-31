const prisma = require("../../prisma");
const router = require("express").Router();
module.exports = router;

// GET to check the logged-in member
router.get("/me", async (req, res, next) => {
  console.log("Authenticated user:", res.locals.user);

  try {
    if (!res.locals.user) {
      return next({
        status: 401,
        message: "You are not logged in or do not have access",
      });
    }

    const { id } = res.locals.user;

    // Fetch the member's details along with their linked business, if any
    const memberWithBusiness = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        memberName: true,
        email: true,
        phone: true,
        business: true, // Include linked business if needed
      },
    });

    if (!memberWithBusiness) {
      return next({
        status: 404,
        message: `No member found with ID ${id}`,
      });
    }

    res.json(memberWithBusiness);
  } catch (error) {
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

    //if business is not found throw an error
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    //link member to a business by setting the business id to the members table
    const updatedMember = await prisma.member.update({
      where: { id: member_id },
      data: { business_id: business.id },
    });

    res.json(updatedMember);
  } catch (e) {
    next(e);
  }
});
