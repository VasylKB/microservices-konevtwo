// init project
let express = require("express");
let mongo = require("mongodb");
let mongoose = require("mongoose");
let bodyParser = require("body-parser");
let dns = require("dns");
let fs = require('fs');
var formidable = require('formidable');

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
            //creating an index
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

//Mongo db variables of the forth challenge
// Create a 'User' Model
let userSchema = new mongoose.Schema({
  username: String,
  exercise: [
    {
      description: String,
      duration: Number,
      date: String
    }
  ]
});

// Create a User
let User = mongoose.model("User", userSchema);

//  API endpoints for the forth challenge.
app.post("/api/exercise/new-user", function(req, res) {
  let userName = req.body.username;
  User.find({ username: userName }, function(err, [doc]) {
    if (err) return console.log(err);
    if (doc === undefined) {
      let newUser = new User({
        username: userName,
        exercise: []
      });
      newUser.save(function(err, data) {
        if (err) return console.error(err);
        res.json({ username: data.username, _id: data.id });
      });
    } else {
      res.json({ respose: "Username already taken" });
    }
  });
});

app.get("/api/exercise/users", function(req, res) {
  User.find({}, "username _id", function(err, docs) {
    if (err) return console.log(err);
    if (docs != []) {
      res.json(docs);
    } else {
      res.json({ respose: "no users yet" });
    }
  });
});

app.post("/api/exercise/add", function(req, res) {
  let { userId, description, duration, date } = req.body;
  date =
    date === undefined || date === "date(yyyy-mm-dd)"
      ? new Date().toDateString()
      : new Date(date).toDateString();

  let newExercise = {
    description: description,
    duration: Number(duration),
    date: date
  };
  //cheking if the id is valid
  let isId = mongoose.Types.ObjectId.isValid(userId);
  if (isId) {
    //trying to find the id
    User.findById(userId, function(err, doc) {
      if (doc != undefined) {
        if (err) return console.log(err);
        //updating and saving the document
        doc.exercise.push(newExercise);
        doc.save(function(err, data) {
          if (err) return console.error(err);
          console.log(doc,"this is doc")
          res.json({
            _id: userId,
            description: newExercise.description,
            duration: newExercise.duration,
            date: newExercise.date,
            username: doc.username
          });
        });
      } else {
        res.json({ respose: "Your userid is not a valid id" });
      }
    });
  } else {
    res.json({ respose: "Your userid is not a valid id" });
  }
});

app.get("/api/exercise/log", function(req, res) {
  let { userId, from, to, limit } = req.query;
  //setting default values
  from = from === "from begging"||from === undefined ? "1900-01-01" : from;
  to = to === "to now"||to === undefined  ? new Date() : to;
  limit = limit === "limit" ? 1000 : limit;
  //checking if the date is of the right format
  if (
    new Date(from).toDateString() === "Invalid Date" ||
    new Date(to).toDateString() === "Invalid Date"
  ) {
    res.json({ respose: "Please check you time format" });
  } else {
    from = Date.parse(from);
    to = Date.parse(to);
    //cheking if the id is valid
    let isId = mongoose.Types.ObjectId.isValid(userId);
    if (isId) {
      //trying to find the id
      User.findById(userId, function(err, doc) {
        if (doc != undefined) {
          if (err) return console.log(err);
          //updating and saving the document
          let exercises = doc.exercise
            .filter(exercise => {
              var date = Date.parse(exercise.date);
              return date >= from && date <= to;
            })
            .map(item => {
              return {
                duration: item.duration,
                description: item.description,
                date: item.date
              };
            });
          res.json({
            username: doc.username,
            userId: doc.id,
            count: exercises.length,
            log: [...exercises.slice(0, limit)]
          });
        } else {
          res.json({ respose: "Your userid is not a valid id" });
        }
      });
    } else {
      res.json({ respose: "Your userid is not a valid id" });
    }
  }
});

//  API endpoint for the last challenge.
//the approach learned here https://stackoverflow.com/questions/23691194/node-express-file-upload
app.post("/file", (req, res) => {
  var form = new formidable.IncomingForm();
    form.uploadDir = "./public";//set upload directory
    form.keepExtensions = true;//keep file extension
    form.parse(req, function(err, fields, files) {
        fs.rename(files.upfile.path, './public/'+files.upfile.name, function(err) {
        if (err)
            throw err;
          console.log('renamed complete');  
        });
    res.json({"name": files.upfile.name,"size":files.upfile.size});
    });
});

// listen for requests :)
let listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
