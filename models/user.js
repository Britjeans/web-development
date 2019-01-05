var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    nickname: String,
    blogs:[{
    	type: mongoose.Schema.Types.ObjectId,
    	ref: "Blog"
    }],
    plans: [{
    	type: mongoose.Schema.Types.ObjectId,
    	ref: "Planner"
    }]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);