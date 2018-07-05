'use strict'

const xmldom = require('xmldom')
const path = require('path')
const fs = require('fs')

let doc = null,
	monsterfile

function MonsterInfo(r,u){
	this.update = u
	if(r === 'EU') this.region = 'EU-EN'
	else this.region = r
	monsterfile = path.join(__dirname, '/monsters-'+ this.region + '.xml')
}

MonsterInfo.prototype.checkFiles = function(){

	if (!fs.existsSync(monsterfile)) {
		var monsterUrl = `https://raw.githubusercontent.com/neowutran/TeraDpsMeterData/master/monsters/monsters-${this.region}.xml`
		this.update.download(monsterUrl,monsterfile,this.createXmlDoc)
	}
	else {
		this.createXmlDoc()
	}
}

const errorHandler = {
	warning(msg) {
		console.log('xml parser warning' + msg)
	},

	error(msg) {
		console.log('xml parser error' + msg)
	},

	fatalError(msg) {
		console.log('xml parser fatal error' + msg)
	},
}


MonsterInfo.prototype.createXmlDoc = function() // async
{

	// moster xml file
	fs.readFile(monsterfile, "utf-8", function (err,data)
	{
		if (err) {
			return console.log(err)
		}
		const parser = new xmldom.DOMParser({ errorHandler })
		doc = parser.parseFromString(data, 'text/xml')
		if (!doc) {
			console.log('ERROR xml doc :' + monsterfile)
			return
		}
		//console.log('createXmlDoc'  + monsterfile)
	})

}

MonsterInfo.prototype.getNPCInfoFromXml = function (npc)
{
	var zone,mon
	if (!doc) return false
	try{
		var zone = doc.getElementsByTagName("Zone")
		for(var i in zone)
		{
			if(zone[i].getAttribute("id") == Number(npc.huntingZoneId)) {
				npc.zoneName = zone[i].getAttribute("name")
				//console.log(npc.zoneName)
				break
			}
		}

		var mon = zone[i].getElementsByTagName("Monster")
		for(var j in mon)
		{
			if(mon[j].getAttribute("id") == Number(npc.templateId)) {
				npc.npcName = mon[j].getAttribute("name")
				//console.log(npc.npcName)
				break
			}
		}
	}
	catch(err){
		return false
	}
	return true
}

module.exports = MonsterInfo
