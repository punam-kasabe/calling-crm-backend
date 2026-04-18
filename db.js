const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "crm"
});

db.connect((err) => {
  if (err) {
    console.error("DB connection failed ❌", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});

module.exports = db;