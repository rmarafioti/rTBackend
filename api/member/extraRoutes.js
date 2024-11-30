// NOT CURRENTLY USING THIS ROUTE: Logged-in member can get all services by drop ID

/*router.get("/allservices/:drop_id", async (req, res, next) => {
  try {
    const member = res.locals.user;

    const { drop_id } = req.params;

    // Query the database for services linked to the specified drop_id
    const dropWithServices = await prisma.drop.findUnique({
      where: { id: +drop_id },
      include: {
        service: true, // Ensure `services` is the correct relation name
      },
    });

    if (!dropWithServices) {
      return res.status(404).json({ error: "No services found for this drop" });
    }

    // Send only the services as a response
    res.json(dropWithServices.service);
  } catch (error) {
    console.error("Error retrieving services:", error);
    next(error);
  }
});*/

// NOT CURRENTLY USING THIS ROUTE: logged in member can update a service

/*router.patch("/updateservice/:service_id", async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    const { service_id } = req.params; // Get service_id from the route parameter
    const {
      description,
      cash = 0,
      credit = 0,
      deposit = 0,
      giftCertAmount = 0,
    } = req.body;

    // Ensure the drop exists and belongs to the member
    const service = await prisma.service.findUnique({
      where: { id: +service_id },
      include: { drop: true },
    });

    if (!service || service.drop.member_id !== member.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this service." });
    }

    const updatedService = await prisma.service.update({
      where: { id: +service_id },
      data: {
        description,
        cash,
        credit,
        deposit,
        giftCertAmount,
      },
    });

    res.json(updatedService);
  } catch (e) {
    console.error("Error updating service", e);
    next(e);
  }
});*/

// NOT CURRENTLY USING THIS ROUTE: logged in member can delete a service

/*router.delete("/deleteservice/:service_id", async (req, res, next) => {
  try {
    // Access the member from res.locals, set by the middleware in api/index.js
    const member = res.locals.user;

    const { service_id } = req.params; // Get service_id from the route parameter

    // Ensure the drop exists and belongs to the member
    const service = await prisma.service.findUnique({
      where: { id: +service_id },
      include: { drop: true },
    });

    if (!service || service.drop.member_id !== member.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this service." });
    }

    const deleteService = await prisma.service.delete({
      where: { id: +service_id },
    });

    res.json(deleteService);
  } catch (e) {
    console.error("Error deleting service", e);
    next(e);
  }
});*/
