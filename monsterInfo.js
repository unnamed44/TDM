'use strict'

const xmldom = require('xmldom')
const path = require('path')
const fs = require('fs')
const TeraDataUrl = 'https://raw.githubusercontent.com/neowutran/TeraDpsMeterData/master'

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

function MonsterInfo(r,u) {
	let update = u,
		region = 'NA',
		doc = null,
		monsterfile

	if (r === 'EU') region = 'EU-EN'
	else region = r
	monsterfile = path.join(__dirname, '/monsters-'+ region + '.xml')

	this.checkFiles = function () {
		CheckFiles()
	}

	async function CheckFiles() {
		if (!fs.existsSync(monsterfile)) {
			var monsterUrl = `${TeraDataUrl}/monsters/monsters-${region}.xml`
			try {
				var result = await update.download(monsterUrl,monsterfile)
			} catch(err) {
				console.log(err)
			}
		}
		//console.log('createDoc')
		createXmlDoc()
	}

	function createXmlDoc() {
		// moster xml file
		const parser = new xmldom.DOMParser({ errorHandler })
		doc = parser.parseFromString(fs.readFileSync(monsterfile, "utf-8"), 'text/xml')
		if (!doc) {
			console.log('ERROR xml doc :' + monsterfile)
			return
		}
	}

	this.getNPCInfoFromXml = function (npc) {
		var zone,mon
		if (!doc) return false
		try {
			var zone = doc.getElementsByTagName("Zone")
			for (var i in zone) {
				if (zone[i].getAttribute("id") == Number(npc.huntingZoneId)) {
					npc.zoneName = zone[i].getAttribute("name")
					//console.log(npc.zoneName)
					break
				}
			}
			var mon = zone[i].getElementsByTagName("Monster")
			for (var j in mon) {
				if(mon[j].getAttribute("id") == Number(npc.templateId)) {
					npc.npcName = mon[j].getAttribute("name")
					//console.log(npc.npcName)
					break
				}
			}
		} catch(err) {
			return false
		}
		return true
	}

}

module.exports = MonsterInfo
