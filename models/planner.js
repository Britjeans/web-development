var mongoose = require("mongoose");

var plannerSchema = new mongoose.Schema({
	create: {type: Date, default: Date.now},
	username: String,
	content: [{
		plan: String
	}]
});

module.exports = mongoose.model("Planner", plannerSchema);