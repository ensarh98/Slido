const { Router } = require("express");
var router = Router();

router.get("/", function (req, res, next) {
  res.render("index", { title: "Dashboard" });
});

router.get("/logout", (req, res) => {
  req.logout(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/?success=" + encodeURIComponent("logout"));
  });
});

module.exports = router;
