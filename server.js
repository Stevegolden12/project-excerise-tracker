const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const shortid = require('shortid')
const moment = require('moment')


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


mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

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
    date: String
  }]
})

//Database Model                 (collection Name, Schema Name)
var exerciseUser = mongoose.model('exerciseUsers', userSchema);

//Validate filled-in date
var valDate = (fillDate) => {

  const chkDate = /^[0-9]{4}[-][0-9]{2}[-][0-9]{2}$/gm;
  if (!chkDate.test(fillDate)) {
    return false;
  }
  return true;
}


//Check :Limit is a number
var chkLimit = (rpath) => {
  if (isNaN(Number(rpath))) {
    return false
  } else {
    return true
  }
}

//Create user route
app.post('/api/exercise/new-user', (req, res) => {
  var eUser = new exerciseUser({ username: req.body.username })

  eUser.save(eUser, function (err, user) {  
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
    description: true,
    duration: true,
    date: true,
  }
 
  //Validate Description 
  if (req.body.description === '') {
    chkFields.description = false;
  }

  
  //Validate duration
  const chkDur = /^[0-9]*$/gm;

  if (!chkDur.test(req.body.duration) || req.body.duration === '') {
     chkFields.duration = false;
  }

  
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
 
  chkFields.date = valDate(validDate);


  //Validate _id is in database and return validate results
  exerciseUser.find({ _id: req.body.userId }, function (err, user) {

    if (user[0] !== undefined) {
      chkFields.id = true;
    } else {
      chkFields.id = false;
    }

  //Ties all validation from above
    if (chkFields.id && chkFields.description && chkFields.duration && chkFields.date) {
     
     //Update the session information to the database
      exerciseUser.findOneAndUpdate(
        { _id: user[0]._id },
        { $push: { exercise: { description: req.body.description, duration: req.body.duration, date: validDate} } },
        function (error, success) {
          if (error) {
            console.log("error");
          } else {
            console.log("success");  
          }
        });
      //Lets user know the update is successful
      res.send("The following session has been logged for " + user[0].username + ": </br>" + "exercise description: " + req.body.description + "</br>" +
        "exercise duration: " + req.body.duration + " mins </br>" + "exercise date: " + validDate)

    } else {
      let valFail = [];
      let valList = []

      for (var check in chkFields) { 
        valFail.push([check, chkFields[check]])
      }



      for (i = 0; i < valFail.length; i++) {
  
        if (valFail[i][1] === false) {    
          valList.push(valFail[i][0])
        }
      }

      console.log("valList is: " + valList)
      
      res.send("The following fields are not valid: <br>" + valList.join(', '))
    }
  })
 
})

//Retrieve the user and exercise session information
app.get('/api/exercise/log/:from?/:to?/:limit?', (req, res) => {
  //validate req.query.username
  var username = req.query.username.slice(0, 9)
  //check which dynamic route are being used
  var restPath = req.query.username.slice(10).split("/")

  exerciseUser.find({ _id: username }, (err, user) => {

    if (!user[0] === undefined) {
      res.send("Please enter a valid username")
    } else {
      //check :from, :to, :limit
      if (restPath.length === 1 && restPath[0] === '') {
        console.log("No path: " + restPath[0])
      } else if (restPath.length === 1 && !(restPath[0] === '')) {
        //*************Just finished with validating if restPath logic******************
        console.log("1 path")
     

        if (chkLimit(restPath[0])) {

          const objLength = user[0].exercise.length
          var nObj = [];
          user[0].exercise.forEach((obj, index) => {
           const limit = objLength <= restPath[0] ? objLength : restPath[0];
         
              if (limit > index) {

                oObj = {
                  description: obj.description,
                  duration: obj.duration,
                  date: obj.date
                }      
                return nObj.push(oObj);
              }           
          })
          res.send("The total amount of excerises shown is: " + nObj.length + "</br >" + JSON.stringify(nObj));          
        } else {
          console.log(restPath[0])
          res.send("Limit must be a number")
        }      
      } else if (restPath.length === 2) {
        if (valDate(restPath[0]) && valDate(restPath[1])) {
         
          var dObj = [];
           user[0].exercise.forEach((obj, index) => {
              
             if (moment(restPath[0]).isSameOrBefore(obj.date) && moment(restPath[1]).isSameOrAfter(obj.date)) {
               eObj = {
                description: obj.description,
                duration: obj.duration,
                date: obj.date
               }
               return dObj.push(eObj);
             }
          })

          res.send("The total amount of excerises shown is: " + dObj.length + "</br >" + JSON.stringify(dObj)); 
       
        } else {
          res.send("Dates are invalid")
        }        
      } else if (restPath.length === 3) {
        if (valDate(restPath[0]) && valDate(restPath[1]) && chkLimit(restPath[2])) {

          var fObj = [];
          user[0].exercise.forEach((obj, index) => {

            const objLength = user[0].exercise.length;
            var countArr = 0;
            const limit = objLength <= restPath[2] ? objLength : restPath[2];
            console.log("limit: " + limit)
            console.log("fObj.length: " + fObj.length)
            if (limit > fObj.length) {
       
            if (moment(restPath[0]).isSameOrBefore(obj.date) && moment(restPath[1]).isSameOrAfter(obj.date)) {
                          
                let gObj = {
                  description: obj.description,
                  duration: obj.duration,
                  date: obj.date
              }              
   
                return fObj.push(gObj);
                }

              }
              
           
            
          })

          res.send("The total amount of excerises shown is: " + fObj.length + "</br>" + JSON.stringify(fObj)); 
  
        } else {
          res.send("Dates and/or Limit is/are invalid")
        }    
      } else if (restPath.length > 3) {
        res.send("Invalid url path")
      } else {



        //validate :from, :to, and :limit
        //return the info from database requested

        res.send("Retrieval is working!")
      }
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
