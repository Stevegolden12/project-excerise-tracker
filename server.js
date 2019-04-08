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


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())



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

//
app.post('/api/exercise/new-user', (req, res) => {


  var eUser = new exerciseUser({ username: req.body.username })

  eUser.save(eUser, function (err, user) {
  console.log("User when saving is: " + user._id);
    if (err) { return console.error(err) }
    else{
      res.send('Your userId to access the tracker is: ' + user._id);
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
