﻿'use strict';
require('dotenv').config()
const debug = require('debug');
const express = require('express');
const path = require('path');
const passport = require('passport');
const favicon = require('serve-favicon');
const logger = require('morgan');
//const session = require('express-session');
const session = require('cookie-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

//Routes
const routes = require('./routes/index');
//const users = require('./routes/users');
//const database = require('./routes/database');
const book = require('./routes/book');
const randomwalk = require('./routes/randomwalk');
const app = express();

const {signin, refresh} = require('./authentication')
//const {google, callback, success, failure} = require('./googleauth')
const {verify} = require('./middleware')
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
//set passport strategy
var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
passport.use(new GoogleStrategy({
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: 'https://mi5117701.herokuapp.com/auth/google/callback'
	},
	function(accessToken, refreshToken, profile, done) {
		var user = {
			id : profile.id,
			token : accessToken
		};
		try {
			console.log(user);
			done(null, user);
		} catch (error) {
			console.log(error);
		}
	}
));
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(session({
	secret: 'ssshhhhh', 
	expires: new Date(Date.now() + (86400 * 1000)),
	resave: true,
	saveUninitialized: true
  }));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use('/', routes);
//app.use('/users',verify, users);
//app.use('/api/database',verify, database);
app.use('/api/randomwalk',verify, randomwalk);
app.use('/api/book',verify, book);
app.use('/api/signin', signin);
//app.use('/login', login);
app.use('/api/refrsh', refresh);

app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }), (req, res) => {
	console.log("Logging in via Google");
});

app.get('/auth/google/callback', passport.authenticate('google', { scope: ['email', 'profile'] }), (req, res) => {
	console.log(req.user);
	console.log('Callback landed');
	// Passportjs sends back the user attached to the request object, I set it as part of the session
	req.session.user = req.user;
	//sign jwt
	let accessToken = jwt.sign({userId: req.user.id}, process.env.ACCESS_TOKEN_SECRET, {	
        algorithm: "HS512",
        expiresIn: process.env.REFRESH_TOKEN_LIFE
    });
	res.cookie("jwt", accessToken, {secure: true, httpOnly: true, path:'/'})
    //res.send()
	// Redirect to budgeteer after the session has been set
	res.redirect("/");
});   
   
app.get('/logout', function (req, res){
	req.session = null;
	res.clearCookie('jwt', {secure: true, httpOnly: true, path:'/'});
    res.redirect('/login'); //Inside a callback… bulletproof!
/*   req.session.destroy(function (err) {
	res.clearCookie('jwt', {secure: true, httpOnly: true, path:'/'});
    res.redirect('/'); //Inside a callback… bulletproof!
  }); */
});
   
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
		console.log(err);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
	console.log(err);
    res.render('error', {
        message: err.message,
        error: err
    });
});

app.set('port', process.env.PORT || 8080);

var server = app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + server.address().port)
    debug('Express server listening on port ' + server.address().port);
});
