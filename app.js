var createError = require("http-errors");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");
const initializePassport = require("./config/passportConfig");
var bodyParser = require("body-parser");

var indexRouter = require("./routes/index");
var loginRouter = require("./routes/login");
var registerRouter = require("./routes/register");
var dashboardRouter = require("./routes/dashboard");
var codeRouter = require("./routes/code");
var publicRouter = require("./routes/public");

require("dotenv").config();
var express = require("express");
var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    extended: false,
    limit: "50mb",
  })
);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 14400000 },
  })
);

initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use("/", indexRouter);
app.use("/login", loginRouter);
app.use("/register", registerRouter);
app.use("/dashboard", dashboardRouter);
app.use("/code", codeRouter);
app.use("/public", publicRouter);

app.set("views", path.join(__dirname, "views"));

app.set("view engine", "ejs");
app.disable("etag");

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server radi na portu ${port}`);
});

module.exports = app;
