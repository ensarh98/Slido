var express = require("express");
var router = express.Router();
var { pool } = require("../config/dbConfig");

router.get("/:code", function (req, res, next) {
  pool.connect(async function (err, client, done) {
    if (err) {
      return res.send(err);
    }
    res.render("code", { title: "Code", code: req.params.code });
    });
});


module.exports = router;
