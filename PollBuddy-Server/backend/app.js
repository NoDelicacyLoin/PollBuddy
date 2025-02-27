// Load values from .env file
require("dotenv").config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const os = require("os");

var groupsRouter = require("./routes/groups");
var pollsRouter = require("./routes/polls");
var usersRouter = require("./routes/users");

// In case we run into CORS issues
var cors = require("cors");

var app = express();

// Express Session
const expressSession = require("express-session");
const MongoStore = require("connect-mongo");
app.use(expressSession({
  cookie: {
    maxAge: 2629800000
  },
  name: "pollbuddy_session",
  secret: process.env["SESSION_SECRET"],
  secure: true,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: process.env["DB_URL"],
    dbName: process.env["DB_NAME"]
  })
}));

// Cors: https://daveceddia.com/access-control-allow-origin-cors-errors-in-react-express/
app.use(cors());

var mongoConnection = require("./modules/mongoConnection.js");
mongoConnection.connect(function (res) {
  if (res !== true) {
    console.error(res);
  }
});

// InfluxDB
var influxConnection = require("./modules/influx.js");

// Response Time Logging to InfluxDB
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`Request to ${req.path} took ${duration}ms`);

    influxConnection.log([
      {
        measurement: "response_times",
        tags: {
          host: os.hostname(),
          platform: "backend",
          path: req.path
        },
        fields: {
          duration: duration
        },
        timestamp: new Date()
      }
    ]);
  });
  return next();
});

// Automated Email System
const email = require("./modules/email.js");
email.initialize();
// TODO: Remove this example after the system gets used somewhere (likely in the forgot password system)
// email.send("user@domain.com", "This is a cool email!", "HTML <b>tags</b> work too!");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(usersRouter.user_middleware);

app.use("/api/groups", groupsRouter);
app.use("/api/polls", pollsRouter);
app.use("/api/users", usersRouter);

// When visiting /test, the database connection finds all documents in all collections, and returns them in JSON.
app.get("/api/test", (req, res) => {
  var documents = [];
  mongoConnection.getDB().listCollections().toArray().then((data) => {
    // Here you can do something with your data
    var itemsProcessed = 0;
    data.forEach(function (c) {
      mongoConnection.getDB().collection(c["name"]).find({}).toArray(function (err, document) {
        documents.push(document);
        itemsProcessed++;
        if (itemsProcessed === data.length) {
          callback();
        }
      });
    });

    function callback() {
      res.json(documents);
    }
  });
});

var schoolsModule = require("./modules/schoolList.js");
app.get("/api/schools", (req, res) => {
  var schools = schoolsModule.getList();
  res.json(schools);
});


app.get("/gendata", (req, res) => {
  var log = "";
  var completes = [];
  var elements = [
    ["test", { SIS: "Man" }],
    ["users", {
      FirstName: "Bill",
      LastName: "Cheese",
      Username: "cheb",
      email: "cheb@rpi.edu",
      password: "password1",
      RCS: "cheb"
    }],
    ["users", {
      FirstName: "Suzy",
      LastName: "Stevenson",
      Username: "stevs3!",
      email: "fuzzytesting@rpi.edu",
      password: "password2!",
      RCS: "stev3"
    }],
    ["groups", { Name: "RCOS", instructors: ["Turner (should be ID later)"], AssociatedPolls: [] }],
    ["groups", { Name: "Chemistry", instructors: ["Kirover-Snover (should be ID later)"], AssociatedPolls: [] }],
    ["polls", {
      Name: "Chem 1 Poll 1",
      Questions: ["What is your name?", "What grade are you in?"],
      Answers: ["OpenEnded", [10, 11, 12]]
    }],
    ["polls", {
      Name: "RCOS Poll 1",
      Questions: ["What project are you on?", "True/False: RCOS Sux"],
      Answers: ["", [10, 11, 12]]
    }],
  ]; // format: ["collection, { obj: "value"} ],

  mongoConnection.getDB().dropDatabase(function () {

    log += "Dropping DB\n";

    elements.forEach(function (element) {
      addObj(element);
    });
  });

  var checkClose = setInterval(function () {
    if (completes.length === elements.length) {
      clearInterval(checkClose);
      res.send(log);
    }
  }, 1000);

  function addObj(element) {
    log += "Inserting: " + JSON.stringify(element[1]) + "\n";
    mongoConnection.getDB().collection(element[0]).insertOne(element[1], function (err, res) {
      if (err) {
        throw err;
      }
      log += "Inserted: " + JSON.stringify(element[1]) + "\n";
      completes.push(element[1]);
    });
  }

});


// Root page (aka its working)
app.get("/", function (req, res, next) {
  next(createError(200));
});

// API Root page (aka its working)
app.get("/api", function (req, res, next) {
  next(createError(200));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {

  console.log(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.sendStatus(err.status || 500);
});

module.exports = app;
