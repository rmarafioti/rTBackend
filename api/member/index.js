// api/member/index.js
const express = require("express");
const router = express.Router();
const prisma = require("../../prisma");

// Fisrt check if the user is a member
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
      const member = res.locals.user;

      const memberData = await prisma.member.findUnique({
        where: { id: member.id },
        include: {
          business: {
            include: {
              businessMember: {
                where: { id: { not: member.id } },
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

    const business = await prisma.business.findUnique({
      where: {
        businessName_code: {
          businessName,
          code,
        },
      },
    });

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
      const member = res.locals.user;
      const { drop_id } = req.params;

      const getDrop = await prisma.drop.findUnique({
        where: { id: +drop_id },
        include: { service: true, paidDrop: true },
      });

      if (!getDrop) {
        return res.status(404).json({ error: "Drop not found" });
      }

      if (!member || getDrop.member_id !== member.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this drop" });
      }
      res.json(getDrop);
    } catch (error) {
      console.error("Error retrieving drop:", error);
      next(error);
    }
  })

  // POST Logged-in member updates a drop AND update totals
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
                  owner: true,
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

      const owner = validDrop?.member?.business?.owner;
      if (!owner) {
        return res
          .status(400)
          .json({ error: "No owner associated with this business." });
      }

      const transaction = await prisma.$transaction(async (prisma) => {
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

        const thisMember = await prisma.member.findUnique({
          where: { id: member.id },
        });

        if (!thisMember) {
          throw new Error("Member not found.");
        }

        let newTotalOwe = Math.max(0, memberOwes - (businessOwes || 0));

        let newTotalOwed = Math.max(0, businessOwes - (memberOwes || 0));

        newTotalOwe = Math.max(0, thisMember.totalOwe + newTotalOwe);
        newTotalOwed = Math.max(0, thisMember.totalOwed + newTotalOwed);

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

        const updatedMemberInfo = await prisma.member.update({
          where: { id: member.id },
          data: {
            takeHomeTotal: thisMember.takeHomeTotal + memberCut,
            totalOwe: newTotalOwe,
            totalOwed: newTotalOwed,
          },
        });

        // Fetch the latest owner data to get takeHomeTotal
        const thisOwner = await prisma.owner.findUnique({
          where: { id: owner.id },
        });

        if (!thisOwner) {
          throw new Error("Owner not found.");
        }

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

      const { memberCut, businessCut, memberOwes, businessOwes } = drop;

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

      const updatedTotalOwe = Math.max(0, currentMember.totalOwe - memberOwes);
      const updatedTotalOwed = Math.max(
        0,
        currentMember.totalOwed - businessOwes
      );

      await prisma.member.update({
        where: { id: member.id },
        data: {
          takeHomeTotal: {
            decrement: memberCut || 0,
          },
          totalOwe: updatedTotalOwe,
          totalOwed: updatedTotalOwed,
        },
      });

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
    const member = res.locals.user;
    const { drop_id } = req.params;
    const {
      description,
      cash = 0,
      credit = 0,
      deposit = 0,
      giftCertAmount = 0,
    } = req.body;

    // Check if drop_id is defined and is an integer
    if (!drop_id || isNaN(parseInt(drop_id))) {
      return res.status(400).json({ error: "Invalid or missing drop ID" });
    }

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

// Fetch all drops for the logged-in member and include member details
router.get("/memberdrops", async (req, res, next) => {
  try {
    const user = res.locals.user;
    const role = res.locals.userRole;

    if (!role || role !== "member") {
      return res
        .status(403)
        .json({ error: "Access forbidden: Not authorized" });
    }

    const drops = await prisma.drop.findMany({
      where: {
        member_id: user.id,
      },
      include: {
        service: true,
        member: true,
      },
    });

    res.json({ drops });
  } catch (error) {
    console.error("Error fetching member drops:", error);
    next(error);
  }
});

module.exports = router;
