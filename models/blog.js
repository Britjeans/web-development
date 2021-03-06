var mongoose = require("mongoose");

var blogSchema = new mongoose.Schema({
	title: String,
	author_name:String,
	author_id: String,
	privacy: String,
	content: String,
	create: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Blog", blogSchema);