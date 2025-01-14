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

// router.route for /member
router
  .route("/")
  // GET logged-in member's information
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
  // POST Logged-in member updates their member info when a drop is submitted
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
      const member = res.locals.user; // Assumes middleware sets this
      const { drop_id } = req.params;

      // Fetch the drop from the database
      const getDrop = await prisma.drop.findUnique({
        where: { id: +drop_id },
        include: { service: true, paidDrop: true },
      });

      if (!getDrop) {
        return res.status(404).json({ error: "Drop not found" });
      }

      // Ensure the user is authorized to access this drop
      if (!member || getDrop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this drop" });
      }

      // Return the drop details
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

      if (businessCut) {
        const business = await prisma.business.findUnique({
          where: { id: member.business_id },
          include: { owner: true },
        });

        if (!business || !business.owner) {
          console.error("Business or owner not found");
          return res
            .status(404)
            .json({ error: "Business or owner not found." });
        }

        const owner = business.owner;

        const updatedOwner = await prisma.owner.update({
          where: { id: owner.id },
          data: {
            takeHomeTotal: owner.takeHomeTotal + +businessCut,
          },
        });
      }

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

      // Fetch the drop to verify ownership and get related data
      const drop = await prisma.drop.findUnique({
        where: { id: +drop_id },
        include: {
          member: {
            include: {
              business: {
                include: { owner: true },
              },
            },
          },
        },
      });

      if (!drop || drop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this drop" });
      }

      // Extract values from the drop
      const { memberCut, businessCut, memberOwes, businessOwes } = drop;

      // Adjust the business owner's takeHomeTotal if businessCut exists
      if (businessCut && drop.member.business?.owner) {
        const owner = drop.member.business.owner;

        await prisma.owner.update({
          where: { id: owner.id },
          data: {
            takeHomeTotal: owner.takeHomeTotal - businessCut,
          },
        });
      }

      // Adjust the member's financial totals
      await prisma.member.update({
        where: { id: member.id },
        data: {
          takeHomeTotal: {
            decrement: memberCut || 0, // Subtract the member's cut
          },
          totalOwe: {
            decrement: memberOwes || 0, // Subtract member's owe amount
          },
          totalOwed: {
            decrement: businessOwes || 0, // Subtract the owed amount to the member
          },
        },
      });

      // Delete the drop
      const deleteDrop = await prisma.drop.delete({
        where: { id: +drop_id },
      });

      res.json(deleteDrop);
    } catch (e) {
      console.error("Error deleting drop", e);
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

// Route to get all drops for a logged-in member
router.get("/memberdrops", async (req, res, next) => {
  try {
    const user = res.locals.user; // Get the authenticated user
    const role = res.locals.userRole; // Get the role of the user

    console.log("User Role:", role);
    console.log("Authenticated User:", user);

    if (!role || role !== "member") {
      return res
        .status(403)
        .json({ error: "Access forbidden: Not authorized" });
    }

    // Fetch all drops for the logged-in member
    const drops = await prisma.drop.findMany({
      where: {
        member_id: user.id, // Get drops only for the logged-in member
      },
      include: {
        service: true,
      },
    });

    res.json({ drops }); // Return the drops
  } catch (error) {
    console.error("Error fetching member drops:", error);
    next(error);
  }
});

module.exports = router;
