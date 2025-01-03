const { ServerError } = require("../errors");
const prisma = require("../prisma");
const jwt = require("./auth/jwt");

const router = require("express").Router();
module.exports = router;

// Middleware to attach user or member to res.locals based on token
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // Expect "Bearer <token>"

  if (!authHeader || !token) {
    return next(); // Allow unauthenticated access to public routes
  }

  try {
    const { id, role } = jwt.verify(token); // Decode token and get role
    res.locals.userRole = role;

    // Find the user based on the role
    let user;
    if (role === "owner") {
      user = await prisma.owner.findUnique({ where: { id } });
    } else if (role === "member") {
      user = await prisma.member.findUnique({ where: { id } });
    }

    // Attach the user and role to res.locals if valid
    if (user) {
      res.locals.user = user;
      return next();
    }

    // If no user is found, throw an error
    throw new ServerError(401, "Invalid token.");
  } catch (err) {
    console.error("Token verification error:", err);
    return next(new ServerError(401, "Invalid token."));
  }
});

router.use("/auth", require("./auth"));
router.use("/owner", require("./owner"));
router.use("/member", require("./member"));
router.use("/business", require("./business"));
