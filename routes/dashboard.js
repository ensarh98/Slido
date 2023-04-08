var express = require("express");
var router = express.Router();
var { pool } = require("../config/dbConfig");
var moment = require("moment");
var multer = require("multer");
var path = require("path");
var fs = require("fs");

var schedule = require("node-schedule");

const DATE_FORMAT = "DD.MM.YYYY";
const DATETIME_FORMAT = "DD.MM.YYYY HH:mm:ss";

function lecturesMapper(lectures) {
  return (lectures || []).map((lecture) => {
    return {
      ...lecture,
      start_date: lecture.start_date
        ? moment(lecture.start_date).format(DATE_FORMAT)
        : undefined,
      end_date: lecture.end_date
        ? moment(lecture.end_date).format(DATE_FORMAT)
        : undefined,
      start_date_value: lecture.start_date,
      end_date_value: lecture.end_date,
    };
  });
}

var admin = {
  getLectures: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      let userId = req.user.id;
      let isAdmin = req.user.is_admin;
      let isLecturer = req.user.is_lecturer;
      client.query(
        `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as lecturer 
      FROM lectures l JOIN users u ON u.id = l.lecturer_id 
      ORDER BY l.start_date DESC`,
        [],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.render("dashboard", {
              lectures: lecturesMapper(result.rows).filter((lecture) =>
                isLecturer && !isAdmin ? lecture.lecturer_id === userId : true
              ),
              user: req.user.email,
              isAdmin: req.user.is_admin,
              title: "Lectures",
            });
          }
        }
      );
    });
  },
  getLecture: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(
        `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as lecturer 
      FROM lectures l JOIN users u ON u.id = l.lecturer_id 
      WHERE l.id = $1`,
        [req.params.id],
        function (err, result) {
          if (err) {
            return res.send(err.stack);
          } else {
            var lecture = lecturesMapper(result.rows)[0];
            req.lecture = lecture;
            next();
          }
        }
      );
    });
  },
  getScheduledLectures: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(
        `SELECT sl.*, 
        (select count(*) as number_marks from lecture_guests lg where lg.scheduled_lecture_id = sl.id and lg.mark is not null) as number_marks,
        (select SUM(lg.mark) as sum_marks from lecture_guests lg where lg.scheduled_lecture_id = sl.id and lg.mark is not null) as sum_marks
        FROM scheduled_lectures sl WHERE sl.lecture_id = $1 and sl.is_valid = true`,
        [req.params.id],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            var scheduledLectures =
              result.rows.length > 0
                ? result.rows.map((row) => {
                    return {
                      id: row.id,
                      lecture_date_time: moment(row.lecture_date_time).format(
                        DATETIME_FORMAT
                      ),
                      average_rating:
                        row.number_marks > 0
                          ? (row.sum_marks / row.number_marks).toFixed(2)
                          : "unrated",
                    };
                  })
                : undefined;
            req.scheduledLectures = scheduledLectures;
            next();
          }
        }
      );
    });
  },
  deleteScheduledLecture: function (req, res, next) {
    pool.connect(function (err, client, done) {
      let { id, scheduledLectureId } = req.params;
      if (err) {
        return res.send(err);
      }
      client.query(
        `UPDATE scheduled_lectures SET is_valid = false WHERE id = $1`,
        [scheduledLectureId],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            req.flash(
              "success_msg",
              "Scheduled lectures has been successfully deleted."
            );
            res.redirect("/dashboard/lectures/" + id);
          }
        }
      );
    });
  },
  getQuestions: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(
        `SELECT lq.*, lg.guest_username as guest FROM lecture_questions lq JOIN lecture_guests lg ON lg.id = lq.lecture_guest_id 
        ORDER BY lq.likes DESC`,
        [],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            var lectureQuestions =
              result.rows.length > 0
                ? result.rows.map((row) => {
                    return {
                      ...row,
                      date: moment(row.date).format(DATETIME_FORMAT),
                      is_hidden: row.is_hidden ? "ok" : "remove",
                      is_answered: row.is_answered ? "ok" : "remove",
                      is_hidden_value: row.is_hidden,
                      is_answered_value: row.is_answered,
                    };
                  })
                : undefined;
            var scheduledLectures = req.scheduledLectures?.map((lecture) => {
              var questions = lectureQuestions?.filter(
                (item) => item.scheduled_lecture_id === lecture.id
              );
              lecture.questions = questions;
              lecture.totalQuestions = questions?.length || 0;
              var answeredQuestions = questions?.filter(
                (item) => item.is_answered_value === true
              )?.length;
              var answeredQuestionsPct = answeredQuestions
                ? (answeredQuestions / questions.length) * 100
                : 0;
              var unansweredQuestions = questions?.filter(
                (item) => item.is_answered_value === false
              )?.length;
              var hiddenQuestions = questions?.filter(
                (item) => item.is_hidden_value === true
              )?.length;
              var unansweredQuestionsPct = unansweredQuestions
                ? (unansweredQuestions / questions.length) * 100
                : 0;
              lecture.answeredQuestionsPct = answeredQuestionsPct.toFixed(2);
              lecture.unansweredQuestionsPct =
                unansweredQuestionsPct.toFixed(2);
              lecture.totalHidden = hiddenQuestions || 0;
              return lecture;
            });
            res.render("dashboard", {
              lecture: req.lecture,
              scheduledLectures: scheduledLectures,
              user: req.user.email,
              isAdmin: req.user.is_admin,
              title: "Lecture - " + req.lecture.name,
            });
          }
        }
      );
    });
  },
  getUsers: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(
        `SELECT id, first_name, last_name, address, city, country, birth_date, email, is_admin, is_lecturer, banned_until FROM users WHERE is_valid = true;`,
        [],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.render("dashboard", {
              users: result.rows.map((user) => {
                return {
                  ...user,
                  birth_date: user.birth_date
                    ? moment(user.birth_date).format(DATE_FORMAT)
                    : undefined,
                  birth_date_value: user.birth_date,
                  is_admin: user.is_admin ? "ok" : "remove",
                  is_lecturer: user.is_lecturer ? "ok" : "remove",
                  banned_until: user.banned_until
                    ? moment(user.banned_until).format(DATETIME_FORMAT)
                    : undefined,
                };
              }),
              user: req.user.email,
              isAdmin: req.user.is_admin,
              title: "Users",
            });
          }
        }
      );
    });
  },
  updateUser: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      let {
        firstName,
        lastName,
        address,
        city,
        country,
        birthDate,
        email,
        userId,
      } = req.body;
      client.query(
        `UPDATE users
        SET first_name = $1, last_name = $2, address = $3, city = $4, country = $5, birth_date = $6, email = $7
        WHERE id = $8`,
        [firstName, lastName, address, city, country, birthDate, email, userId],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.redirect("/dashboard/users");
          }
        }
      );
    });
  },
  deleteUser: function (req, res, next) {
    pool.connect(function (err, client, done) {
      let { id } = req.params;
      if (err) {
        return res.send(err);
      }
      client.query(
        `UPDATE users SET is_valid = false WHERE id = $1`,
        [id],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            req.flash(
              "success_msg",
              "User account has been successfully deleted."
            );
            res.redirect("/dashboard/users");
          }
        }
      );
    });
  },
  banUser: function (req, res, next) {
    pool.connect(function (err, client, done) {
      let { userId, banUserDays } = req.body;
      if (err) {
        return res.send(err);
      }
      var banUserDate = new Date();
      banUserDate.setDate(banUserDate.getDate() + parseInt(banUserDays, 10));
      client.query(
        `UPDATE users SET banned_until = $1 WHERE id = $2`,
        [banUserDate, userId],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            req.flash(
              "success_msg",
              "User account has been successfully banned."
            );
            res.redirect("/dashboard/users");
          }
        }
      );
    });
  },
  addLecture: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      let { code, name, startDate, endDate, startTime, schedule, duration } =
        req.body;
      let file = req.file;
      var lecturerId = req.user.id;
      var imageFilename = file ? file.filename : undefined;
      let userId = req.user.id;
      let isAdmin = req.user.is_admin;
      let isLecturer = req.user.is_lecturer;

      client.query(
        `WITH inserted AS (INSERT INTO public.lectures
      (lecturer_id, code, name, start_date, end_date, start_time, schedule, duration, image_filename)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *) SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as lecturer FROM inserted i JOIN users u ON u.id = i.lecturer_id 
       UNION SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as lecturer 
       FROM lectures l JOIN users u ON u.id = l.lecturer_id ORDER BY start_date ASC;`,
        [
          lecturerId,
          code,
          name,
          startDate,
          endDate,
          startTime,
          schedule,
          duration,
          imageFilename,
        ],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.render("dashboard", {
              lectures: lecturesMapper(result.rows).filter((lecture) =>
                isLecturer && !isAdmin ? lecture.lecturer_id === userId : true
              ),
              user: req.user.email,
              isAdmin: req.user.is_admin,
              title: "Lectures",
            });
          }
        }
      );
    });
  },
  updateLecture: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      let {
        id,
        code,
        name,
        startDate,
        endDate,
        startTime,
        schedule,
        duration,
      } = req.body;
      let file = req.file;
      var imageFilename = file ? file.filename : undefined;

      client.query(
        `UPDATE lectures SET code = $1, name = $2, start_date = $3, end_date = $4, start_time = $5, schedule = $6, duration = $7, image_filename = $8
        WHERE id = $9;`,
        [
          code,
          name,
          startDate,
          endDate,
          startTime,
          schedule,
          duration,
          imageFilename,
          id,
        ],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.redirect("/dashboard/lectures");
          }
        }
      );
    });
  },
  getForbiddenWords: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(`SELECT * FROM forbidden_words`, [], function (err, result) {
        done();
        if (err) {
          return res.send(err.stack);
        } else {
          res.render("dashboard", {
            words: result.rows,
            user: req.user.email,
            isAdmin: req.user.is_admin,
            title: "Forbidden Words",
          });
        }
      });
    });
  },
  addForbiddenWord: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      let { forbiddenWord } = req.body;
      client.query(
        `WITH inserted AS (INSERT INTO forbidden_words(word) VALUES($1) RETURNING *) SELECT inserted.* FROM inserted UNION SELECT fw.* FROM forbidden_words fw ORDER BY word ASC;`,
        [forbiddenWord],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.redirect("/dashboard/forbidden_words");
          }
        }
      );
    });
  },
  deleteForbiddenWord: function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(
        `DELETE FROM forbidden_words WHERE id = $1 RETURNING *;`,
        [req.params.id],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            res.render("dashboard", {
              words: result.rows,
              user: req.user.email,
              isAdmin: req.user.is_admin,
              title: "Forbidden words",
            });
          }
        }
      );
    });
  },
};

router.get(
  "/lectures/:id",
  checkNotAuthenticated,
  admin.getLecture,
  admin.getScheduledLectures,
  admin.getQuestions
);

router.get(
  "/lectures/:id/scheduled/:scheduledLectureId",
  checkNotAuthenticated,
  admin.deleteScheduledLecture
);

router.get("/lectures-cover", (req, res) => {
  var filename = req.query.filename;
  var imagePath = filename
    ? "lecture-covers/" + filename
    : "images/no_image.jpg";
  fs.readFile("./public/" + imagePath, function (err, data) {
    if (err) throw err;

    res.writeHead(200, {
      "Content-Length": data.length,
      "Content-disposition": "attachment; filename=" + filename,
    });
    res.end(data);
  });
});

router.get("/users", checkNotAuthenticated, admin.getUsers);
router.get("/users/:id", checkNotAuthenticated, admin.deleteUser);
router.post("/users/ban", checkNotAuthenticated, admin.banUser);
router.post("/users", checkNotAuthenticated, admin.updateUser);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/lecture-covers");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

var upload = multer({ storage: storage });

router.post(
  "/lectures",
  checkNotAuthenticated,
  upload.single("file"),
  admin.addLecture
);
router.post(
  "/lectures/edit",
  checkNotAuthenticated,
  upload.single("file"),
  admin.updateLecture
);
router.get("/lectures", checkNotAuthenticated, admin.getLectures);
router.get("/forbidden_words", checkNotAuthenticated, admin.getForbiddenWords);
router.get(
  "/forbidden_words/:id",
  checkNotAuthenticated,
  admin.deleteForbiddenWord
);
router.post(
  "/add_forbidden_word",
  checkNotAuthenticated,
  admin.addForbiddenWord
);

router.get("/", checkNotAuthenticated, function (req, res, next) {
  res.render("dashboard", {
    user: req.user.email,
    isAdmin: req.user.is_admin,
    title: "Dashboard",
  });
});

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

schedule.scheduleJob(" */1 * * * *", function () {
  pool.connect(function (err, client, done) {
    if (err) {
      return res.send(err);
    }
    client.query(
      `INSERT INTO scheduled_lectures(lecture_id, lecture_date_time)
      select lecs.id, date_trunc('day', CURRENT_DATE) + lecs.start_time from (select l.id, l.start_date, l.end_date, l.start_time, l.schedule, 
        (select sl.lecture_date_time from scheduled_lectures sl where sl.lecture_id = l.id order by sl.lecture_date_time desc limit 1) as last_lecture 
        from lectures l) lecs 
        where lecs.start_date::date <= CURRENT_DATE and lecs.end_date::date >= CURRENT_DATE
        and ((CASE WHEN lecs.schedule = 'DAILY' and (DATE_TRUNC('day', coalesce(lecs.last_lecture + INTERVAL '1 day', CURRENT_DATE)) = DATE_TRUNC('day', CURRENT_DATE)) then true ELSE false end) = true
        OR (CASE WHEN lecs.schedule = 'WEEKLY' and (DATE_TRUNC('day',coalesce(lecs.last_lecture + INTERVAL '7 day', CURRENT_DATE)) = DATE_TRUNC('day',CURRENT_DATE)) then true ELSE false end) = true
        or (CASE WHEN lecs.schedule = 'MONTHLY' and (DATE_TRUNC('day',coalesce(lecs.last_lecture + INTERVAL '30 day', CURRENT_DATE)) = DATE_TRUNC('day',CURRENT_DATE)) then true ELSE false end) = true
        or (CASE WHEN lecs.schedule = 'YEARLY' and (DATE_TRUNC('day',coalesce(lecs.last_lecture + INTERVAL '365 day', CURRENT_DATE)) = DATE_TRUNC('day',CURRENT_DATE)) then true ELSE false end) = true
        or (CASE WHEN lecs.schedule = 'ONCE' and lecs.last_lecture is NULL then true ELSE false end) = true) RETURNING *`,
      [],
      function (err, res) {
        done();
        if (err) {
          console.log(err.stack);
        }
        if (res.rows?.length > 0) {
          console.log("Lecture successfully created at " + new Date());
        }
      }
    );
  });
});

module.exports = router;
