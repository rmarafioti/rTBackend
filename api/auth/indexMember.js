const { ServerError } = require("../../errors");
const prisma = require("../../prisma");
const jwt = require("./jwt");
const bcrypt = require("bcrypt");
const router = require("express").Router();
module.exports = router;

// Creates new account and returns token
router.post("/register", async (req, res, next) => {
  try {
    const { username, memberName, password, email, phone } = req.body;

    // Check if username, memberName, password, email and phone are provided
    if (!username || !password || !memberName || !email || !phone) {
      throw new ServerError(
        400,
        "Username, name, password, email and phone required."
      );
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
        email,
        phone,
        percentage: 60,
        takeHomeTotal: 0,
        totalOwe: 0,
        totalOwed: 0,
      },
    });

    const token = jwt.sign({ id: newMember.id, role: "member" });
    res.json({ token, role: "member" });
  } catch (err) {
    next(err);
  }
});

// Returns token for account if credentials valid
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
      throw new ServerError(400, "Username and password required.");
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

    // Check if password is correct
    const passwordValid = await bcrypt.compare(password, member.password);
    if (!passwordValid) {
      throw new ServerError(401, "Invalid password.");
    }

    const token = jwt.sign({ id: member.id, role: "member" });
    res.json({ token, role: "member" });
  } catch (err) {
    next(err);
  }
});
