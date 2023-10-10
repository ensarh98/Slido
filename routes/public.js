const { Router } = require("express");
var router = Router();
const pool = require("../config/dbConfig");
const moment = require("moment");

const DATE_FORMAT = "DD.MM.YYYY";
const DATETIME_FORMAT = "DD.MM.YYYY HH:mm:ss";

var io = null;
var questions = [];
var forbidden_words = [];
var idevi = [];

var Public = {
  joinToLecture: function (req, res, next) {
    pool.connect(async function (err, client, done) {
      let errors = [];
      var code = req.body.lectureCode;
      if (!code) {
        errors.push({ message: "Please enter a code." });
        res.render("public", { errors: errors });
      } else {
        var codePaths = code.split("-");
        if (codePaths.length == 1) {
          errors.push({ message: "Code format is not correct. Try again." });
        }
        if (errors.length > 0) {
          res.render("public", { errors: errors });
        } else {
          client.query(
            `SELECT sl.* FROM scheduled_lectures sl WHERE sl.id = $1 and sl.is_valid = true`,
            [codePaths[1]],
            (err, result) => {
              if (err) {
                return res.send(err.stack);
              }
              if (result.rowCount < 1) {
                errors.push({ message: "The code is not correct. Try again." });
                res.render("public", { errors: errors });
              } else {
                req.scheduledLectureId = result.rows[0].id;
                next();
              }
            }
          );
        }
      }
    });
  },
  insertLectureGuest: function (req, res, next) {
    pool.connect(async function (err, client, done) {
      let errors = [];
      var username = req.body.guestUsername;
      if (!username) {
        errors.push({ message: "Please enter an username." });
        res.render("public", { errors: errors });
      } else {
        client.query(
          `INSERT INTO lecture_guests
          (scheduled_lecture_id, guest_username)
          VALUES($1, $2);
          `,
          [req.scheduledLectureId, username],
          (err, result) => {
            done();
            if (err) {
              errors.push({ message: err.detail });
              res.render("public", { errors: errors });
            } else {
              res.redirect(
                "/public/lectures/" +
                  req.scheduledLectureId +
                  "/guests/" +
                  username
              );
            }
          }
        );
      }
    });
  },
  rateLecture: function (req, res, next) {
    pool.connect(async function (err, client, done) {
      var mark = req.body.mark;
      var scheduledLectureId = req.params.id;
      var username = req.params.username;

      client.query(
        `UPDATE lecture_guests set mark = $1 where scheduled_lecture_id = $2 and guest_username = $3`,
        [mark, scheduledLectureId, username],
        (err, result) => {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            req.flash(
              "success_msg",
              "You have successfully rated the lecture."
            );
            res.redirect(
              "/public/lectures/" + scheduledLectureId + "/guests/" + username
            );
          }
        }
      );
    });
  },
  lectureDetails: function (req, res, next) {
    const scheduledLectureId = req.params.id;
    const username = req.params.username;
    var isAdminOrLecture = req.user
      ? req.user.is_lecturer || req.user.is_admin
      : false;
    pool.connect(async function (err, client, done) {
      if (err) {
        return res.send(err);
      }
      client.query(
        `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as lecturer, sl.lecture_date_time, 
        (select count(*) from lecture_guests lg where lg.guest_username = $2) as guest_exists
        FROM scheduled_lectures sl
        JOIN lectures l ON l.id = sl.lecture_id
        JOIN users u ON u.id = l.lecturer_id
        WHERE sl.id = $1;`,
        [scheduledLectureId, username],
        function (err, result) {
          done();
          if (err) {
            return res.send(err.stack);
          } else {
            var lectureDetails = result.rows[0];
            if (
              lectureDetails.guest_exists === 0 &&
              !(req.user?.is_lecturer || req.user?.is_admin)
            ) {
              res.redirect("/public");
            }
            var lectureEndTime = moment(lectureDetails.lecture_date_time)
              .add(lectureDetails.duration, "m")
              .toDate();
            var currentDate = new Date();
            var isLectureActive =
              lectureDetails.lecture_date_time <= currentDate &&
              currentDate <= lectureEndTime;
            if (!isLectureActive) {
              res.render("no-active-lecture");
            } else {
              idevi.push({ username: username });
              if (!io) {
                io = require("socket.io")(req.connection.server);

                pool.connect(function (err, client, done) {
                  if (err) {
                    return res.send(err.stack);
                  }
                  client.query(
                    `SELECT lq.*, lqt.guest_username as username 
                    FROM lecture_questions lq 
                    JOIN lecture_guests lqt ON lqt.id = lq.lecture_guest_id 
                    WHERE lq.scheduled_lecture_id = $1 and lq.is_hidden = false`,
                    [scheduledLectureId],
                    function (err, result) {
                      done();
                      if (err) {
                        return res.send(err.stack);
                      }

                      questions = result.rows.map((item) => {
                        return {
                          ...item,
                          scheduledLectureId: item.scheduled_lecture_id,
                          date: moment(item.date).format(DATETIME_FORMAT),
                          likes: item.likes || 0,
                          dislikes: item.dislikes || 0,
                          is_answered: item.is_answered || false,
                          is_hidden: item.is_hidden || false,
                        };
                      });
                    }
                  );
                });

                pool.connect(function (err, client, done) {
                  if (err) {
                    return res.send(err.stack);
                  }
                  client.query(
                    `select fw.word from forbidden_words fw;`,
                    [],
                    function (err, result) {
                      done();
                      if (err) {
                        return res.send(err.stack);
                      }
                      forbidden_words = result.rows;
                    }
                  );
                });

                io.sockets.on("connection", function (client) {
                  idevi[idevi.length - 1].id = client.id;

                  client.emit("all_questions", questions);

                  var clientUsername = idevi.find(
                    (item) => item.id === client.id
                  )?.username;

                  client.on("guest_send_question", function (d) {
                    var date = new Date();
                    var is_hidden = false;
                    forbidden_words.forEach((item) => {
                      if (d.toLowerCase().includes(item.word.toLowerCase())) {
                        is_hidden = true;
                        return;
                      }
                    });
                    questions.push({
                      username: clientUsername,
                      question: d,
                      scheduledLectureId: scheduledLectureId,
                      date: moment(date).format(DATETIME_FORMAT),
                      date_value: date,
                      likes: 0,
                      dislikes: 0,
                      requireInsert: true,
                      is_hidden: is_hidden,
                      is_answered: false,
                    });
                    currentQuestion = d;
                    io.emit(
                      "question_from_server",
                      {
                        username: clientUsername,
                        question: d,
                        date: moment(date).format(DATETIME_FORMAT),
                        date_value: date,
                        likes: 0,
                        dislikes: 0,
                        index: questions.length - 1,
                        is_hidden: is_hidden,
                        is_answered: false,
                      },
                      isAdminOrLecture
                    );
                  });

                  client.on("guest_like_question", function (index) {
                    var question = questions[index];
                    var questionLikes = question.likes + 1;
                    questions[index] = {
                      ...question,
                      likes: questionLikes,
                      requireUpdate: !question.requireInsert,
                    };

                    currentQuestion = question;
                    io.emit("all_questions", questions);
                  });

                  client.on("guest_dislike_question", function (index) {
                    var question = questions[index];
                    var questionDislikes = question.dislikes + 1;
                    questions[index] = {
                      ...question,
                      dislikes: questionDislikes,
                      requireUpdate: !question.requireInsert,
                    };

                    currentQuestion = question;
                    io.emit("all_questions", questions);
                  });

                  client.on("hide_question", function (index) {
                    var question = questions[index];
                    questions[index] = {
                      ...question,
                      requireUpdate: !question.requireInsert,
                      is_hidden: true,
                    };

                    currentQuestion = question;
                    io.emit("all_questions", questions);
                  });

                  client.on("answer_question", function (index) {
                    var question = questions[index];
                    questions[index] = {
                      ...question,
                      requireUpdate: !question.requireInsert,
                      is_answered: true,
                    };

                    currentQuestion = question;
                    io.emit("all_questions", questions, isAdminOrLecture);
                  });
                });
              }

              var lecture = result.rows[0];
              res.render("public-lecture", {
                lecture: {
                  ...lecture,
                  lecture_date_time: lecture?.lecture_date_time
                    ? moment(lecture.lecture_date_time).format(DATE_FORMAT)
                    : undefined,
                },
                title: "Lecture",
                hideIcon: isAdminOrLecture
                  ? "glyphicon glyphicon-eye-close"
                  : "",
                answerIcon: isAdminOrLecture ? "glyphicon glyphicon-saved" : "",
                isAdminOrLecture: isAdminOrLecture,
                scheduledLectureId,
                username,
              });
            }
          }
        }
      );
    });
  },
};

setInterval(() => {
  var currentQuestions = questions;
  currentQuestions
    .filter((item) => item.requireInsert)
    .map(async (item) => {
      pool.connect(async function (err, client, done) {
        item.requireInsert = false;
        client.query(
          `INSERT INTO lecture_questions(scheduled_lecture_id, lecture_guest_id, question, date, likes, dislikes, is_hidden)
                  select $1, lg.id, $3, $4 , $5, $6, $7
                  FROM lecture_guests lg WHERE lg.guest_username = $2 RETURNING id;`,
          [
            item.scheduledLectureId,
            item.username,
            item.question,
            item.date_value,
            item.likes || 0,
            item.dislikes || 0,
            item.is_hidden,
          ],
          function (err, result) {
            done();
            if (err) {
              console.log(err.stack);
            }
            item.id = result.rows[0].id;
          }
        );
      });
    });
  currentQuestions
    .filter((item) => item.requireUpdate)
    .map(async (item) => {
      pool.connect(async function (err, client, done) {
        item.requireUpdate = false;
        await client.query(
          `UPDATE lecture_questions SET likes = $1, dislikes = $2, is_hidden = $4, is_answered = $5 WHERE id = $3;`,
          [item.likes, item.dislikes, item.id, item.is_hidden, item.is_answered]
        );
        done();
        if (err) {
          console.log(err.stack);
        }
      });
    });
}, 5000);

router.get("/", function (req, res, next) {
  res.render("public", { title: "Public" });
});
router.post("/", Public.joinToLecture, Public.insertLectureGuest);
router.post("/lectures/:id/guests/:username", Public.rateLecture);
router.get("/lectures/:id/guests/:username", Public.lectureDetails);

module.exports = router;
