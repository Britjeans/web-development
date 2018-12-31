
//parse json string
function convertToHTML(value) {
	var content = "";
	var obj = JSON.parse(value);
	for(let i = 0; i < obj["ops"].length; i++) {
		if(obj["ops"][i].hasOwnProperty("insert")) {
			if(obj["ops"][i]["insert"].hasOwnProperty("image")) {
				content += '<img src="' +obj["ops"][i]["insert"]["image"] + '"></img>';
			}
			else{				
				content += "<p>" + obj["ops"][i]	["insert"] + "</p>";
			}
		}
		
	}
	return content;
}