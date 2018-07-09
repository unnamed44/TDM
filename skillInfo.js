'use strict'
const path = require('path')
const fs = require('fs')

let skillsfile

function tsvJSON(tsv){

  var lines=tsv.split("\n");
  var result = [];
  var headers=lines[0].split("\t");
  for(var i=1;i<lines.length;i++){
	  var obj = {};
	  var currentline=lines[i].split("\t");
	  for(var j=0;j<headers.length;j++){
		  obj[headers[j]] = currentline[j];
	  }
	  result.push(obj);
  }
  return JSON.stringify(result); //JSON
}

function SkillInfo(r,u){
	this.update = u
	if(r === 'EU') this.region = 'EU-EN'
	else this.region = r
	skillsfile = path.join(__dirname, '/monsters-'+ this.region + '.xml')
}

MonsterInfo.prototype.checkFiles = function(){

	if (!fs.existsSync(skillsfile)) {https://github.com/neowutran/TeraDpsMeterData/tree/master/skills
		var skillsfileUrl = `https://raw.githubusercontent.com/neowutran/TeraDpsMeterData/master/skills/skills-${this.region}.tsv`
		this.update.download(skillsfileUrl,skillsfile,this.createSkillsJson)
	}
	else {
		this.createSkillsJson()
	}
}


MonsterInfo.prototype.createSkillsJson = function()
{
	var skilltsv = fs.readFileSync(skillsfile, "utf-8"), 'utf-8')
	var skills = tsvJSON(skilltsv)
}

module.exports = SkillInfo
