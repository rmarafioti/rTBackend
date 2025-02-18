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
  // POST Logged-in member can update a drop AND update financial totals
  .post(async (req, res, next) => {
    try {
      const member = res.locals.user;
      const { drop_id } = req.params;
      let { date, total, memberCut, businessCut, memberOwes, businessOwes } =
        req.body;

      const validDrop = await prisma.drop.findUnique({
        where: { id: +drop_id },
        include: {
          member: {
            include: {
              business: {
                include: {
                  owner: true, // ✅ Ensure we retrieve the related owner
                },
              },
            },
          },
        },
      });

      if (!validDrop || validDrop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this drop." });
      }

      date = date ? new Date(date) : null;

      const owner = validDrop?.member?.business?.owner; // ✅ Get the business owner
      if (!owner) {
        return res
          .status(400)
          .json({ error: "No owner associated with this business." });
      }

      const transaction = await prisma.$transaction(async (prisma) => {
        // 1️⃣ Update the drop
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

        // 2️⃣ Fetch the latest member data (ensures latest calculations)
        const thisMember = await prisma.member.findUnique({
          where: { id: member.id },
        });

        if (!thisMember) {
          throw new Error("Member not found.");
        }

        // 3️⃣ Calculate proper adjustments
        let newTotalOwe = Math.max(0, memberOwes - (businessOwes || 0));

        let newTotalOwed = Math.max(0, businessOwes - (memberOwes || 0));

        // 4️⃣ Adjust `totalOwe` and `totalOwed` based on past values
        newTotalOwe = Math.max(0, thisMember.totalOwe + newTotalOwe);
        newTotalOwed = Math.max(0, thisMember.totalOwed + newTotalOwed);

        // 5️⃣ Ensure one balance cancels the other
        if (newTotalOwe > newTotalOwed) {
          newTotalOwe -= newTotalOwed;
          newTotalOwed = 0;
        } else if (newTotalOwed > newTotalOwe) {
          newTotalOwed -= newTotalOwe;
          newTotalOwe = 0;
        } else {
          newTotalOwe = 0;
          newTotalOwed = 0;
        }

        // 6️⃣ Update the member's financial totals
        const updatedMemberInfo = await prisma.member.update({
          where: { id: member.id },
          data: {
            takeHomeTotal: thisMember.takeHomeTotal + memberCut,
            totalOwe: newTotalOwe,
            totalOwed: newTotalOwed,
          },
        });

        // 7️⃣ Fetch the latest owner data to get takeHomeTotal
        const thisOwner = await prisma.owner.findUnique({
          where: { id: owner.id },
        });

        if (!thisOwner) {
          throw new Error("Owner not found.");
        }

        //add something like this
        const updateOwnerInfo = await prisma.owner.update({
          where: { id: owner.id },
          data: {
            takeHomeTotal: thisOwner.takeHomeTotal + businessCut,
          },
        });

        return { updatedDrop, updatedMemberInfo, updateOwnerInfo };
      });

      res.json(transaction);
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

      // Fetch the current financial totals of the member
      const currentMember = await prisma.member.findUnique({
        where: { id: member.id },
        select: { takeHomeTotal: true, totalOwe: true, totalOwed: true },
      });

      if (!currentMember) {
        return res.status(400).json({ error: "Member not found." });
      }

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

      // ✅ Adjust the member's financial totals correctly
      const updatedTotalOwe = Math.max(0, currentMember.totalOwe - memberOwes);
      const updatedTotalOwed = Math.max(
        0,
        currentMember.totalOwed - businessOwes
      );

      await prisma.member.update({
        where: { id: member.id },
        data: {
          takeHomeTotal: {
            decrement: memberCut || 0, // Subtract the member's cut
          },
          totalOwe: updatedTotalOwe, // ✅ Only subtract from totalOwe
          totalOwed: updatedTotalOwed, // ✅ Only subtract from totalOwed
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

router.get("/memberdrops", async (req, res, next) => {
  try {
    const user = res.locals.user; // Get the authenticated user
    const role = res.locals.userRole; // Get the role of the user

    if (!role || role !== "member") {
      return res
        .status(403)
        .json({ error: "Access forbidden: Not authorized" });
    }

    // Fetch all drops for the logged-in member and include member details
    const drops = await prisma.drop.findMany({
      where: {
        member_id: user.id, // Fetch drops for the logged-in member
      },
      include: {
        service: true,
        member: true, // Include the member relationship
      },
    });

    res.json({ drops }); // Return the drops with nested member data
  } catch (error) {
    console.error("Error fetching member drops:", error);
    next(error);
  }
});

module.exports = router;
