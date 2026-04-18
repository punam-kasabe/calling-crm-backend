const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "crm",
});

const users = [
  ["Manisha","user1","user1@zaminwale.com","User@#123","user"],
  ["Nirali","user2","user2@zaminwale.com","User@#124","user"],
  ["Vrushali","user3","user3@zaminwale.com","User@#125","user"],
  ["Swati","user4","user4@zaminwale.com","User@#126","user"],
  ["Prerna Waghmare","user5","user5@zaminwale.com","User@#127","user"],
  ["Zamin","user6","user6@zaminwale.com","User@#128","admin"],
  ["Shaila","user7","user7@zaminwale.com","User@#129","user"],
  ["Jyoti","user8","user8@zaminwale.com","User@#130","user"],
  ["Gautami Bhogale","user9","user9@zaminwale.com","User@#131","user"],
  ["Snehal","user10","user10@zaminwale.com","User@#132","user"],
  ["Mahendra","user11","user11@zaminwale.com","User@#133","user"],
  ["Prerna Kambale","user12","user12@zaminwale.com","User@#134","user"],
  ["Asif Sayyad","asif","asifsayyad@zaminwale.com","Asif@#123","user"],
  ["Shrinivas","shrinivas","shrinivas@zaminwale.com","Shrinivas@#123","user"],
  ["Shalaka Pawar","shalaka","shalaka@zaminwale.com","Shalaka@#555","superadmin"],
  ["Suvarna Khaire","suvarna","suvarna@zaminwale.com","Suvarna@#125","user"],
  ["Ankita","user13","user13@zaminwale.com","User@#1277","user"],
  ["Rakhi","user14","user14@zaminwale.com","User@#1243","user"],
  ["Sheshsnath","user15","user15@zaminwale.com","User@#1252","user"],
];

async function insertUsers() {
  for (let u of users) {
    const hash = await bcrypt.hash(u[3], 10);

    db.query(
      `INSERT INTO users (name, username, email, password, role)
       VALUES (?, ?, ?, ?, ?)`,
      [u[0], u[1], u[2], hash, u[4]],
      (err) => {
        if (err) console.log("Error:", err);
      }
    );

    console.log("Inserted:", u[0]);
  }
}

db.connect(() => {
  console.log("DB Connected ✅");
  insertUsers();
});