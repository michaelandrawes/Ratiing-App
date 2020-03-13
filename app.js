//jshint esversion:6

const express=require('express');
const cookieParser=require('cookie-parser');
const bodyParser=require('body-parser');
const ejs=require('ejs');
const engine=require('ejs-mate');
const session=require('express-session');


const mongoose=require('mongoose');
const MongoStore=require('connect-mongo')(session);
var flash = require('express-flash');
const passport = require('passport');
const LocalStrategy=require('passport-local').Strategy;
const FacebookStrategy=require('passport-facebook').Strategy;
const bcrypt=require('bcrypt-nodejs');
const expressValidator = require('express-validator');
const app=express();
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var async = require('async');




var crypto = require('crypto');
const formidable=require('formidable');
const path=require('path');
const fs=require('fs');

var _=require('underscore');


app.use(express.static('public'));
app.engine('ejs',engine);
app.set('view engine','ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//to make _ global
app.locals._=_;


//sesion
app.use(session({
  secret:'thisismytest',
  resave:false,
  saveUninitialized:false,
  store: new MongoStore({mongooseConnection:mongoose.connection})
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
//mongoose.connect('mongodb+srv://admin-michael:Test123@cluster0-2z6ej.mongodb.net/ratemeDB',{useNewUrlParser:true,useUnifiedTopology: true}); //this with payment
mongoose.connect('mongodb+srv://admin-michael:admin123@cluster0-hddv9.mongodb.net/rateMeDB',{useNewUrlParser:true,useUnifiedTopology: true});

 //mongoose.connect('mongodb://localhost/ratemeDB',{useNewUrlParser:true});

mongoose.set("useCreateIndex",true);


const companySchema=new mongoose.Schema({
  name:{type:String},
  address:{type:String},
  city:{type:String},
  country:{type:String},
  sector:{type:String},
  website:{type:String},
  image:{type:String,default:'defaultPic.png'},
  employees:[{
    employeeId:{type:String,default:''},
    employeeFullname:{type:String,default:''},
    employeeRole:{type:String,default:''}
  }],
  menus:[{
    menuImages:{type:String,default:'defaultPic.png'},
    // mainimage:{type:String,default:'defaultPic.png'}
  }],

  // images:[{
  //   mainimage:{type:String,default:'defaultPic.png'}
  // }],
  companyRating:[{
    companyName:{type:String,default:''},
    userFullname:{type:String,default:''},
    userRole:{type:String,default:''},
    companyImage:{type:String,default:''},
    userRating:{type:Number,default:0},
    userReview:{type:String,default:''}
  }],
  ratingNumber:[Number],
  ratingSum:{type:Number,default:0}
});

const categoriesSchema=new mongoose.Schema({
  name:{type:String},
  image:{type:String,default:'defaultPic.png'}
});

const messagesSchema=new mongoose.Schema({
  name:{type:String,required:true},
  email:{type:String,required:true},
  subject:{type:String,required:true},
  message:{type:String,required:true}
});
const userSchema=new mongoose.Schema({
  fullname:{type:String,required:true},
  email:{type:String,required:true},
  password:String,
  isAdmin:{type:String,default:'false'},
  role:{type:String,default:''},
  company:{
    name:{type:String,default:''},
    image:{type:String,default:''}
  },
  passwordResetToken:{type:String,default:''},
  passwordResetExpires:{type:Date,default:Date.now},
  //facebook login and signup
  facebook:{type:String,default:''},
  tokens:Array
});
userSchema.methods.encryptPassword=(password)=>{
  return bcrypt.hashSync(password,bcrypt.genSaltSync(10),null);
};
userSchema.methods.validPassword=function(password){
  return bcrypt.compareSync(password, this.password);
};

const User=mongoose.model("User",userSchema);
const Company=mongoose.model("Company",companySchema);
const Category=mongoose.model("Category",categoriesSchema);
const Message=mongoose.model("Message",messagesSchema);

// use static serialize and deserialize of model for passport session support
//this code like the blew code same
// passport.serializeUser(function(user,done){
//   done(null,user.id);
// });
passport.serializeUser((user,done)=>{
  done(null,user.id);
});

passport.deserializeUser((id,done)=>{
  User.findById(id,(err,user)=>{
    done(err,user);
  });
});

//make new mail and sign up
passport.use('local.signup',new LocalStrategy({
  usernameField:'email',
  passwordField:'password',
  passReqToCallback:true
},(req,email,password,done)=>{
  User.findOne({'email':email},(err,user)=>{
    if (err) {
      return done(err);
    }
    if (user) {
      return done(null,false,req.fash('error','User With Email Already Exist.'));
    }

//this code like the belw code as same
    // const newUser=new User({
    //   fullname:req.body.fullname,
    //   email:req.body.email,
    //   password:req.body.password
    // });
    // newUser.save((err)=>{
    //   return done(null,newUser);
    // });
    const newUser=new User();
    newUser.fullname=req.body.fullname;
    newUser.email=req.body.email;
    // newUser.isAdmin=req.body.isadmin;
    newUser.password=newUser.encryptPassword(req.body.password);
    newUser.save((err)=>{
      return done(null,newUser);
    });

  });
}));

//login method
passport.use('local.login',new LocalStrategy({
  usernameField:'email',
  passwordField:'password',
  passReqToCallback:true
},(req,email,password,done)=>{
  User.findOne({'email':email},(err,user)=>{
    if (err) {
      return done(err);
    }
    var messages=[];
    if (!user||!user.validPassword(password)) {
      messages.push('Email Does Not Exist Or Password is Invalid');
      return done(null,false,req.flash('error',messages));
    }

    return done(null,user);

  });
}));



//validator
app.use(expressValidator({
  errorFormatter: function(param,msg,value){
  var namespace=param.split('.'),
  root=namespace.shift(),
  formParam=root;

while (namespace.length) {
  formParam +='['+namespace.shift()+']';
}
return{
  param:formParam,
  msg:msg,
  value:value
};
  }
}));



//messages
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.get('*',(req,res,next)=>{
  res.locals.user=req.user||null;
  next();
});


app.get('/home',isLoggedIn,(req, res) => {
  Company.find({},function(err,company){
    Category.find({},function(err,foundCategories){
    res.render('home', {title: 'Home || October360',user:req.user,data:company,categories:foundCategories});
      });
      });
});

app.get('/',function(req,res){
 if (req.session.cookie.maxAge!==null) {
  res.redirect('/home');
}else {
    //res.render('index',{title:"Home || October360"});
    Company.find({},function(err,result){
      Category.find({},function(err,foundCategories){
      res.render('index',{title:'Home || October360',data:result,categories:foundCategories});
      });

    });
}
});

app.post("/",function(req,res){
  const companyID=req.body.btnDelete;
  Category.findByIdAndDelete(companyID,function(err){
    if(err){console.log(err);
    }else{

      console.log("Successfully Deleted");
      res.redirect("/");

  }
  });
});

app.get('/signup',function(req,res){
  var errors=req.flash('error');
  res.render('user/signup',{title:"Sign Up || October360",messages:errors,hasErrors:errors.length>0});
});

app.post('/signup',validate,passport.authenticate('local.signup',{
successRedirect:'/home',
failureRedirect:'/signup',
failureFlash:true
}));

//new way for validation for sign up
function validate(req,res,next){
  req.checkBody('fullname','Fullname is Required').notEmpty();
  req.checkBody('fullname','Fullname Must Not Be Less Than 5 Characters').isLength({min:5});
  req.checkBody('email','Email is Required').notEmpty();
  req.checkBody('email','Email is Invalid').isEmail();
  req.checkBody('password','Password is Required').notEmpty();
  req.checkBody('password','Password Must Not Be Less Than 5 Characters').isLength({min:5});
  req.check("password","Password Must Contain at least 1 Number.").matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, "i");

  const errors=req.validationErrors();
  if (errors) {
    var messages=[];
    errors.forEach((error)=>{
      messages.push(error.msg);
    });
    req.flash('error',messages);
    res.redirect('/signup');
  }else {
    return next();
  }
}

//new way for validation for sign up
function loginValidate(req,res,next){
  req.checkBody('email','Email is Required').notEmpty();
  req.checkBody('email','Email is Invalid').isEmail();
  req.checkBody('password','Password is Required').notEmpty();
  req.checkBody('password','Password Must Not Be Less Than 5 Characters').isLength({min:5});
  req.check("password","Password Must Contain at least 1 Number.").matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, "i");

  const errors=req.validationErrors();
  if (errors) {
    var messages=[];
    errors.forEach((error)=>{
      messages.push(error.msg);
    });
    req.flash('error',messages);
    res.redirect('/login');
  }else {
    return next();
  }
}

//to Authenticated all functions
function isLoggedIn(req,res,next){
  if (req.isAuthenticated()){
    next();
  }else {
    req.flash('error101','Unauthorized, Please Login.');
    res.redirect('/');

  }
}

app.get('/login',function(req,res){
    var errors=req.flash('error');
  res.render('user/login',{title:"login || October360",messages:errors,hasErrors:errors.length>0});
});
app.post('/login',loginValidate,passport.authenticate('local.login',{
//successRedirect:'/',
failureRedirect:'/login',
failureFlash:true
}),
//this part for remember me functionality
function(req,res){
  if (req.body.rememberme) {
    req.session.cookie.maxAge=30*24*60*60*1000 //30 days
  }else {
    req.session.cookie.expires=null;

  }
  res.redirect('/home');
}
);



app.get('/forgot',function(req,res){
    var errors=req.flash('error');
    var info=req.flash('info');
  res.render('user/forgot',{title:"Request Password Reset",messages:errors,hasErrors:errors.length>0,info:info,noErrors:info.length>0});
});


app.post('/forgot',function(req,res,next){
  async.waterfall([
    function(callback){
      crypto.randomBytes(20,function(err,buf){
        var rand=buf.toString('hex');
        callback(err,rand);
      });
      ///this fun to check the valid email and exist in database
    },function(rand,callback){
        User.findOne({'email':req.body.email},function(err,user){
          if (!user) {
            req.flash('error','No Account With That Email Exist Or Email is Invalid');
            return res.redirect('/forgot');
          }
          user.passwordResetToken=rand;
          user.passwordResetExpires=Date.now()+60*60*1000;

          user.save(function(err){
            callback(err,rand,user);
          });
        });
        //this fun to send maill to user
    },
    function(rand,user,callback){
      var smtpTransport=nodemailer.createTransport({
        service: 'Gmail',
        port: 587,
        secure: true,
        auth:{
          // user:'octobercity360@gmail.com',
          // pass:'october3602019'

                             user:'octobercity360@gmail.com',
                               pass:'lnlzlpogvuahokii'
        }
        ,tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    }
      });
      var mailOptions={
        to:user.email,
        from:'October 360'+'<'+'michaelreda202325@gmail.com'+'>',
        subject:'October 360 Application Password Resets Token',
        text:'You Have Requseted for Password Reset Token. \n\n'+
              'Please click on the link to complete the process: \n\n'+
              'https://www.october360.co/reset/'+rand+'\n\n'
      };
      //this part to enable send message
      // transporter.sendMail(mailOptions,function(err,response){
      //   req.flash('info','A password reset token has been sent to '+user.email);
      //   return callback(err,user);
      smtpTransport.sendMail(mailOptions, (err, response) => {
         req.flash('info', 'A password reset token has been sent to '+user.email);
          return callback(err, user);
      });
    }
  ],(err)=>{
    if (err) {
      return next(err);
    }
  res.redirect('/forgot');
  })
});


app.get('/reset/:token',function(req,res){
  //this code to check the expire of code
  User.findOne({passwordResetToken:req.params.token,passwordResetExpires:{$gt:Date.now()}},(err,user)=>{
    if (!user) {
      req.flash('error', 'Password reset token has expired or is invalid. Enter your email to get a new token.');
      return res.redirect('/forgot');
    }
    var errors=req.flash('error');
      var success=req.flash('success');
      res.render('user/reset',{title :'Reset Your Password',messages:errors,hasErrors:errors.length>0,success:success,noErrors:success.length>0});
  });

});

app.post('/reset/:token',function(req,res){
    async.waterfall([
      //check the xpire of link and the validation of password
      function(callback){
        User.findOne({passwordResetToken:req.params.token,passwordResetExpires:{$gt:Date.now()}},(err,user)=>{
          if (!user) {
            req.flash('error', 'Password reset token has expired or is invalid. Enter your email to get a new token.');
            return res.redirect('/forgot');
          }
          req.checkBody('password','Password is Required').notEmpty();
          req.checkBody('password','Password Must Not Be Less Than 5 Characters').isLength({min:5});
          req.check("password","Password Must Contain at least 1 Number.").matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, "i");

          var errors=req.validationErrors();
          if (req.body.password===req.body.cpassword) {
            if (errors) {
              var messages=[];
              errors.forEach(function(error){
                messages.push(error.msg);
              });
                var errors=req.flash('error');
                res.redirect('/reset/'+req.params.token);
            }else {
              user.password = user.encryptPassword(req.body.password);
              user.passwordResetToken=undefined;
              user.passwordResetExpires=undefined;

              user.save((err)=>{
                req.flash('success','Your password has been successfully updated.');
                callback(err,user);
              });
            }
          }else {
            req.flash('error','Password and confirm password are not equal.');
            res.redirect('/reset/'+req.params.token);
          }

        });
      },
      function(user, callback){
        var smtpTransport=nodemailer.createTransport({
          service: 'Gmail',
          port: 587,
          secure: true,
          auth:{
            // user:'octobercity360@gmail.com',
            // pass:'october3602019'

                             user:'octobercity360@gmail.com',
                               pass:'lnlzlpogvuahokii'

          }
          ,tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false
      }
        });

          var mailOptions = {
              to: user.email,
              from:'October 360'+'<'+'michaelreda202325@gmail.com'+'>',
              subject:'Your password has been updated.',
              text:'This is a confirmation that you updated the password for '+user.email
          };

          smtpTransport.sendMail(mailOptions, (err, response) => {
              callback(err, user);

              var error = req.flash('error');
              var success = req.flash('success');

              res.render('user/reset', {title: 'Reset Your Password', messages: error, hasErrors: error.length > 0, success:success, noErrors:success.length > 0});
          });
      }
    ]);
});

//
// app.get('/forgot', (req, res) => {
//     var errors = req.flash('error');
//
//     var info = req.flash('info');
//
// res.render('user/forgot', {title: 'Request Password Reset', messages: errors, hasErrors: errors.length > 0, info: info, noErrors: info.length > 0});
// });
//
// app.post('/forgot', (req, res, next) => {
//     async.waterfall([
//         function(callback){
//             crypto.randomBytes(20, (err, buf) => {
//                 var rand = buf.toString('hex');
//                 callback(err, rand);
//             });
//         },
//
//         function(rand, callback){
//             User.findOne({'email':req.body.email}, (err, user) => {
//                 if(!user){
//                     req.flash('error', 'No Account With That Email Exist Or Email is Invalid');
//                     return res.redirect('/forgot');
//                 }
//
//                 user.passwordResetToken = rand;
//                 user.passwordResetExpires = Date.now() + 60*60*1000;
//
//                 user.save((err) => {
//                     callback(err, rand, user);
//                 });
//             })
//         },
//
//         function(rand, user, callback){
//           var transporter = nodemailer.createTransport({
//             host: 'smtp.gmail.com',
//      port: 587,
//      secure: false,
//      requireTLS: true,
//               auth: {
//                 user:'octobercity360@gmail.com',
//                   pass:'lnlzlpogvuahokii'
//               }
//           });
//             var mailOptions = {
//                 to: user.email,
//                 from:'October 360'+'<'+'octobercity360@gmail.com'+'>',
//                 subject: 'RateMe Application Password Reset Token',
//                 text: 'You have requested for password reset token. \n\n'+
//                     'Please click on the link to complete the process: \n\n'+
//                     'http://localhost:3000/reset/'+rand+'\n\n'
//             };
//
//             transporter.sendMail(mailOptions, (err, response) => {
//                req.flash('info', 'A password reset token has been sent to '+user.email);
//                 return callback(err, user);
//             });
//         }
//     ], (err) => {
//         if(err){
//             return next(err);
//         }
//
//         res.redirect('/forgot');
//     })
// });
//
// app.get('/reset/:token', (req, res) => {
//
//     User.findOne({passwordResetToken:req.params.token, passwordResetExpires: {$gt: Date.now()}}, (err, user) => {
//         if(!user){
//             req.flash('error', 'Password reset token has expired or is invalid. Enter your email to get a new token.');
//             return res.redirect('/forgot');
//         }
//         var errors = req.flash('error');
//         var success = req.flash('success');
//
//         res.render('user/reset', {title: 'Reset Your Password', messages: errors, hasErrors: errors.length > 0, success:success, noErrors:success.length > 0});
//     });
// });
//
// app.post('/reset/:token', (req, res) => {
//     async.waterfall([
//         function(callback){
//             User.findOne({passwordResetToken:req.params.token, passwordResetExpires: {$gt: Date.now()}}, (err, user) => {
//                 if(!user){
//                     req.flash('error', 'Password reset token has expired or is invalid. Enter your email to get a new token.');
//                     return res.redirect('/forgot');
//                 }
//
//                 req.checkBody('password', 'Password is Required').notEmpty();
//                 req.checkBody('password', 'Password Must Not Be Less Than 5').isLength({min:5});
//                 req.check("password", "Password Must Contain at least 1 Number.").matches(/^(?=.*\d)(?=.*[a-z])[0-9a-z]{5,}$/, "i");
//
//                 var errors = req.validationErrors();
//
//                 if(req.body.password == req.body.cpassword){
//                     if(errors){
//                         var messages = [];
//                         errors.forEach((error) => {
//                             messages.push(error.msg)
//                         })
//
//                         var errors = req.flash('error');
//                         res.redirect('/reset/'+req.params.token);
//                     }else{
//                         user.password = user.encryptPassword(req.body.password);
//                         user.passwordResetToken = undefined;
//                         user.passwordResetExpires = undefined;
//
//                         user.save((err) => {
//                             req.flash('success', 'Your password has been successfully updated.');
//                             callback(err, user);
//                         })
//                     }
//                 }else{
//                     req.flash('error', 'Password and confirm password are not equal.');
//                     res.redirect('/reset/'+req.params.token);
//                 }
//
// //
//             });
//         },
//
//         function(user, callback){
//             var transporter = nodemailer.createTransport({
//               host: 'smtp.gmail.com',
//          port: 587,
//          secure: false,
//          requireTLS: true,
//                 auth: {
//                   user:'octobercity360@gmail.com',
//                   pass:'lnlzlpogvuahokii'
//                 }
//             });
//
//             var mailOptions = {
//                 to: user.email,
//                 from:'October 360'+'<'+'octobercity360@gmail.com'+'>',
//                 subject: 'Your password Has Been Updated.',
//                 text: 'This is a confirmation that you updated the password for '+user.email
//             };
//
//             transporter.sendMail(mailOptions, (err, response) => {
//                 callback(err, user);
//
//                 var error = req.flash('error');
//                 var success = req.flash('success');
//
//                 res.render('user/reset', {title: 'Reset Your Password', messages: error, hasErrors: error.length > 0, success:success, noErrors:success.length > 0});
//             });
//         }
//     ]);
// });
//


app.get('/logout',isLoggedIn,function(req,res){
  req.logout();
  req.session.destroy((err)=>{
    res.redirect('/');
  });
});

///facebook login and sign up
//create the middleware
passport.use(new FacebookStrategy({
  clientID:'2403038586476160',
  clientSecret:'1d0e02b46cce65bf7e27680b4e5aa7f1',
  profileFields:['email','displayName'],
  callbackURL:'https://www.october360.co/auth/facebook/callback',
  passReqToCallback:true

},(req,token,refreshToken,profile,done)=>{
  //find user or add user
  User.findOne({facebook:profile.id},(err,user)=>{
    if (err) {
      return done(err);
    }
    if (user) {
      return done(null,user);
    }else {
      var newUser=new User();
      newUser.facebook=profile.id;
      newUser.fullname=profile.displayName;
      newUser.email=profile._json.email;
      newUser.tokens.push({token:token});

      newUser.save((err)=>{
        return done(null,newUser);
      });
    }
  });
}))

app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'email'}));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}));

/////this part for company
app.get('/company/create',isLoggedIn,(req, res) => {
    var success = req.flash('success');
    var errors=req.flash('error');
    Company.find({},(err,company)=>{
      Category.find({},(err,foundCategories)=>{
        res.render('company/company', {title: 'Company Registration', user: req.user, success:success, noErrors: success.length > 0,messages:errors,hasErrors:errors.length>0,categories:foundCategories,data:company});
      });
    });

});

app.post('/company/create',companyValidate,(req, res) => {

    var newCompany = new Company();
    newCompany.name = req.body.name;
    newCompany.address = req.body.address;
    newCompany.city = req.body.city;
    newCompany.country = req.body.country;
    newCompany.sector = req.body.category;
    newCompany.website = req.body.website;
    newCompany.image = req.body.upload;

    newCompany.save((err) => {
        if(err){
            console.log(err);
        }

        req.flash('success', 'Company data has been added.');
        res.redirect('/company/create');
    })
});

function companyValidate(req,res,next){
  req.checkBody('name','Company name is Required').notEmpty();
  req.checkBody('address','Address is Required').notEmpty();
  req.checkBody('city','City is Required').notEmpty();
  req.checkBody('country','Country name is Required').notEmpty();
  req.checkBody('category','category is Required').notEmpty();
  req.checkBody('website','Website is Required').notEmpty();
  req.checkBody('website','Website is Invalid').isURL();
  req.checkBody('upload','image is Required').notEmpty();

  const errors=req.validationErrors();
  if (errors) {
    var messages=[];
    errors.forEach((error)=>{
      messages.push(error.msg);
    });
    req.flash('error',messages);
    res.redirect('/company/create');
  }else {
    return next();
  }
}
//for files

app.post('/upload',(req, res) => {
    var form = new formidable.IncomingForm();

    form.uploadDir = path.join(__dirname, '/public/uploads');

    form.on('file', (field, file) => {
       fs.rename(file.path, path.join(form.uploadDir, file.name), (err) => {
           if(err){
               throw err
           }

           console.log('File has been renamed');
       });
    });

    form.on('error', (err) => {
        console.log('An error occured', err);
    });

    form.on('end', () => {
        console.log('File upload was successful');
    });

    form.parse(req);

});

app.get('/companies',isLoggedIn,function(req,res){
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
      Company.find({name: regex},function(err,result){
        res.render('company/companies',{title:'All Companies || Octoober360',user:req.user,data:result});
      });
    } else {
  Company.find({},function(err,result){
    res.render('company/companies',{title:'All Companies || Octoober360',user:req.user,data:result});
  });
}
});

app.post("/companies",function(req,res){
  const companyID=req.body.btnDelete;
  Company.findByIdAndDelete(companyID,function(err){
    if(err){console.log(err);
    }else{

      console.log("Successfully Deleted");
      res.redirect("/companies");

  }
  });
});


app.get('/company-profile/:id',isLoggedIn,(req,res)=>{
  Company.findOne({'_id':req.params.id},function(err,data){
      var avg=arrayAverage(data.ratingNumber);
      res.render('company/company-profile',{title:'Company profile || October360',user:req.user,id:req.params.id,data:data,average:avg});
  });
});
app.post('/company-profile/:id',isLoggedIn,(req,res)=>{
  async.parallel([
    //first fun to update the employee of the company schema
    function(callback){
      Company.updateOne({
        '_id':req.params.id,
      },
      {
        $push:{menus:
          {menuImages:req.body.upload
            // ,mainimage:req.body.mainimage
          }}
      },(err,count)=>{
        if (err) {
          return next(err);
        }
        callback(err,count);
      }
    );
  },(err)=>{
    req.flash('success10','Your Image has been added.');
    res.redirect('/company-profile/'+req.params.id);
  }

  ]);
});
// app.get('/delete/:id',isLoggedIn,(req,res)=>{
//   Company.findOne({'_id':req.params.id},function(err,data){
//       var avg=arrayAverage(data.ratingNumber);
//       res.render('company/delete',{title:'Company profile- Delete || October360',user:req.user,id:req.params.id,data:data,average:avg});
//   });
// });
// app.post("/delete",function(req,res){
//   const postID=req.params.btnDelete;
//   Company.findByIdAndDelete(postID,function(err){
//     if(err){console.log(err);
//     }else{
//
//       console.log("Successfully Deleted");
//       res.redirect('/company-profile/'+req.params.id);
//
//   }
//   });
// });
// app.post('/company-profile/:id',isLoggedIn,(req,res)=>{
//   async.parallel([
//     //first fun to update the employee of the company schema
//     function(callback){
//       Company.updateOne({
//         '_id':req.params.id,
//       },
//       {
//         $push:{images:{mainimage:req.file.filename}}
//       },(err,count)=>{
//         if (err) {
//           const mainimage='noimage.jpg';
//           return next(err);
//         }
//         callback(err,count);
//       }
//     );
//   },(err)=>{
//     req.flash('success10','Your Image has been added.');
//     res.redirect('/company-profile/'+req.params.id);
//   }
//
//   ]);
// });


function addMenuValidate(req,res,next){
  req.checkBody('upload','image is Required').notEmpty();
  const errors=req.validationErrors();
  if (errors) {
    req.flash('error10','Please choose your image');
    res.redirect('/company-profile/'+req.params.id);
  }else {
    return next();
  }
}

app.get('/register-employee/:id',isLoggedIn,(req,res)=>{
  Company.findOne({'_id':req.params.id},function(err,data){
      res.render('company/register-employee',{title:'Register Member | October360',user:req.user,data:data});
  });
});

app.post('/register-employee/:id',(req,res,next)=>{
async.parallel([
  //first fun to update the employee of the company schema
  function(callback){
    Company.updateOne({
      '_id':req.params.id,
      'employees.employeeId':{$ne:req.user._id}
    },
    {
      $push:{employees:{employeeId:req.user._id,employeeFullname:req.user.fullname,employeeRole:req.body.role}}
    },(err,count)=>{
      if (err) {
        return next(err);
      }
      callback(err,count);
    }
  );
},function (callback){
  //take the data from company and passed to the userSchema
  async.waterfall([
    function(callback){
      Company.findOne({'_id':req.params.id},function(err,data){
        callback(err,data);
      });
      //user
    },function(data,callback){
      User.findOne({'_id':req.user._id},(err,result)=>{
        result.role=req.body.role;
        result.company.name=data.name;
        result.company.image=data.image;

        result.save(function(err){
          res.redirect('/home');
        });
      });
    }
  ]);
}
]);
});

app.get('/review/:id',isLoggedIn,function(req,res){
  var message=req.flash('success');
  Company.findOne({'_id':req.params.id},(err,data)=>{
      res.render('company/review',{title:'Company Review',user:req.user,data:data,msg:message,hasMsg:message.length>0});
  });
});

app.post('/review/:id',function(req,res){
  async.waterfall([
    function(callback){
      Company.findOne({'_id':req.params.id},(err,result)=>{
        callback(err,result);
      });
    },
    function(result,callback){
      Company.updateOne({
        '_id':req.params.id
      },
      {
        $push:{companyRating:{
          companyName: req.body.sender,
          userFullname:req.user.fullname,
          userRole:req.user.role,
          companyImage:req.user.company.image,
          userRating:req.body.clickedValue,
          userReview:req.body.review
        },
        ratingNumber:req.body.clickedValue
      },
      $inc:{ratingSum:req.body.clickedValue}
    },(err)=>{
      req.flash('success','Your review has been added.');
      res.redirect('/review/'+req.params.id);
    }
    );
    }
  ])
});

//average part
var arrayAverage=(arr)=>{
  return _.reduce(arr,(num1,num2)=>{
    return num1+num2;
  },0)/(arr.length===0?1:arr.length);
}

//to view all members at company
app.get('/:name/employees',isLoggedIn,(req,res)=>{
  Company.findOne({'name':req.params.name},(err,data)=>{
    res.render('company/employees',{title:'Company Members',user:req.user,data:data});
  });

});

app.get('/companies/leaderboard',isLoggedIn,function(req,res){
  Company.find({},function(err,result){
    res.render('company/leaderboard',{title:'Companies Leaderboard || October360',user:req.user,data:result});
  }).sort({'ratingSum':-1});
});

app.get('/company/search',isLoggedIn,function(req,res){
    Company.find({},function(err,company){
      res.render('company/search',{title:'Find a Company || October360',user:req.user,data:company});

    });
});
//
// app.post('/company/search',function(req,res){
//   var name=req.body.search;
//   var regex=new RegExp(name,'i');
//
//   Company.find({'$or':[{'name':regex}]},(err,data)=>{
//     // if (err) {
//     //
//     //   res.redirect('/company/search');
//     // }
//
//    res.redirect('/company-profile/'+data[0]._id);
//   });
// });

app.get('/company/addcategory',isLoggedIn,function(req,res){
  var success = req.flash('success');
  var errors = req.flash('error');
  Company.find({},function(err,company){
  res.render('company/addcategory',{title:'Add Category',data:company,user:req.user,success:success, noErrors: success.length > 0,messages:errors,hasErrors:errors.length>0});
  });
});

app.post('/company/addcategory',addCompanyValidate,function(req,res){

  var newCategory=new Category();

    newCategory.name=req.body.category;
    newCategory.image = req.body.upload;
    newCategory.save(function(err){
     if(err){
         console.log(err);
     }

     req.flash('success', 'Category has been added.');
     res.redirect('/company/addcategory');
   });
});

function addCompanyValidate(req,res,next){
  req.checkBody('category','Category name is Required').notEmpty();
  req.checkBody('upload','image is Required').notEmpty();

  const errors=req.validationErrors();
  if (errors) {
    var messages=[];
    errors.forEach((error)=>{
      messages.push(error.msg);
    });
    req.flash('error',messages);
    res.redirect('/company/addcategory');
  }else {
    return next();
  }
}

app.get('/category/:categoryName',isLoggedIn,(req,res)=>{
Company.find({'sector':req.params.categoryName},function(err,company){
  if (!err) {
    res.render('company/category',{title:req.params.categoryName,user:req.user,data:company});
  }
});
});

app.get('/messages',function(req,res){
  Company.find({},function(err,company){
    Message.find({},function(err,message){
    res.render('company/messages',{title:'Messages',user:req.user,data:company,msg:message});
    });
  });
});

app.post("/messages",function(req,res){
  const messageID=req.body.btnDelete;
  Message.findByIdAndDelete(messageID,function(err){
    if(err){console.log(err);
    }else{

      console.log("Successfully Deleted");
      res.redirect("/messages");

  }
  });
});

app.post('/',function(req,res){
var newMessage=new Message();
  newMessage.name=req.body.name;
  newMessage.email=req.body.email;
  newMessage.subject=req.body.subject;
  newMessage.message=req.body.message;
  newMessage.save(function(err){
    if(err){
        console.log(err);
    }
    req.flash('success101', 'Message has been Sent.');
    res.redirect('/');
  });
});


app.post('/home',function(req,res){
var newMessage=new Message();
  newMessage.name=req.body.name;
  newMessage.email=req.body.email;
  newMessage.subject=req.body.subject;
  newMessage.message=req.body.message;
  newMessage.save(function(err){
    if(err){
        console.log(err);
    }
    req.flash('success101', 'Message has been Sent.');
    res.redirect('/home');
  });
});

function escapeRegex(text) {

    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

};


app.listen(process.env.PORT||3000,function(){
  console.log('app is running on 3000');
});
