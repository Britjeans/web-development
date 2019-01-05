var express     = require("express"),
    bodyParser  = require("body-parser"),
    app         = express(),
    User = require("./models/user"),
    Blog = require("./models/blog"),
    Planner = require("./models/planner"),
    LocalStrategy = require("passport-local"),
    passport = require("passport"),
    passportLocalMongoos = require("passport-local-mongoose"),
    mongoose    = require("mongoose"),
    flash = require("connect-flash"),
    methodOverride = require('method-override'),
    expressSanitizer = require("express-sanitizer"),
	middleware = require("./middleware"),
	sassMiddleware = require("node-sass-middleware"),
	path = require('path'),
	QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;

var ObjectId = require('mongodb').ObjectID;

//requiring routes
var indexRoutes = require("./routes/index")


//connect to mongodb databse
///mongodb://<dbuser>:<dbpassword>@ds129776.mlab.com:29776/wanyingd
mongoose.connect("mongodb://wanyingd:wanyingd1996@ds129776.mlab.com:29776/wanyingd");
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("successfully connected to mongodb");
});


app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.set("view engine", "ejs");
app.use(flash());

app.use(require("express-session")({
	secret: "secret",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

//use routes
app.use("/", indexRoutes);


//=========================
//Blog Routes
//=========================
//display all public blogs
app.get("/blogs/discover", function(req, res) {
	Blog.find({privacy: 'public'}, function(err, blogs) {
		if(err) {
			console.log(err);	
		}
		else {
			res.render("blogs/discover", {blogs: blogs});
		}
	});
});


app.get("/blogs/index", middleware.isLoggedIn, function(req, res){
	//find current user
	User.findOne({username: res.locals.currentUser.username}).populate("blogs").exec(function(err, foundUser){
		if(err){
			console.log("ERROR!");
		}
		else{
			res.render("blogs/index", {blogs: foundUser.blogs}); 
		}
	});
});

//create new blog
app.get("/blogs/new", function(req, res) {
	res.render("blogs/new");
})

app.post("/blogs/index", function(req, res) {
	//req.body.blog.content = new Document(req.body.blog.content['ops']);
	req.body.blog.content = req.sanitize(req.body.blog.content);
	var formData = req.body.blog;
	formData.author_name = res.locals.currentUser.nickname;
	formData.author_id = res.locals.currentUser._id;
	formData.privacy = req.body.blog_type;
	Blog.create(formData, function(err, newBlog) {
		//console.log(newBlog);
		//associate the blog with user
		if(err) {
			res.render("blogs/new");
		}
		else {
			User.findOne({username: res.locals.currentUser.username}).populate("blogs").exec(function(err, foundUser){
				if(err) {
					console.log(err);
					res.render("blogs/new");
				}
				else {
					foundUser.blogs.push(newBlog);
					foundUser.save(function(err, data){
	                	if(err){
	                    	console.log(err);
	                    	res.render("blogs/new");
	                	} else {
	                    	res.redirect("/blogs/index");
	                	}
            		});
					
				}
			});
		}
	});

});
//delete blog
app.delete("/blogs/:id", function(req, res) {

	Blog.findById(req.params.id, function(err, blog) {
		if(err) {
			console.log(err);
		}
		else {
			blog.remove();
			//remove reference from user
			User.update(
				{"blogs": req.params.id},
				{"$pull": {"blogs": req.params.id}},
				function(err, user) {
					if(err) {
						console.log(err);
					}
					else {
						console.log("successfully removed blog");
					}
				});
			res.redirect("/blogs/index");
		}
	});
});

//display blog
app.get("/blogs/:id", function(req, res) {
	Blog.findById(req.params.id ,function(err, blog) {
		if(err) {
			console.log(err);
			res.redirect("/blogs/index");
		}
		else {
			var cfg = {};
			blog.content = new QuillDeltaToHtmlConverter(JSON.parse(blog.content)["ops"]).convert();
			res.render("blogs/show", {blog: blog});
		}

	});
});
//edit blog
app.get("/blogs/:id/edit", function(req, res) {
	Blog.findById(req.params.id ,function(err, blog) {
		if(err) {
			console.log(err);
			res.redirect("/blogs/index");
		}
		else {

			res.render("blogs/edit", {blog: blog});
		}
	});
});

app.put("/blogs/:id", function(req, res){
	req.body.blog.privacy = req.body.blog_type;
   	Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, blog){
	    if(err){
	        console.log(err);
	    } else {
	        var showUrl = "/blogs/" + blog._id;
	        res.redirect(showUrl);
       	}
   	});
});

//public posts
app.get("/blogs/author/:id", function(req, res) {
		//find current user
	User.findOne({_id: req.params.id}).populate("blogs").exec(function(err, foundUser){
		if(err){
			console.log(err);
		}
		else{
			const blogs = foundUser.blogs.filter(isPublic);
			res.render("blogs/public_post", {blogs: blogs, author_name: foundUser.nickname}); 
		}
	});

	//res.render("blogs/public_post", {blogs: blogs});
});



//search function for blogs
app.post("/blogs/search", function(req, res) {
	var query = ".*" + req.body.search + ".*";
	Blog.find({title: new RegExp(query, "i"), privacy: "public" }, function(err, blogs) {
		if(err) {
			console.log(err);
		}
		else {
			res.render("blogs/search", {blogs: blogs});
		}
	});
	
});


//==========================================
//Planner Routes
//==========================================
app.get("/planner", function(req, res) {
	//get current time
	var date = new Date();
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var weekday = date.getDay();

	Planner.findOne({username: res.locals.currentUser.username, create: {"$gte": new Date(year, month-1, day-1), "$lt": new Date(year, month+1, day+5)}}, 
		function(err, plans) {
			if(err) {
				console.log(err);
			}
			else {
				if(!plans) {
					console.log(null);
					res.render("planner/index", {year: year, month: month, day: day, weekday: weekday,  plans: null});
				}
				else {
					res.render("planner/index", {year: year, month: month, day: day, weekday: weekday,  plans: plans});
				}
			}
		});
}); 

app.post("/planner", function(req, res) {
	var date = new Date();
	var year = date.getFullYear();
	var month = date.getMonth();
	var day = date.getDate();
	//add todo to databse
	Planner.findOne({username: res.locals.currentUser.username, create: {"$gte": new Date(year, month, day), "$lt": new Date(year, month, day+1)}}, function(err, plans) {
		if(err) {
			console.log(err);
		}
		else {
				if(plans) {
					var len = plans.length; 
					var plan_content = {plan: req.body.todo};
					plans.content.push(plan_content);
					plans.save(function(err, data) {
						if(err) {
							console.log(err);
						}
						else {
							console.log(data);
							res.redirect("/planner");
						}
					});

				}
				else {
					Planner.create({username: res.locals.currentUser.username}, function(err, newPlan) {
						if(err) {
							console.log(err);
						}
						else {
							var plan_content = {plan: req.body.todo};
							newPlan.content.push(plan_content);
							newPlan.save(function(err, data) {
								if(err) {
									console.log(err);
								}
								else {
									User.findOne({username: res.locals.currentUser.username}).populate("plans").exec(function(err, foundUser){
										if(err) {
											console.log(err);
										}
										else {
											foundUser.plans.push(newPlan);
											foundUser.save(function(err, data){
							                	if(err){
							                    	console.log(err);
							                	} else {
													res.redirect("/planner");
							                	}
						            		});
										}
									});
								}
							});
						}
					});
				}
		}
	});
});

app.delete("/plans/:id/delete/:plan_id", function(req, res) {
	Planner.update(
		{"_id": ObjectId(req.params.id)},
		{"$pull": {"content": {"_id": ObjectId(req.params.plan_id)}}},
		function(err, plans) {
			if(err) {
				console.log(err);
			}
			else {
				console.log("successfully removed event");
				res.redirect("/planner");
			}
	});
});


function isPublic(value) {
  return value.privacy == "public";
}


let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, function(){
	console.log("The Web Application is Running");
});