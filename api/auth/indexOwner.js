const { ServerError } = require("../../errors");
const prisma = require("../../prisma");
const jwt = require("./jwt");
const bcrypt = require("bcrypt");
const router = require("express").Router();
module.exports = router;

/** Creates new account and returns token */
router.post("/register", async (req, res, next) => {
  try {
    const { username, ownerName, password } = req.body;

    // Check if username, ownerName and password provided
    if (!username || !password || !ownerName) {
      throw new ServerError(400, "Username, name, and password required.");
    }

    // Check if account already exists
    const owner = await prisma.owner.findUnique({
      where: { username },
    });
    if (owner) {
      throw new ServerError(
        400,
        `Account with username ${username} already exists.`
      );
    }

    // Hash password before saving to database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new owner
    const newOwner = await prisma.owner.create({
      data: { username, password: hashedPassword, ownerName, takeHomeTotal: 0 },
    });

    const token = jwt.sign({ id: newOwner.id });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

/** Returns token for account if credentials valid */
router.post("/login", async (req, res, next) => {
  try {
    const { username, ownerName, password } = req.body;

    // Check if username, name and password provided
    if (!username || !password || !ownerName) {
      throw new ServerError(400, "Username, name, and password required.");
    }

    // Check if account exists
    const owner = await prisma.owner.findUnique({
      where: { username },
    });
    if (!owner) {
      throw new ServerError(
        400,
        `Account with username ${username} does not exist.`
      );
    }

    // Check if password is correct
    const passwordValid = await bcrypt.compare(password, owner.password);
    if (!passwordValid) {
      throw new ServerError(401, "Invalid password.");
    }

    const token = jwt.sign({ id: owner.id });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
