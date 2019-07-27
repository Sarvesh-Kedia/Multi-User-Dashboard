const express = require('express');
const app = express();
const bodyParser= require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session')
const morgan = require('morgan');
var path = require('path')
const ObjectID = require('mongodb').ObjectID;

const MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');
var Form = require('./models/accountSchema');
//for image uploading
const multer = require('multer');
var fs = require('fs');

//Mongo URI
const mongoURI = 'mongodb://localhost/accountForms';

mongoose.connect(mongoURI)
mongoose.Promise = global.Promise;
const db = mongoose.connection;

app.use(bodyParser.json()); //middleware
app.use(bodyParser.urlencoded({extended: true})) //middleware
app.use(cookieParser());
//app.use(morgan('dev'));

app.use(express.static('public'));
app.use(express.static('images'));
app.use(express.static('scripts'));

app.set('view engine', 'ejs');

app.use(session({
    'secret': 'TestingSesh',
    resave: false,
    saveUninitialized: false,
    sameSite: true,
    store: new MongoStore({ mongooseConnection: db })
}));


let sesh;

var storage =  multer.diskStorage({
    destination: function (request, file, callback) {
      callback(null, './images');
    },
    filename: function (request, file, callback) {
    // filename = file.fieldname + '_' + Date.now();
      callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    console.log('inside storage function')
      //console.log('FILENAME',filename)
    }
});

var upload = multer({ storage : storage}).single('image');


app.listen(5000, function() {
    console.log('listening on 5000')
});


// app.post('/dashboard/post/image', function(req,res){
//     upload(req,res,function(err) {
//         if(err) {
//             console.log('file upload error:',err);
//             return res.end("Error uploading file.", err);
//         }
//         console.log('REQ', req);
//         console.log('RES',res)
//         res.end("File is uploaded");
//     });
// });

//to add a new account
app.post('/dashboard/post', upload, function(request, response) {

    info = {
        email: request.body.email,
        password: request.body.password,
        userName: request.body.userName,
        accType: request.body.accType
    }

    //upload file in filesystem
    upload(request, response, function(err) {
        if(err) {
            console.log('file upload error:', err);

        }
        console.log('file uploaded', request.file);
    });
    
    Form.find().where('email', request.session.email).exec(function(error, result){

        info.createdBy = result[0]._id;
        console.log('created by ', result[0].userName)
        info.image = request.file.filename;
        // console.log('info', info);

        Form.create(info).then(function(newAcc){

            console.log('new account created: ' + newAcc);
            response.redirect('/dashboard');
        });

    })


});


//login page render
app.get('/', function(request, response) {
    if(sesh){
        response.redirect('dashboard');
    }else {
        response.render('login');
    }
    console.log('login page rendered');
});


//authorizing login info
app.get('/login', function(request, response) {
    var email = request.query.email;
    var password = request.query.password;
    Form.findOne({ email: email}, function(error, result) {
        console.log('User found ');
        // In case the user not found   
        if(error) {
            console.log('THIS IS ERROR RESPONSE')
            response.redirect('/');
        } 
        if (result && result.password === password){

            //if password and email match, go to dashboard and then find all acccount data
            console.log('User and password is correct')
            sesh = request.session;
            console.log()
            sesh.email = email
            console.log(sesh);
            response.redirect('/dashboard');
         
        } else {
            console.log("Credentials wrong");
            response.redirect('/');
        }              
    });

});


//dashboard rendered
app.get('/dashboard', function(request, response) {

    //change up this part . pass more data
    tableRes = {}; 
    accRes = {};

    if(!sesh){
        response.render('login');
    }

    else{    
        Form.find().where('email', sesh.email).exec(function(error, result){

            //if logged in account is admin, get all records
            if(result[0].accType=='admin'){
                Form.find().exec(function(error, result){
                    tableRes = result;
                })
            }
            //if logged in account is user, show only user accounts
            else{
                Form.find().where('accType', 'user').exec(function(error, result){
                    tableRes = result;
                })
            }


            //getting logged in user info
            Form.find().where('email', sesh.email).exec(function(error, result){
                var buClicked = 0;
                accRes = result[0];
                response.render('dashboard', {accInfo: accRes, tableInfo: tableRes, clicked: buClicked});
                console.log('dashboard rendered');
            })

        })
    }
});


//remove this if possible

//dashboard rendered with the constraints button is clicked
app.get('/dashboard/get', function(request, response) {

    //change up this part . pass more data
    tableRes = {}; 
    accRes = {};

    if(!sesh){
        response.render('login');
    }

    else{    
        Form.find().where('email', sesh.email).exec(function(error, result){

            //if logged in account is admin, get all records created by them
            if(result[0].accType=='admin'){
                Form.find({'createdBy': result[0]._id}).exec(function(error, result){
                    tableRes = result;
                })
            }
            //if logged in account is user, show only user accounts created by them
            else{
                Form.find({'createdBy': result[0]._id}).exec(function(error, result){
                    tableRes = result;
                })
            }

            //getting logged in user info
            Form.find().where('email', sesh.email).exec(function(error, result){
                var buClicked = 1;
                accRes = result[0];
                response.render('dashboard', {accInfo: accRes, tableInfo: tableRes, clicked: buClicked});
                console.log('dashboard rendered');
            })

        })
    }
});


app.get('/logout', function(request, response){
    sesh='';
    request.session.destroy(function(err) {
        // cannot access session here
    })
    console.log('logged out');
    response.redirect('/');
})


app.get('/dashboard/delete/:id', (request, response) => {
    id = request.params.id

    Form.remove({"_id": id }, function(err, result){
        if (err) {console.log(err)}
        else {console.log("Removed");}

        console.log(result);
        response.redirect('/dashboard');
    });
})


app.post('/dashboard/update', upload, function(request, response) {
    
    //response.send(request.body);
    var id = ObjectID(request.body.id);
    var userName = request.body.userName;
    var email = request.body.email;
    var accType = request.body.accType;
    var image;

    if(request.file){
        image = request.file.filename
    }


    if(request.file){
        //to delete previous image, 
        //retreive the recod using id
        //get image name and delete using fs
        //continue as below to update
        
        Form.find().where('email', request.body.email).exec(function(error, result){
            var oldImage = result[0].image;

            var filePath = __dirname + '\\images' + '\\' + oldImage;

            fs.unlink(filePath, (err) => {
                if (err){
                    console.log(err)
                    throw err
                    //response.render('/');
                }
                console.log('path/file.txt was deleted');
                console.log('filepath of deleted image', filePath);
            });
        })
        
        upload(request, response, function(err) {
            if(err) {
                console.log('file upload error:', err);

            }
            console.log('file uploaded', request.file);
        });

        Form.updateOne(
            {"_id": id},
            {$set: {
                "userName": userName,
                "email": email,
                "accType": accType,
                "image": image
            }},

        ).exec().then((data)=> {
            console.log(data);
            response.redirect('/dashboard');

        })
    }
    else{
        Form.updateOne(
            {"_id": id},
            {$set: {
                "userName": userName,
                "email": email,
                "accType": accType,
            }},

        ).exec().then((data)=> {
            console.log(data);
            response.redirect('/dashboard');

        })

    }
    
})

