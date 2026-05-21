const User = require("../models/User");
const bcrypt = require("bcrypt");

exports.login = async (req, res) => {

  try {

    const { email, password } = req.body;

    // ================= INDIA TIME =================

    const now = new Date();

    const indiaTime = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata"
      })
    );

    const currentHour =
      indiaTime.getHours();

    // ================= FIND USER =================

    const user = await User.findOne({
      email
    });

    if (!user) {

      return res.status(401).json({

        message:
          "User not found ❌"

      });

    }

    // ================= LOGIN TIME =================
    // 10 AM to 7 PM only

    if (

      user.role !== "admin" &&

      (
        currentHour < 10 ||
        currentHour >= 19
      )

    ) {

      return res.status(403).json({

        message:
          "Login allowed only between 10 AM and 7 PM ❌"

      });

    }

    // ================= PASSWORD CHECK =================

    const isMatch = await bcrypt.compare(

      password,
      user.password

    );

    if (!isMatch) {

      return res.status(401).json({

        message:
          "Wrong password ❌"

      });

    }

    // ================= SUCCESS =================

    res.json({

      message:
        "Login success ✅",

      user

    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({

      message:
        "Server error ❌"

    });

  }

};