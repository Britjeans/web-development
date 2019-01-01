var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");

const v = require("node-input-validator");

router.get('/', function(req, res) {
	res.render("index");
});

//===================
//User Identity Routs
//===================

//login function
router.get('/login', function(req, res) {
	res.render("login", {login_failure: false});
});

router.post('/login',function(req, res, next){
	//check the correctness of username and password

	passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.render('login', {login_failure: true}); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect("/blogs/index");
    });
  })(req, res, next);

});

//logout function
router.get('/logout', function(req, res) {
	req.logout();
	res.redirect("/");
});

//register function
router.get('/register', function(req, res) {
	res.render("register", { success: req.session.success, errors: req.session.errors, existed: false});
	req.session.errors = null;
	req.session.success = true;

});
	

router.post("/register", function(req, res) {
	let validator = new v( req.body, {
		username:'required|email',
		password: 'required',
        nickname: 'required'
	});
    validator.check().then(function (matched) {
        if (!matched) {
        	req.session.errors = validator.errors;
      		req.session.success = false;
            res.redirect("/register");
        }
        else{
        	//check whether exist
        	User.findOne({username: req.body.username}, function(err, user){
        		if(err) {
        			console.log(err);
        		}
        		else if(user != null) {
        			res.render("register", { success: req.session.success, errors: req.session.errors, existed: true});
        		}
        		else {
        			User.register(new User({username: req.body.username, nickname: req.body.nickname}), req.body.password, function(err, user) {
						if(err) {
							console.log(err);
						}
						passport.authenticate("local")(req,res,function(){
							res.redirect("/blogs/index");
						});
					});
        		}
        	});

        }
    });
});

router.get("/register_error", function(req, res){
    res.render("limit");
});

module.exports = router;




