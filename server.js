// server.js
// where your node app starts

// init project
var express = require("express");
var app = express();

/** Install & Set up mongoose */
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
var cors = require("cors");
app.use(cors({ optionSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

//  API endpoints for the first challenge.
app.get("/api/timestamp/", (req, res) => {
  res.json({ unix: Date.now(), utc: Date() });
});

app.get("/api/timestamp/:date_string", function(req, res) {
  let input = req.params.date_string;
  let date = input === "" ? new Date() : new Date(input);

  if (date.toUTCString() === "Invalid Date") {
    date = Number(input);
    if (new Date(date).toUTCString() === "Invalid Date") {
      res.json({ error: "Invalid Date" });
    } else {
      res.json({ unix: date, utc: new Date(date).toUTCString() });
    }
  } else {
    res.json({ unix: date.getTime(), utc: date.toUTCString() });
  }
});

//  API endpoint for the second challenge.
app.get("/api/whoami", function(req, res) {
  let language = req.headers["accept-language"];
  let ipaddress = req.headers["x-forwarded-for"].split(",")[0];
  let software = req.headers["user-agent"];
  res.json({ ipaddress: ipaddress, language: language, software: software });
});

// MongoDB variables for the third challenge
var urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
});

var URL = mongoose.model("URL", urlSchema);

//  API endpoints for the third challenge.
app.post("/api/shorturl/new/:url", function(req, res) {
  console.log(req.params.url);
  // var SaveURL = function(done) {
  // janeFonda.save(function(err, data) {
  //   if (err) return console.error(err);
  //   done(null, data);
  // });
  //};
});

//  API endpoints for the forth challenge.
app.post("/api/exercise/new-user", function(req, res) {});
app.post("/api/exercise/add", function(req, res) {});
app.get("/api/exercise/log/:userId/:from/:to/:limit", function(req, res) {});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
