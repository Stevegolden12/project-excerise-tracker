const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const shortid = require('shortid')


const app = express()

mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost:27017/ExerciseTracker', { useNewUrlParser: true }, (err) => {
  if (!err) {
    console.log("Database connection successful")
  } else {
    console.log("Database is not connected: " + err)
  }
})

app.use(cors())

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))




app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Schema
var Schema = mongoose.Schema;

var userSchema = new Schema({
  _id: {
    'type': String,
    'default': shortid.generate
  },
  username: {
    type: String,
    required: true
  },
  exercise: [{
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: Date
  }]
})

//Database Model                 (collection Name, Schema Name)
var exerciseUser = mongoose.model('exerciseUsers', userSchema);

//Create user route
app.post('/api/exercise/new-user', (req, res) => {
  console.log(req.body)
  var eUser = new exerciseUser({ username: req.body.username })

  eUser.save(eUser, function (err, user) {
    console.log("User when saving is: " + user._id);
    if (err) { return console.error(err) }
    else {
      res.send('Your userId to access the tracker is: ' + user._id);
    }
  })
})

//Create exercise route
app.post('/api/exercise/add', (req, res) => {
  //Ignore des because input always returns a string
  let validDate = '';

  var chkFields = {
    id: true,
    des: true,
    dur: true,
    date: true,
  }
 
  //Validate Description 
  if (req.body.description === '') {
    chkFields.des = false;
  }

  
  //Validate duration
  const chkDur = /^[0-9]*$/gm;

  if (!chkDur.test(req.body.duration) || req.body.duration === '') {
     chkFields.dur = false;
  }

  console.log("chkFields.dur: " + chkFields.dur)


  
  //Check for null date and auto-fill
  const autoDate = (bDate) => {
    if (bDate === '') {
      const d = (new Date().toISOString().slice(0, 10))
      return d;
    } else {
      return bDate;
    }
  }  

  validDate = autoDate(req.body.date); 
 
  //Validate filled-in date


  const valDate = (fillDate) => {
    const chkDate = /^[0-9]{4}[-][0-9]{2}[-][0-9]{2}$/gm;
   
    if (!chkDate.test(fillDate)) {
      console.log("chkDate is false: " + fillDate)
      return false;
    }
    return true;
  }

  chkFields.date = valDate(validDate);

  //Validate _id is in database and return validate results
  exerciseUser.find({ _id: req.body.userId }, '_id', function (err, docs) {

    if (docs[0] !== undefined) { 
      chkFields.id = true;
    } else {
      chkFields.id = false;
    }

    console.log("Logic: " + (!chkFields.id && !chkFields.des && !chkFields.dur && !chkFields.date))
  
    if (chkFields.id && chkFields.des && chkFields.dur && chkFields.date) {
       //Return the username, _id, and all of this session information (desc, duration, and date)
        res.send("all the fields are valid")
    } else {
      let valFail = [];

      switch (chkFields) {
        case chkFields.id === false:
          console.log("Triggered")
          valFail.push('id')
          break;
      }
      
      res.send("Validation checks: <br>" + valFail.toString())
    }
  })
 
})




// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
