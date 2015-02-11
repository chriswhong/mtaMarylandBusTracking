var allRoutes = require('./allRoutes.json');

//console.log(allRoutes);

var paramString = "";

allRoutes.result.retLineWithDirInfos.forEach(function(line){
	line.drInfos.forEach(function(dir){
		dirString = "{\"lineDirId\":\"" + dir.lineDirId + "\"},";
		//console.log(dirString);
		paramString += dirString;
	})
});

console.log(paramString.slice(0,-1));