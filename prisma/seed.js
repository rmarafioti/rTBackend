const prisma = require("../prisma");

//here is where we will seed our database

//seed owners

const { owners } = require("./seedData.js");

const seed = async () => {
  //loop through each user in seed data to seed database create test owners
  for (let i = 0; i < owners.length; i++) {
    const data = owners[i];
    await prisma.owner.upsert({
      where: { username: data.username },
      update: {},
      create: data,
    });
  }
};

seed()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
