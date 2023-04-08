var express = require("express");
var router = express.Router();
var { pool } = require("../config/dbConfig");
const bcrypt = require("bcrypt");

router.post("/", function (req, res, next) {
  pool.connect(async function (err, client, done) {
    if (err) {
      return res.send(err);
    }
    let errors = [];
    let {
      firstName,
      lastName,
      address,
      city,
      country,
      birthDate,
      password,
      email,
      confirmPassword,
    } = req.body;

    if (password.length < 6) {
      errors.push({ message: "Password should be at least 6 characters" });
    }

    if (password !== confirmPassword) {
      errors.push({ message: "Passwords do not match." });
    }

    if (errors.length > 0) {
      res.render("index", { errors: errors });
    } else {
      hashedPassword = await bcrypt.hash(password, 10);
      pool.query(
        `SELECT * from users WHERE email=$1`,
        [email],
        (err, result) => {
          if (err) {
            return res.send(err.stack);
          }

          if (result.rowCount > 0) {
            errors.push({ message: "Email already registered" });
            res.render("index", { errors: errors });
          } else {
            pool.query(
              `SELECT * from users WHERE email=$1`,
              [email],
              (err, result) => {
                if (err) {
                  return res.send(err.stack);
                }

                if (result.rowCount > 0) {
                  errors.push({ message: "E-mail is used." });
                  res.render("index", { errors: errors });
                } else {
                  // Validation passed
                  client.query(
                    `INSERT INTO users (first_name, last_name, address, city, country, birth_date, password, email, is_lecturer)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id, password`,
                    [
                      firstName,
                      lastName,
                      address,
                      city,
                      country,
                      birthDate,
                      hashedPassword,
                      email,
                    ],
                    (err, result) => {
                      if (err) {
                        return res.send(err.stack);
                      }
                      req.flash(
                        "success_msg",
                        "You are now registered. Please log in."
                      );
                      res.redirect("/");
                    }
                  );
                }
              }
            );
          }
        }
      );
    }
  });
});

module.exports = router;
