const { ServerError } = require("../../errors");
const prisma = require("../../prisma");
const jwt = require("./jwt");
const bcrypt = require("bcrypt");
const router = require("express").Router();
module.exports = router;

/** Creates new account and returns token */
router.post("/register", async (req, res, next) => {
  try {
    const { username, memberName, password } = req.body;

    // Check if username, memberName, and password are provided
    if (!username || !password || !memberName) {
      throw new ServerError(400, "Username, name, and password required.");
    }

    // Check if account already exists
    const member = await prisma.member.findUnique({
      where: { username },
    });
    if (member) {
      throw new ServerError(
        400,
        `Account with username ${username} already exists.`
      );
    }

    // Create new member
    const newMember = await prisma.member.create({
      data: {
        username,
        password,
        memberName,
      },
    });

    const token = jwt.sign({ id: newMember.id });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

/** Returns token for account if credentials valid */
router.post("/login", async (req, res, next) => {
  try {
    const { username, memberName, password } = req.body;

    // Check if username, name, password are provided
    if (!username || !password || !memberName) {
      throw new ServerError(400, "Username, name, password required.");
    }

    // Check if account exists
    const member = await prisma.member.findUnique({
      where: { username },
    });
    if (!member) {
      throw new ServerError(
        400,
        `Account with username ${username} does not exist.`
      );
    }

    // Log passwords for debugging
    console.log("Provided password:", password);
    console.log("Stored hashed password:", member.password);

    // Check if password is correct
    const passwordValid = await bcrypt.compare(password, member.password);
    if (!passwordValid) {
      throw new ServerError(401, "Invalid password.");
    }

    const token = jwt.sign({ id: member.id });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
