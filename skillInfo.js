'use strict'
const path = require('path')
const fs = require('fs')

let skillsfile

function getSkillsFromTsv(tsv,className){
	var lines=tsv.split("\n");
	var result = [];
	var headers= ["id","NA","NA","className","skillName"]
	for(var i=1;i<lines.length;i++){
		var obj = {};
		var currentline=lines[i].split("\t");
		if( currentline[3] === className){
			for(var j=0;j<headers.length;j++){
				obj[headers[j]] = currentline[j];
			}
			result.push(obj);
		}
	}
	return result; //JSON
}

function SkillInfo(r,u){
	this.update = u
	if(r === 'EU') this.region = 'EU-EN'
	else this.region = r
	skillsfile = path.join(__dirname, '/skills-'+ this.region + '.tsv')
}

SkillInfo.prototype.checkFiles = function(){

	if (!fs.existsSync(skillsfile)) {
		var skillsfileUrl = `https://raw.githubusercontent.com/neowutran/TeraDpsMeterData/master/skills/skills-${this.region}.tsv`
		this.update.download(skillsfileUrl,skillsfile,null)
	}
}

SkillInfo.prototype.getSkillsJson = function(className)
{
	var skilltsv = fs.readFileSync(skillsfile, "utf-8")
	return getSkillsFromTsv(skilltsv,className)
}

module.exports = SkillInfo
