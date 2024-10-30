const prisma = require("../../prisma");
const router = require("express").Router();
module.exports = router;

// GET to check the logged-in member
router.get("/me", async (req, res, next) => {
  console.log("Authenticated user:", res.locals.user);

  try {
    // Ensure the user is authenticated and available in res.locals.user
    const { businessName, code } = req.body;
    if (!res.locals.user) {
      return next({
        status: 401,
        message: "You are not logged in or do not have access",
      });
    }
    res.json();
  } catch (error) {
    next(error); // Forward errors to the error-handling middleware
  }
});

// Post route to create member info
// need to update schema for onboarding which asks to create email and phone contact info for each user.
/*router.post("/memberinfo", async (req, res, next) => {
  console.log("Authenticated user:", res.locals.user);

  try {
    const { id: owner_id } = res.locals.user;
    const { businessName, code } = req.body;

    const newMemberInfo = await prisma.business.create({
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
*/
