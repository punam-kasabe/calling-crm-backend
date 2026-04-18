const bcrypt = require("bcrypt");

const users = [
  { email: "user1@zaminwale.com", password: "User@#123" },
  { email: "user2@zaminwale.com", password: "User@#124" },
  { email: "user3@zaminwale.com", password: "User@#125" },
  { email: "user4@zaminwale.com", password: "User@#126" },
  { email: "user5@zaminwale.com", password: "User@#127" },
  { email: "user6@zaminwale.com", password: "User@#128" },
  { email: "shalaka@zaminwale.com", password: "Shalaka@#555" }
];

async function run() {
  for (let u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    console.log(`${u.email} => ${hash}`);
  }
}

run();