// api/member/index.js
const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// Fisrt check if the user in an member...
router.use((req, res, next) => {
  if (res.locals.userRole !== "member") {
    return res.status(403).json({ error: "Access forbidden: Members only" });
  }
  next();
});

// GET route to get logged-in member's information
router
  .route("/")
  .get(async (req, res, next) => {
    try {
      // Access the member from res.locals, set by the middleware in api/index.js
      const member = res.locals.user;

      // Query the database for the member's details
      const memberData = await prisma.member.findUnique({
        where: { id: member.id },
        include: {
          business: {
            include: {
              businessMember: {
                where: { id: { not: member.id } }, // Exclude the logged-in member from the team list
              },
            },
          },
          drop: {
            include: {
              service: true,
              paidDrop: true,
              paidNotice: true,
            },
          },
        },
      });

      if (!memberData) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Send the member's information as a response
      res.json(memberData);
    } catch (error) {
      console.error("Error retrieving member information:", error);
      next(error);
    }
  })
  // Logged in member updates there member info when a drop is submitted
  .post(async (req, res, next) => {
    try {
      const member = res.locals.user;

      const { memberCut, memberOwes, businessOwes } = req.body;

      // Fetch the latest member data from the database
      const thisMember = await prisma.member.findUnique({
        where: { id: member.id },
      });

      if (!thisMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      const updatedMemberInfo = await prisma.member.update({
        where: { id: member.id },
        data: {
          takeHomeTotal: member.takeHomeTotal + +memberCut,
          totalOwe: member.totalOwe + +memberOwes,
          totalOwed: member.totalOwed + +businessOwes,
        },
      });

      if (!updatedMemberInfo) {
        return next({
          status: 401,
          message: "Update invalid, please try again",
        });
      }

      res.json(updatedMemberInfo);
    } catch (error) {
      console.error("Error updating member information:", error);
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

    // If business is not found throw an error
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Link member to a business by setting the business id to the members table
    const updatedMember = await prisma.member.update({
      where: { id: member_id },
      data: { business_id: business.id },
    });

    res.json(updatedMember);
  } catch (e) {
    next(e);
  }
});

// POST Logged-in member creates a drop
router.post("/createdrop", async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    const newDrop = await prisma.drop.create({
      data: {
        member: {
          connect: { id: member.id },
        },
        date: null,
        total: 0,
        memberCut: 0,
        businessCut: 0,
        memberOwes: 0,
        businessOwes: 0,
        paid: false,
      },
    });

    res.json(newDrop);
  } catch (e) {
    console.error("Error creating a drop:", e);
    next(e);
  }
});

// router.route for /drops by ID
router
  .route("/drops/:drop_id")
  // GET Logged-in member gets drops by ID
  .get(async (req, res, next) => {
    try {
      const user = res.locals.user;
      const { drop_id } = req.params;

      const getDrop = await prisma.drop.findUnique({
        where: { id: +drop_id },
        include: { service: true },
      });

      if (!getDrop) {
        return res.status(403).json({ error: "Drop not found" });
      }

      // If the user is a member, ensure they can only access their own drops
      if (user.role === "member" && getDrop.member_id !== user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this drop" });
      }

      // Send only the services as a response
      res.json(getDrop);
    } catch (error) {
      console.error("Error retrieving drop:", error);
      next(error);
    }
  })
  // POST Logged-in member can update a drop
  .post(async (req, res, next) => {
    try {
      const member = res.locals.user;
      const { drop_id } = req.params;
      let { date, total, memberCut, businessCut, memberOwes, businessOwes } =
        req.body;

      const validDrop = await prisma.drop.findUnique({
        where: { id: +drop_id },
      });

      if (!validDrop || validDrop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this drop." });
      }

      // Parse date string to a Date object
      date = date ? new Date(date) : null;

      const updatedDrop = await prisma.drop.update({
        where: { id: +drop_id },
        data: {
          date,
          total,
          memberCut,
          businessCut,
          memberOwes,
          businessOwes,
        },
      });

      // Send only the services as a response
      res.json(updatedDrop);
    } catch (error) {
      console.error("Error updating drop:", error);
      next(error);
    }
  })
  // DELETE Logged-in member can delete a drop
  .delete(async (req, res, next) => {
    try {
      const member = res.locals.user;
      const { drop_id } = req.params;
      console.log("Received drop_id:", drop_id); // Debugging log

      const drop = await prisma.drop.findUnique({
        where: { id: +drop_id },
        include: { service: true },
      });

      if (!drop || drop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this drop" });
      }

      const deleteDrop = await prisma.drop.delete({
        where: { id: +drop_id },
      });

      res.json(deleteDrop);
    } catch (e) {
      console.error("Error deleting drop", e);
      next(e);
    }
  });

// GET Logged-in member gets all paid drops
router.get("/getpaiddrops", async (req, res, next) => {
  try {
    const member = res.locals.user;

    const paidDrops = await prisma.drop.findMany({
      where: {
        member_id: member.id,
        paid: true,
      },
      include: {
        service: true,
      },
    });

    if (!paidDrops.length === 0) {
      return res.status(403).json({ error: "No paid drops found" });
    }

    res.json(paidDrops);
  } catch (e) {
    console.error("Error getting drops:", e);
    next(e);
  }
});

// POST Logged-in member create a service
router.post("/createservice/:drop_id", async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    const { drop_id } = req.params; // Get drop_id from URL params
    const {
      description,
      cash = 0,
      credit = 0,
      deposit = 0,
      giftCertAmount = 0,
    } = req.body;

    // Log the received drop_id for debugging
    console.log("Received drop_id:", drop_id);

    // Check if drop_id is defined and is an integer
    if (!drop_id || isNaN(parseInt(drop_id))) {
      return res.status(400).json({ error: "Invalid or missing drop ID" });
    }

    // Ensure the drop exists and belongs to the member
    const drop = await prisma.drop.findUnique({
      where: { id: +drop_id },
    });

    if (!drop || drop.member_id !== member.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to add service to this drop." });
    }

    const newService = await prisma.service.create({
      data: {
        drop: {
          connect: { id: +drop_id },
        },
        description,
        cash,
        credit,
        deposit,
        giftCertAmount,
      },
    });

    res.json(newService);
  } catch (e) {
    console.error("Error creating a service:", e);
    next(e);
  }
});

// CHECK: PATCH route to update owner/business take home total
//CAN THIS BE INCORPORATED INTO ANOTHER ROUTE?
router.patch("/businesstotalupdate", async (req, res, next) => {
  try {
    const member = res.locals.user;

    const { businessCut } = req.body;

    if (!businessCut) {
      return res.status(400).json({ error: "Missing businessCut" });
    }

    // Fetch the latest member data from the database
    const business = await prisma.business.findUnique({
      where: { id: member.business_id },
      include: { owner: true },
    });

    if (!business || !business.owner) {
      return res.status(404).json({ error: "Business or owner not found" });
    }

    const owner = business.owner;

    const updateBusinessTotal = await prisma.owner.update({
      where: { id: owner.id },
      data: {
        takeHomeTotal: owner.takeHomeTotal + +businessCut,
      },
    });

    res.json(updateBusinessTotal);
  } catch (e) {
    next(e);
  }
});

// POST Logged-in member can create a paid notice
router.post("/paynotice", async (req, res, next) => {
  try {
    const member = res.locals.user;

    const { payee, paidMessage, amount, dropIds } = req.body;

    if (!dropIds || dropIds.length === 0) {
      return res
        .status(400)
        .json({ error: "No drops specified for payment notice" });
    }

    const payNotice = await prisma.paidNotice.create({
      data: {
        payee,
        paidMessage,
        amount,
      },
    });

    await prisma.drop.updateMany({
      where: {
        id: { in: dropIds },
        paid: false,
      },
      data: {
        paidNotice_id: payNotice.id,
      },
    });

    res.json({ payNotice });
  } catch (e) {
    console.error("Error sending payment notice");
    next(e);
  }
});

module.exports = router;
