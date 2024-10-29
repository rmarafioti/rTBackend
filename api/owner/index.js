const prisma = require("../../prisma");
const router = require("express").Router();
module.exports = router;

// GET to check the logged-in user
router.get("/me", async (req, res, next) => {
  console.log("Authenticated user:", res.locals.user);

  try {
    // Ensure the user is authenticated and available in res.locals.user
    if (!res.locals.user) {
      return next({
        status: 401,
        message: "You are not logged in or do not have access",
      });
    }

    const { id } = res.locals.user;

    // Fetch the owner's details along with their businesses
    const ownerWithBusiness = await prisma.owner.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        ownerName: true,
        ownerBusiness: true, // Include linked businesses
      },
    });

    // If the owner is not found, send a 404 error
    if (!ownerWithBusiness) {
      return next({
        status: 404,
        message: `No owner found with ID ${id}`,
      });
    }

    // Respond with the owner details, including any linked businesses
    res.json(ownerWithBusiness);
  } catch (error) {
    next(error); // Forward errors to the error-handling middleware
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
