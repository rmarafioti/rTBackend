const { ServerError } = require("../../errors");
const prisma = require("../../prisma");
const jwt = require("./jwt");
const bcrypt = require("bcrypt");
const router = require("express").Router();
module.exports = router;

/** Creates new account and returns token */
router.post("/register", async (req, res, next) => {
  try {
    const {
      username,
      memberName,
      password,
      business_businessName,
      business_code,
    } = req.body;

    // Check if username, memberName, password, business name and code are provided
    if (
      !username ||
      !password ||
      !memberName ||
      !business_businessName ||
      business_code
    ) {
      throw new ServerError(
        400,
        "Username, name, business name, code and password required."
      );
    }

    // Check if account already exists
    const owner = await prisma.member.findUnique({
      where: { username },
    });
    if (owner) {
      throw new ServerError(
        400,
        `Account with username ${username} already exists.`
      );
    }

    // Create new owner
    const newMember = await prisma.member.create({
      data: {
        username,
        password,
        memberName,
        business_businessName,
        business_code,
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
    const {
      username,
      memberName,
      password,
      business_businessName,
      business_code,
    } = req.body;

    // Check if username, name, password, business name and code are provided
    if (
      !username ||
      !password ||
      !memberName ||
      business_businessName ||
      business_code
    ) {
      throw new ServerError(
        400,
        "Username, name, password, business name and code required."
      );
    }

    // Check if account exists
    const owner = await prisma.member.findUnique({
      where: { username },
    });
    if (!owner) {
      throw new ServerError(
        400,
        `Account with username ${username} does not exist.`
      );
    }

    // Log passwords for debugging
    console.log("Provided password:", password);
    console.log("Stored hashed password:", owner.password);

    // Check if password is correct
    const passwordValid = await bcrypt.compare(password, member.password);
    if (!passwordValid) {
      throw new ServerError(401, "Invalid password.");
    }

    const token = jwt.sign({ id: owner.id });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});
