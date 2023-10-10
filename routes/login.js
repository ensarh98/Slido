const { Router } = require("express");
var router = Router();
const passport = require("passport");

router.post(
  "/",
  passport.authenticate("local", {
    successRedirect: "/dashboard/lectures",
    failureRedirect: "/",
    failureFlash: true,
  })
);

module.exports = router;
