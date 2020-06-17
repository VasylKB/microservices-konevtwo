// init project
let express = require("express");
let mongo = require("mongodb");
let mongoose = require("mongoose");
let bodyParser = require("body-parser");
let dns = require("dns");

let app = express();

// Install & Set up mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
let cors = require("cors");
app.use(cors({ optionSuccessStatus: 200 }));

//  Mount the body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//  Serve static files
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

//Mongo db variables of the third challenge
// Create a 'Shorter' Model
let shorterSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

// Create a Shorter
let Shorter = mongoose.model("Shorter", shorterSchema);

//  API endpoint for the third challenge.
app.post("/api/shorturl/new", function(req, res) {
  let originalUrl = req.body.url;
  //look for a very weg proper url appearence
  if (/^(https:\/\/|http:\/\/)/.test(originalUrl)) {
    let begging = originalUrl.match(/^(https:\/\/|http:\/\/)?(www.)?/)[0];
    let checkUrl = originalUrl.match(
      /^(https:\/\/|http:\/\/)?(www.)?.+?(?=\/)/
    );
    dns.lookup(checkUrl[0].slice(begging.length), (error, address, family) => {
      if (address === undefined) {
        res.json({ error: "invalid URL" });
      } else {
        //check if the database contains already the site
        Shorter.find({ original_url: originalUrl }, function(err, [doc]) {
          if (err) return console.log(err);
          if (doc === undefined) {
            Shorter.find().exec((err, doc) => {
              let toBeShortened = new Shorter({
                original_url: originalUrl,
                short_url: doc.length + 1
              });
              toBeShortened.save(function(err, data) {
                if (err) return console.error(err);
              });
              res.json({
                original_url: originalUrl,
                short_url: doc.length + 1
              });
            });
          } else {
            res.json({ original_url: originalUrl, short_url: doc.short_url });
          }
        });
      }
    });
  } else {
    res.json({ error: "invalid URL" });
  }
});

app.get("/api/shorturl/:short_url", function(req, res) {
  Shorter.find({ short_url: req.params["short_url"] }, function(err, [doc]) {
    if (err) return console.log(err);
    res.writeHead(301, { Location: doc["original_url"] });
    res.end();
  });
});

//  API endpoints for the forth challenge.
app.post("/api/exercise/new-user", function(req, res) {});
app.post("/api/exercise/add", function(req, res) {});
app.get("/api/exercise/log/:userId/:from/:to/:limit", function(req, res) {});

// listen for requests :)
let listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
