"use strict"

const Command = require('command')
const fs = require('fs')
const path = require('path')
const request = require('request')

String.prototype.color = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` }
String.prototype.numberWithCommas = function () { return this.replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
String.prototype.stripHTML = function () { return this.replace(/<[^>]+>/g, '') }

Number.prototype.nFormatter = function (digits) {
	var si = [
		{ value: 1,		symbol: "" },
		{ value: 1E3,	symbol: "K" },
		{ value: 1E6,	symbol: "M" },
		{ value: 1E9,	symbol: "G" },
		{ value: 1E12,	symbol: "T" },
		{ value: 1E15,	symbol: "P" },
		{ value: 1E18,	symbol: "E" }
	];
	var i;
	for (i = si.length - 1; i > 0; i--) {
		if (this >= si[i].value) {
			break;
		}
	}
	var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	var space = ''
	for (var j = 0; j < digits; j++) space += ''
	var ret = (this / si[i].value) + space
	return ret.slice(0, digits + 1).replace(rx, "$1") + si[i].symbol;
}

function TDM(d) {

	const UI = require('./ui')
	const Update = require('./update.js')
	const MonsterInfo = require('./monsterinfo')
	const SkillInfo = require('./skillInfo')
	const ManagerUi = require('./managerui')
	const customCommand = require('./customCommands.json')
	const config = require('./config.json')

	const command = Command(d)
	const ui = UI(d)

	const RANK_SERVER = 'http://tera.dvcoa.com.au:3000'
	const MAX_RECORD_FILE = 30
	const MAX_PARTY_MEMBER = 30
	const MAX_NPC = 100
	const MAX_BOSS = 50
	// # 0 = Hidden, 1 = Damage, 2 = Heal, 3 = MP
	const SKILL_TYPE_HIDDEN = 0
	const SKILL_TYPE_DAMAGE = 1
	const SKILL_TYPE_HEAL = 2
	const SKILL_TYPE_MP = 3

	let enable = config.enable,
		region = config.region,
		popup = config.popup,
		leaving_msg = config.party_leaving_msg,
		notice = config.notice,
		notice_damage = config.notice_damage,
		bossOnly = config.bossOnly,
		hideNames = config.hideNames,
		skillLog = config.skillLog,
		rankSystem = config.rankSystem,
		allUsers = config.allUsers,
		debug = config.debug

	let me = {},
		Boss = {},
		NPCs = [],
		party = [],
		currentParty = {},
		lastDps= [],
		sendCommand = [],
		currentbossId = '',
		currentZone = 0,
		maxSize = false,
		recordFilename = '',
		myName = 'Anonymous'

	let enable_color = '56B4E9',
		disable_color = 'E69F00',
		enraged_color = 'FF0000',
		cname_color = '00FFFF'		

	var update = new Update('version')
	var skillInfo = new SkillInfo(region, update)
	var monInfo = new MonsterInfo(region, update)
	var managerUi = new ManagerUi(d)

	update.checkUpdate()
	skillInfo.checkFiles()
	monInfo.checkFiles()
	setMe()
	// awesomnium web browser UI
	ui.use(UI.static(__dirname + '/html'))
	var router = require('./router/main')(ui, api, managerUi.api)

	function getData(param) {
		var paramRegex = /(\d*)(\D)/
		var data = param.match(paramRegex)
		data.shift()
		return data
	}

	function textDPSFormat(data) {
		var battleInfo = data.shift()
		data.sort(function(a, b) { return b.totalDamage - a.totalDamage })
		data.unshift(battleInfo)
		var dpsmsg = '[' + battleInfo.monsterBattleInfo.stripHTML() + ']'

		for (var i in data) {
			// if(i == 0) continue
			if (data[i].hasOwnProperty('enraged')) continue

			var name = '****'
			if (!hideNames) {
				name = data[i].name
			}
			
			var crit = data[i].crit  + '% '.color(disable_color)
			if (data[i].class == 6 || data[i].class == 7) {
				crit += ' (治疗暴率)' + data[i].healCrit  + '% '.color(enable_color)
			}
			dpsmsg += '\n'

			dpsmsg += '[DPS] '		+ data[i].dps.nFormatter(3) + '/s '							// DPS
			//dpsmsg += '[合计] '		+ data[i].totalDamage.nFormatter(3) + ' '				// 合计
			//dpsmsg += '[比例] '		+ data[i].percentage  + '%'.color(enable_color) + ' '	// 比例
			dpsmsg += '[暴率] '		+ crit + ' '												// 暴率(治疗)
			dpsmsg += '[' + name + ']'
			//dpsmsg += '[昵称] '		+ name + '\t\t'											// 昵称
			//dpsmsg += '==============='

		}
		return dpsmsg
	}

	function sendByEachLine(where, dpsjson) {
		let i = 0
		var msg = textDPSFormat(dpsjson).stripHTML()
		let msgs = msg.split('\n'),
		CounterId = setInterval( () => {
			// log(msgs)
			if (msgs.length > 0) {
				if (typeof where === 'string') {
					d.toServer('C_WHISPER', 1, {
						"target": where,
						"message": msgs.shift()
					})
				}
				if (typeof where === 'number') {
					d.toServer('C_CHAT', 1, {
						"channel": where,
						"message": msgs.shift()
					})
				}
			} else {
				clearInterval(CounterId)
				CounterId = -1
			}
		}, 1000)
	}

	function getRecordFile(fn) {
		try {
			return JSON.parse( fs.readFileSync(path.join(__dirname,'history', fn), 'utf8') )
		} catch (err) {
			// log(err)
		}
	}

	function DeleteFile(fn) {
		fs.unlinkSync(path.join(__dirname,'history', fn))
		// log('deleted history file : ' + fn)
	}

	function recordsFiles() {
		try {
			const { join } = require('path')
			const { lstatSync, readdirSync, renameSync } = require('fs')
			const isDirectory = source => lstatSync(source).isDirectory()
			const getDataFiles = source =>
				readdirSync(source).map(function (name) {
					if (!isDirectory(join(source, name)) && name.includes('.json'))
						return name
				})

			var files = getDataFiles(join(__dirname, 'history'))
			var fileNames = files.filter(function (element) {
				   return element !== undefined;
				});

			for (;fileNames.length > MAX_RECORD_FILE;) {
				DeleteFile(fileNames.shift())
			}
		} catch(err) {
			// log(err)
		}
		// log(files)
		return fileNames
	}

	function api(req, res) {
		const api = getData(req.params[0])
		var req_value = Number(api[0])
		// log(api)
		switch (api[1]) {
			case "A":
				notice_damage += 1000000
				if (notice_damage > 20000000) notice_damage = 1000000
					send('设定高伤害通知值 ' + notice_damage.toString().numberWithCommas().clr(enable_color))
				return res.status(200).json(notice_damage.toString())
			case "B":
				debug = !debug
				statusToChat('Debug模式 ', debug)
				return res.status(200).json("ok")
			case "C":
				if (req_value == 1 || req_value == 2) {
					if (recordFilename !== '') {
						sendByEachLine(req_value, getRecordFile(recordFilename))
						return res.status(200).json('ok')
					}
					var data = membersDps(currentbossId)
					if (data.length == 0 ) return res.status(200).json('ok')
					sendByEachLine(req_value, data)
					return res.status(200).json('ok')
				}

				if (req_value == 3) return res.status(200).json(customCommand)
				if (req_value == 4) {
					var cmd = req.params[0].substring(2, req.params[0].length)
					sendExec(cmd)
					return res.status(200).json('ok')
				}
			case "D":
				notice_damage = req_value
				send('设定高伤害通知值 ' + notice_damage.toString().numberWithCommas().clr(enable_color))
				return res.status(200).json(notice_damage.toString())
			case "E":
				return res.status(200).json(require('./ui_config.json'))
			case "F":
				if (req_value == 1) {	// delete file
					var filename = req.params[0].substring(2, req.params[0].length)
					// log('records system ' + filename)
					DeleteFile(filename)
					return res.status(200).json("deleted")
				}
				return res.status(200).json('ok')
			case "I":
				hideNames = !hideNames
				statusToChat('隐藏昵称 ', hideNames)
				return res.status(200).json("ok")
			case "L":
				if (req_value == 1) {	// skill Log enable/disable
					skillLog = !skillLog
					statusToChat('技能日志 ', skillLog)
					return res.status(200).json("ok")
				}
				if (req_value == 2) {	// skill Log
					var name = req.params[0].substring(2, req.params[0].length)
					for (var i in party) {
						if (party[i].name === name) {
							return res.status(200).json(party[i].Targets[currentbossId].skillLog)
						}
					}
				}
				leaveParty()
				return res.status(200).json('ok')
			case "N":
				notice = !notice
				statusToChat('高伤害通知 ', notice)
				return res.status(200).json("ok")
			case "O":
				bossOnly = !bossOnly
				statusToChat('只算BOSS ', bossOnly)
				return res.status(200).json("ok")
			case "P":
				popup = false
				statusToChat('DPS面板 ', popup)
				return res.status(200).json("ok")
			case "Q":
				update.update()
				return res.status(200).json('下载完成后重新启动代理')
			case "R":
				// Refresh DPS window
				if (req_value == 1) {
					var data = membersDps(currentbossId)
					if (data.length == 0) return res.status(200).json('')
					var battleInfo = data.shift()
					data.sort(function (a,b) {return b.totalDamage - a.totalDamage})
					data.unshift(battleInfo)
					if (sendCommand.length > 0) {
						var combined = data.concat(sendCommand)
						sendCommand = []
						return res.status(200).json(combined)
					}
					else return res.status(200).json(data)
				}
				// reank system
				if (req_value == 2) {
					rankSystem = !rankSystem
					statusToChat('上传数据 ', rankSystem)
					return res.status(200).json("ok")
				}
				// records system
				if (req_value == 3) {
					// log('records system')
					return res.status(200).json(recordsFiles())
				}
				if (req_value == 4) {
					recordFilename = req.params[0].substring(2, req.params[0].length)
					// log('records system ' + filename)
					return res.status(200).json(getRecordFile(recordFilename))
				}
				if (req_value == 5) {
					recordFilename = ''
					return res.status(200).json("ok")
				}
			case "S":
				// reset
				if (req_value == 100) {
					removeAllPartyDPSdata()
					return res.status(200).json('ok')
				}
				// skill info
				var _si = skillInfo.getSkillsJson(classIdToName(req_value))
				// var _si = skillInfo.getPetsSkillsJson().concat(skillInfo.getSkillsJson(classIdToName(req_value)))
				return res.status(200).json(_si)
			case "U":
				if (!debug) {
					toChat('此按钮仅用于调试模式')
					return res.status(200).json("no")
				}
				allUsers = maxSize = !allUsers
				ui.open()
				statusToChat('全部DPS ', allUsers)
				return res.status(200).json("ok")
			case "V":
				var ver = []
				ver.push(update.getVersion())
				return res.status(200).json(ver)
			case "W":
				var wname = req.params[0].substring(2, req.params[0].length)
				if (wname === '') return res.status(200).json('ok')
				if (recordFilename !== '') {
					sendByEachLine(wname, getRecordFile(recordFilename))
					return res.status(200).json('ok')
				} else {
					var data = membersDps(currentbossId)
					if ( data.length == 0 ) return res.status(200).json('ok')
					sendByEachLine(wname,data)
					return res.status(200).json('ok')
				}
				return res.status(200).json('ok')
			case "X":
				if (!debug) {
					toChat('此按钮仅用于调试模式')
					return res.status(200).json("no")
				}
				sendExec('重新加载TDM')
				return res.status(200).json("ok")
			case "Y":
				return res.status(200).json(getSettings())
			case "Z":
				if (maxSize) return res.status(200).json('300, 700')
				else return res.status(200).json('300, 240')
			default:
				return res.status(404).send("404")
		}
	}
	// packet handle
	function sLogin(e) {
		myName = e.name.toString()
		me = {
			"gameId": e.gameId.toString(),
			"serverId": e.serverId.toString(),
			"playerId": e.playerId.toString(),
			"templateId": e.templateId.toString(),
			"name": e.name.toString(),
			"class": Number((e.templateId - 1).toString().slice(-2))
		}
		putMeInParty(me)
	}

	function sSpawnMe(e) {
		me.gameId = e.gameId.toString()
		if (!popup) return
		ui.open()
		// log('sSpawnMe :' + currentbossId)
	}

	function sLoadTopo(e) {
		// gg reset
		// if(e.zone === 9714) d.toServer('C_RESET_ALL_DUNGEON', 1, {})
		currentZone = e.zone
	}

	function sAnswerInteractive(e) {
		if (debug) {
			d.send('C_REQUEST_USER_PAPERDOLL_INFO', 1, {
				name: e.name
			})
		}
	}

	function sBossGageInfo(e) {
		// notified boss before battle
		var id = e.id.toString()
		var hpMax = e.maxHp.toNumber()
		var hpCur = e.curHp.toNumber()
		// if(!isBoss(id)) setBoss(id)
		if (!Boss[id]) setBoss(id)
		Boss[id].hpPer = Math.floor(hpCur * 100 / hpMax)
	}

	function setBoss(id) {
		Boss[id] = {
			"enraged": false,
			"etimer": 0,
			"nextEnrage": 0,
			"hpPer": 0,
			"enragedTimer": 0,
			"estatus": ''
		}

		if (Object.keys(Boss).length >= MAX_BOSS) {
			for (var key in Boss) {
				delete Boss[key]
				break;
			}
		}
	}

	function isBoss(id) {
		if (!Boss[id]) return false
		else return true
	}

	function sDespawnNpc(e) {
		var id = e.gameId.toString()
		var npcIndex = getNPCIndex(id)
		var duration = 0

		if (npcIndex <0) return

		// remove : no battle, pet
		if (NPCs[npcIndex].battlestarttime == 0 || NPCs[npcIndex].owner !== "0") {
			NPCs.splice(npcIndex, 1)
			return
		}

		if (NPCs[npcIndex].battleendtime != 0) {
			// log('DOUBLE sDespawnNpc ERROR :' + NPCs[npcIndex].npcName)
			return
		}

		NPCs[npcIndex].battleendtime = Date.now()
		duration = NPCs[npcIndex].battleendtime - NPCs[npcIndex].battlestarttime

		if (isBoss(id)) {
			Boss[id].enraged = false
			Boss[id].etimer = 0
			Boss[id].estatus = ''
		}

		var dpsmsg = membersDps(id)

		if (!popup) {
			toChat(textDPSFormat(dpsmsg))
		}

		if (isBoss(id) && Boss[id].hpPer > 0) {
			// log('Boss despawn , templateId zoneId :' + NPCs[npcIndex].templateId +':'+ NPCs[npcIndex].huntingZoneId + ' HP :' + Boss[id].hpPer)
		}

		// GG
		if (NPCs[npcIndex].huntingZoneId === 713 && NPCs[npcIndex].templateId === 81301 && Boss[id].hpPer <= 20) {
			Boss[id].hpPer = 0
		}

		// 듀리안
		if (NPCs[npcIndex].huntingZoneId === 468 && NPCs[npcIndex].templateId === 2000 && Boss[id].hpPer <= 10) {
			Boss[id].hpPer = 0
		}
		if (NPCs[npcIndex].huntingZoneId === 768 && NPCs[npcIndex].templateId === 2000 && Boss[id].hpPer <= 10) {
			Boss[id].hpPer = 0
		}

		if (isBoss(id) && Boss[id].hpPer <= 0 && dpsmsg !== '') {
			addSkillLog(dpsmsg, id)
			dpsmsg[0].battleendtime = NPCs[npcIndex].battleendtime
			saveDpsData(dpsmsg)
			if (rankSystem) {
				sendDPSData(dpsmsg)
			}
		}

		NPCs[npcIndex].dpsmsg = dpsmsg
	}

	function sSpawnNpc(e) {
		var newNPC = {
			'gameId': e.gameId.toString(),
			'owner': e.owner.toString(),
			'huntingZoneId': e.huntingZoneId,
			'templateId': e.templateId,
			'zoneName': 'unknown',
			'npcName': e.npcName,
			'reset': false,
			'battlestarttime': 0,
			'battleendtime': 0,
			'totalPartyDamage': 0,
			'dpsmsg': ''
		}
		if (getNPCIndex(e.gameId.toString()) < 0) {
			if (NPCs.length >= MAX_NPC) NPCs.shift()
			monInfo.getNPCInfoFromXml(newNPC)
			NPCs.push(newNPC)
			// log('sSpawnNpc ' + newNPC.zoneName)
		}
	}

	function sNpcOccupierInfo(e) {
		if (e.cid.toNumber() == 0){
			// log(e)
			// log('sNpcOccupierInfo reset ' + e.cid)
			resetNpc(e)
		}
	}

	function sNpcStatus(e) {
		if (!isBoss(e.creature.toString())) return
		var id = e.creature.toString()
		if (e.enraged === 1 && !Boss[id].enraged) {
			// log(Boss[id].hpPer + ' Eraged !! not set yet ' + id + ' '+ e.target)
			Boss[id].etimer = 36
			setEnragedTime(id, null)
			Boss[id].enragedTimer = setInterval( () => {
				if (typeof Boss[id] !== 'undefined') {
					setEnragedTime(id,Boss[id].enragedTimer)
				} else {
					// log('Boss[id] === undefined')
				}
			}, 1000)
		} else if (e.enraged === 1 && Boss[id].enraged) {
			// log(Boss[id].hpPer + ' Eraged but already set ' + id + ' '+ e.target)
		} else if (e.enraged === 0 && Boss[id].enraged) {
			// log('Stopped enraged ' + id + ' '+ e.target)
			if (Boss[id].hpPer === 100) return
			Boss[id].etimer = 0
			setEnragedTime(id,Boss[id].enragedTimer)
			clearInterval(Boss[id].enragedTimer)
		}
	}

	function setEnragedTime(gId, counter) {
		// log(Boss[gId])
		if (Boss[gId].etimer > 0) {
			// log(Boss[gId].etimer + ' HP: ' + Boss[gId].hpPer)
			Boss[gId].enraged = true
			Boss[gId].estatus = 'Boss愤怒'.color(enraged_color) + ' ' + `${Boss[gId].etimer}`.color(cname_color) + ' 秒剩余'.color(enraged_color)
			Boss[gId].etimer--
		} else {
			clearInterval(counter)
			Boss[gId].etimer = 0
			Boss[gId].enraged = false
			Boss[gId].nextEnrage = (Boss[gId].hpPer > 10) ? (Boss[gId].hpPer - 10) : 0
			Boss[gId].estatus = '下次愤怒 ' + Boss[gId].nextEnrage.toString().color(enraged_color) + '%'
			if(Boss[gId].nextEnrage == 0) Boss[gId].estatus = ''
			// log(Boss[gId].hpPer + ' cleared enraged timer by Timer')
			// log('==========================================================')
		}
	}

	function resetNpc(e) {
		var id = e.npc.toString()
		var npcIndex = getNPCIndex(id)
		var duration = 0
		if (npcIndex <0) return
		// remove : no battle, pet
		if (NPCs[npcIndex].battlestarttime == 0 || NPCs[npcIndex].owner !== "0") {
			NPCs.splice(npcIndex,1)
			return
		}

		if (NPCs[npcIndex].battleendtime != 0) {
			// log('DOUBLE resetNpc ERROR :' + NPCs[npcIndex].npcName)
			return
		}

		NPCs[npcIndex].battleendtime = Date.now()
		duration = NPCs[npcIndex].battleendtime - NPCs[npcIndex].battlestarttime
		NPCs[npcIndex].reset = true

		if (isBoss(id)) {
			Boss[id].enraged = false
			Boss[id].etimer = 0
			Boss[id].estatus = ''
		}

		var dpsmsg = membersDps(id)

		if (isBoss(id) && Boss[id].hpPer > 0) {
			// log('Boss reset , templateId zoneId :' + NPCs[npcIndex].templateId +':'+ NPCs[npcIndex].huntingZoneId + ' HP :' + Boss[id].hpPer)
		}

		// GG
		if (NPCs[npcIndex].huntingZoneId === 713 && NPCs[npcIndex].templateId === 81301 && Boss[id].hpPer <= 20){
			Boss[id].hpPer = 0
		}

		// 듀리안
		if (NPCs[npcIndex].huntingZoneId === 468 && NPCs[npcIndex].templateId === 2000 && Boss[id].hpPer <= 10){
			Boss[id].hpPer = 0
		}

		if (NPCs[npcIndex].huntingZoneId === 768 && NPCs[npcIndex].templateId === 2000 && Boss[id].hpPer <= 10){
			Boss[id].hpPer = 0
		}

		if (isBoss(id) && Boss[id].hpPer <= 0 && dpsmsg !== '') {
			addSkillLog(dpsmsg, id)
			dpsmsg[0].battleendtime = NPCs[npcIndex].battleendtime
			saveDpsData(dpsmsg)
			// if(rankSystem) sendDPSData(dpsmsg)
		}

		NPCs[npcIndex].dpsmsg = dpsmsg
	}

	function binarySearchSkillName(d, t, s , e) {
		const m = Math.floor((s + e)/2);
		var target = Number(t);
		var id = Number(d[m].id);
		if (target == id) return d[m].skillName;
		if (e - 1 == s) return 'undefined';
	  	if (target > id) return binarySearchSkillName(d, t, m, e);
	  	if (target < id) return binarySearchSkillName(d, t, s, m);
	}

	function skillIdToName(id, _skillInfo) {
		if (_skillInfo.length == 0) return 'skill tsv missing'
		var sid = id.slice(1,id.length)
		return binarySearchSkillName(_skillInfo, sid, 0, _skillInfo.length - 1)
	}

	function dpsStastic(slog, sInfo) {
		var s = []
		// set skill name
		slog.forEach((sl) => {
			sl['name'] = skillIdToName(sl.skillId, sInfo)
		})

		slog.forEach((t) => {
			var id = t.skillId
			var name = t.name
			var damage = t.damage
			var c = t.crit
			var found = false
			// search skill id and insert data
			for (var j in s) {
				var stas = s[j]
				if (stas.name === name) {
					stas.wDamage = c ? stas.wDamage : stas.wDamage + damage
					stas.rDamage = c ? stas.rDamage + damage : stas.rDamage
					stas.tDamage = stas.rDamage + stas.wDamage
					stas.crit = c ? stas.crit + 1 : stas.crit,
					stas.hitCount = stas.hitCount + 1
					// console.log( stas.wDamage + ' ' + stas.wDamage)
					found = true
					break
				}
			}
			// not found push a new entity
			if (!found) {
				var d = {
					'name': name,
					'wDamage': c ? 0 : damage,
					'rDamage': c ? damage : 0,
					'tDamage': damage,
					'crit': c ? 1 : 0,
					'hitCount': 1
				}

				s.push(d)
				// console.log('pushed ' + id)
			}
		})
		// console.log(s)
		// sort by total damage
		s.sort(function (a, b) {
			return b.tDamage - a.tDamage
		})
		var html = `<table>
					<tr class="titleClr">
						<td rowspan=2>详细数据</td>
						<td>白字</td>
						<td>红字</td>
						<td>合计</td>
						<td>暴率</td>
					</tr>`
		html += `<tr class="titleClr">
					<td>平均</td>
					<td>平均</td>
					<td>平均</td>
					<td>红/合</td>
				</tr>`
		// console.log(s)
		var avg = 0
		for (var i in s) {
			// console.log(s[i].wDamage +' '+ s[i].rDamage)
			var t = s[i].wDamage + s[i].rDamage
			html += '<tr>'
			html += '<td class="center">' + `${s[i].name}`.color(disable_color) + '</td>'
			avg = 0
			if (s[i].hitCount - s[i].crit != 0) {
				avg = Math.floor(s[i].wDamage/(s[i].hitCount - s[i].crit))
			}
			html += '<td>' + s[i].wDamage.nFormatter(3) + '<br>' + avg.nFormatter(3) + '</td>'
			avg = 0
			if (s[i].crit != 0) {
				avg = Math.floor(s[i].rDamage/(s[i].crit))
			}
			html+='<td class="critClr">' + s[i].rDamage.nFormatter(3) + '<br>' + avg.nFormatter(3) + '</td>'
			avg = 0
			if (s[i].hitCount != 0) {
				avg = Math.floor(s[i].tDamage/(s[i].hitCount))
			}
			html += '<td class="totalClr">' + s[i].tDamage.nFormatter(3) + '<br>' + avg.nFormatter(3) + '</td>'
			html += '<td class="perClr">' + Math.floor(s[i].crit*100/s[i].hitCount) + '%' + '<br>' + s[i].crit + '/' + s[i].hitCount + '</td>'
			html += '</tr>'
		}
		html += '</table>'
		s = []
		return html
	}

	function sendDPSData(data) {
		// log(data)
		request.post({
			headers: {'content-type': 'application/json'},
			url: RANK_SERVER + '/uploadDps/test',
			// url: 'http://localhost:3000/uploadDps/test',
			form: data
		}, function (error, response, body) {
			// log(body)
			if (typeof body === 'undefined') {
				// log(error)
			}
		})
	}

	function saveDpsData(data) {
		// save first
		var json = JSON.stringify(data, null, '\t')
		var filename = path.join(__dirname, 'history', Date.now() + '.json')
		if (!fs.existsSync(path.join(__dirname, 'history'))) fs.mkdirSync(path.join(__dirname, 'history'))
		fs.writeFile(filename, json, 'utf8', (err) => {
			// throws an error, you could also catch it here
			if (err) throw err
			// success case, the file was saved
			// log('dps data saved!')
		})
	}
	//party handler
	function sDeadLocation(e) {
		if (currentbossId) {
			for (var i in party) {
				if (party[i].gameId === e.gameId.toString()) {
					if ( typeof party[i].Targets[currentbossId] !== 'undefined') {
						party[i].Targets[currentbossId].dead++
					} else {
						// log(e)
					}
				}
			}
		}
	}

	function sLeaveparty() {
		currentParty = {}
	}

	function sLeavePartyMember(e) {
	}

	function sPartyMemberList(e) {
		allUsers = false
		currentParty = {}
		e.members.forEach(member => {
			currentParty[member.gameId.toString()] = member.name
			var newPartyMember = {
				'gameId': member.gameId.toString(),
				'serverId': member.serverId.toString(),
				'playerId': member.playerId.toString(),
				'name': member.name,
				'class': member.class,
				'Targets': {}
			}
			if (!isPartyMember(member.gameId.toString(), member.name)) {
				for(;party.length >= MAX_PARTY_MEMBER;) {
					party.shift()
				}
				party.push(newPartyMember)
			}
		})
	}

	function sDespawnUser(e) {
		// only allUsers mode
		if (!allUsers) return
		var id = e.gameId.toString()
		for (var i in party) {
			if (id === party[i].gameId) {
				party.splice(i,1)
				break;
			}
		}
	}

	function sSpawnUser(e) {
		if (!allUsers) return
		// var uclass = Number((e.templateId - 1).toString().slice(-2)).toString()
		var uclass = (e.templateId - 10101) % 100;
		var newPartyMember = {
			'gameId': e.gameId.toString(),
			'serverId': e.serverId.toString(),
			'playerId': e.playerId.toString(),
			'name': e.name,
			'class': uclass,
			'Targets': {}
		}
		if (!isPartyMember(e.gameId.toString(), e.name)) {
			party.push(newPartyMember)
		}
	}

	function removeAllPartyDPSdata() {
		// log('removeAllPartyDPSdata')
		lastDps = []
		currentbossId = ''

		party.forEach((member) => {
			member.Targets = {}
		})

		NPCs.forEach((npc) => {
			npc.battlestarttime = 0
			npc.battleendtime = 0
		})
	}

	function leaveParty() {
		if (leaving_msg != '') {
			d.toServer('C_CHAT', 1, {
				"channel": 1,
				"message": leaving_msg
			})
		}
		setTimeout(
			function() {
				d.toServer('C_LEAVE_PARTY', 1, {
				})
			}, 1000
		)
	}

	function putMeInParty(m) {
		var newPartyMember = {
			'gameId': m.gameId,
			'playerId': m.playerId,
			'serverId': m.serverId,
			'templateId': m.templateId,
			'name': m.name,
			'class': m.class,
			'Targets': {}
		}
		if (!isPartyMember(me.gameId, m.name)) {
			party.push(newPartyMember)
		}
	}

	function getIndexOfPetOwner(sid, oid) {
		for (var i in party) {
			for (var j in NPCs) {
				if (NPCs[j].owner === party[i].gameId) {
					// pet attack
					if (NPCs[j].gameId === sid) {
						return [i,NPCs[j].npcName]
					}
					// pet projectile
					if (NPCs[j].gameId === oid) {
						return [i, NPCs[j].npcName]
					}
				}
			}
		}
		return -1
	}

	function getNPCIndex(gId) {
		for (var i in NPCs) {
			if (gId === NPCs[i].gameId) return i
		}
		return -1
	}

	function isPartyMember(gId, name) {
		for (var i in party) {
			if (name === party[i].name) { // TODO : need to check server ID
				// set new gId
				party[i].gameId = gId
				var removed = party.splice(i, 1)
				i--
			}
		}
		if (typeof removed !== 'undefined') {
			party.push(removed[0])
			return true
		}
		for (var i in party) {
			if (gId === party[i].gameId) return true
		}
		return false
	}

	function getPartyMemberIndex(id) {
		for (var i in party) {
			if (id === party[i].gameId) return i
		}
		return -1
	}

	function syncParty() {
		party.forEach(member => {
			if (typeof currentParty[member.gameId] === 'undefiend' && member.gameId !== me.gameId) {
				member.Targets = {}
			}
		})
	}
	// aggro
	function sNpcTargetuser(e) {
		if (!e.status) return
		var targetId = e.target.toString()
		var npcIndex = getNPCIndex(targetId)
		if (bossOnly && !isBoss(targetId)) return
		if (npcIndex < 0) return
		var flag = setCurBoss(targetId)
		if(!flag && !NPCs[npcIndex].reset) {
			// log('no reset ' + targetId)
			return
		}
		// log('sNpcTargetuser ' + targetId + ' ' + e.status)
		NPCs[npcIndex].battlestarttime = Date.now()
		NPCs[npcIndex].battleendtime = 0
		NPCs[npcIndex].reset = false
		NPCs[npcIndex].dpsmsg = ''
		if (isBoss(targetId)) {
			party.forEach((member) => { member.Targets = {} })
		}
	}

	function setCurBoss(gId) {
		if (currentbossId === gId) return false
		if (bossOnly && !isBoss(gId)) return false
		if (isBoss(gId) && currentZone != 950) syncParty()
		currentbossId = gId
		// log('setCurBoss currentbossId' + currentbossId)
		return true
	}

	function setMe() {
		if (party.length == 0) {
			readBackup()
			if (party.length == 0) return
			// log(me)
		}
	}
	// damage handler : Core
	function sEachSkillResult(e) {
		if (!enable) return
		// log('me.gameId :'+ me.gameId + '->'+ e.source.toString() +' ->'+ e.owner.toString())
		// log('[DPS] : ' + e.damage + ' target : ' + e.target.toString())
		var memberIndex = getPartyMemberIndex(e.source.toString())
		var sourceId = e.source.toString()
		var target = e.target.toString()
		var skill = e.skill.toString()
		var type = e.type // # 0 = Hidden, 1 = Damage, 2 = Heal, 3 = MP
		var damage = e.damage.toNumber()
		// if(e.blocked && e.damage.toNumber() > 0) log('sEachSkillResult blocked' + ' ' +  e.damage + ' ' + e.crit + ' ' + e.type + ' ' + skill)
		if (damage>0) {// && !e.blocked) {
			if (memberIndex >= 0) {
				// members damage
				addMemberDamage(memberIndex, target, damage, e.crit, type, skill)
			} else if (memberIndex < 0) {
				// projectile
				var ownerIndex = getPartyMemberIndex(e.owner.toString())
				if (ownerIndex >= 0) {
					var sourceId = e.owner.toString()
					addMemberDamage(ownerIndex, target, damage, e.crit,type, skill)
				} else { // pet
					var ret = getIndexOfPetOwner(e.source.toString(),e.owner.toString())
					var petOwnerIndex = ret[0]
					var petName = ret[1]
					if (petOwnerIndex >= 0) {
						log(petOwnerIndex + ' ' + petName)
						addMemberDamage(petOwnerIndex, target, damage, e.crit, type, skill, true, petName)
					}
				}
			}
		}
	}
	// damage : 53bit mantissa
	function addMemberDamage(memberIndex, targetId, damage, crit, type, skill, pet, petName) {

		if (currentZone == 950) {
		 	if (me.gameId === party[memberIndex].gameId)
				setCurBoss(targetId)
		} else {
			setCurBoss(targetId)
		}

		if (me.gameId === party[memberIndex].gameId && type == SKILL_TYPE_DAMAGE) {
			if (damage > notice_damage) {
				noticeDps(damage,skill)
			}
		}

		var npcIndex = getNPCIndex(targetId)
		if (npcIndex >= 0 ) {
			if (NPCs[npcIndex].battlestarttime == 0) {
				NPCs[npcIndex].battlestarttime = Date.now()
				NPCs[npcIndex].battleendtime = 0 // 지배석 버그
			}
			NPCs[npcIndex].totalPartyDamage = NPCs[npcIndex].totalPartyDamage + damage
		}

/*		if(type == SKILL_TYPE_DAMAGE || type == SKILL_TYPE_HIDDEN)
			log ('addMemberDamage ' + type + ' ' + party[memberIndex].name + ' ' + NPCs[npcIndex].npcName + ' ' + damage + ' ' + crit + ' ' + skill + ' ' + pet)
		else
			log ('addMemberDamage ' + type + ' ' + party[memberIndex].name + ' ' + damage + ' ' + crit + ' ' + skill + ' ' + pet)
*/
		if (type == SKILL_TYPE_DAMAGE || type == SKILL_TYPE_HIDDEN) {
			//new monster
			if (typeof party[memberIndex].Targets[targetId] === 'undefined') {
				// remove previous Targets when hit a new boss (exept HH)
				if (isBoss(targetId) && currentZone != 950) {
					party[memberIndex].Targets = {}
					// log('New targetId :' + targetId + ' ' + party[memberIndex].name)
				}
				party[memberIndex].Targets[targetId] = {}
				party[memberIndex].Targets[targetId].damage = damage
				party[memberIndex].Targets[targetId].dead = 0
				party[memberIndex].Targets[targetId].critDamage = crit? damage: 0
				party[memberIndex].Targets[targetId].hit = 1
				party[memberIndex].Targets[targetId].crit = crit
				party[memberIndex].Targets[targetId].heal = 0
				party[memberIndex].Targets[targetId].critHeal = 0
				party[memberIndex].Targets[targetId].healHit = 0
				party[memberIndex].Targets[targetId].healCrit = 0
				party[memberIndex].Targets[targetId].skillLog = []
				// log("new mon :" + party[memberIndex].Targets[targetId].damage)
			} else {
				// party[memberIndex].Targets[targetId].damage = Long.fromString(damage).add(party[memberIndex].Targets[targetId].damage).toString()
				party[memberIndex].Targets[targetId].damage += damage
				party[memberIndex].Targets[targetId].hit += 1
				if (crit) {
					party[memberIndex].Targets[targetId].critDamage += damage
					party[memberIndex].Targets[targetId].crit += 1
				}
				// log("cur mon :" + party[memberIndex].Targets[targetId].damage)
			}
			var skilldata = {
				'skillId': skill,
				'isPet': pet,
				'petName': petName,
				'type': type,
				'Time': Date.now(),
				'damage': damage,
				'crit': crit
			}
			party[memberIndex].Targets[targetId].skillLog.push(skilldata)
		}
		else if (type == SKILL_TYPE_HEAL && currentbossId) {
			if (typeof party[memberIndex].Targets[currentbossId] === 'undefined' ) {
				party[memberIndex].Targets[currentbossId] = {}
				party[memberIndex].Targets[currentbossId].heal = damage
				party[memberIndex].Targets[currentbossId].critHeal = crit ? damage : 0
				party[memberIndex].Targets[currentbossId].healHit = 1
				party[memberIndex].Targets[currentbossId].healCrit = crit
				party[memberIndex].Targets[currentbossId].damage = 0
				party[memberIndex].Targets[currentbossId].dead = 0
				party[memberIndex].Targets[currentbossId].critDamage = 0
				party[memberIndex].Targets[currentbossId].hit = 0
				party[memberIndex].Targets[currentbossId].crit = 0
				party[memberIndex].Targets[currentbossId].skillLog = []
			} else {
				// party[memberIndex].Targets[currentbossId].heal = Long.fromString(damage).add(party[memberIndex].Targets[currentbossId].heal).toString()
				party[memberIndex].Targets[currentbossId].heal += damage
				party[memberIndex].Targets[currentbossId].healHit += 1
				if (crit) {
					// party[memberIndex].Targets[currentbossId].critHeal = Long.fromString(party[memberIndex].Targets[currentbossId].critHeal).add(damage).toString()
					party[memberIndex].Targets[currentbossId].critHeal += damage
					party[memberIndex].Targets[currentbossId].healCrit += 1
				}
			}
			var skilldata = {
				'skillId': skill,
				'isPet': pet,
				'petName': petName,
				'type': type,
				'Time': Date.now(),
				'damage': damage,
				'crit': crit
			}
			party[memberIndex].Targets[currentbossId].skillLog.push(skilldata)
		}
		else if (type == SKILL_TYPE_MP) {

		}

	}

	function getSettings() {
		var settings = {
			"notice": notice,
			"noticeDamage": notice_damage,
			"bossOnly": bossOnly,
			"hideNames": hideNames,
			"skillLog": skillLog,
			"rankSystem": rankSystem,
			"allUsers": allUsers,
			"debug": debug,
			"partyLengh": party.length,
			"NPCsLength": NPCs.length,
			"myName": myName
		}
		return settings
	}

	function membersDps(targetId) {
		var endtime = 0
		var dpsJson= []

		if (targetId === '') return lastDps
		var npcIndex = getNPCIndex(targetId)
		// log('not in NPCs')
		if (npcIndex < 0) return lastDps

		// log('new NPC but battle not started')
		if (NPCs[npcIndex].battlestarttime == 0) return lastDps

		// log('for despawned NPC')
		if (NPCs[npcIndex].dpsmsg !== '') return NPCs[npcIndex].dpsmsg

		endtime = NPCs[npcIndex].battleendtime
		if (endtime == 0) endtime = Date.now()
		var battleduration = endtime - NPCs[npcIndex].battlestarttime
		// log(battleduration +  ' = ' + endtime + ' - ' + NPCs[npcIndex].battlestarttime)

		if (battleduration < 1000) battleduration = 1000 // for divide by zero error
		var battledurationbysec = Math.floor((battleduration) / 1000)

		var minutes = "0" + Math.floor(battledurationbysec / 60);
		var seconds = "0" + (battledurationbysec - minutes * 60);
		var monsterBattleInfo = NPCs[npcIndex].npcName + ' '
							// + Number(totalPartyDamage.div(battledurationbysec).toString()).nFormatter(3) + '/s '
							+ (NPCs[npcIndex].totalPartyDamage / battledurationbysec).nFormatter(3) + '/s '
							// + Number(NPCs[npcIndex].totalPartyDamage).nFormatter(3) + ' '
							+ NPCs[npcIndex].totalPartyDamage.nFormatter(3) + ' '
							+ minutes.substr(-2) + ":" + seconds.substr(-2)
		monsterBattleInfo = monsterBattleInfo.color(enable_color)

		dpsJson.push({
			"enraged": isBoss(targetId) ? Boss[targetId].estatus : '',
			"etimer": isBoss(targetId) ? Boss[targetId].etimer : 0,
			"eCountdown": isBoss(targetId) && Boss[targetId].nextEnrage != 0 ? Boss[targetId].hpPer - Boss[targetId].nextEnrage : 0,
			"monsterBattleInfo": monsterBattleInfo,
			"battleDuration": battleduration,
			"battleendtime": 0,
			//"totalPartyDamage": totalPartyDamage.toString(),
			"totalPartyDamage": NPCs[npcIndex].totalPartyDamage,
			"huntingZoneId": NPCs[npcIndex].huntingZoneId,
			"templateId": NPCs[npcIndex].templateId
		})

		// remove lowest dps member if over 30
		if (allUsers) {
			for (;party.length > MAX_PARTY_MEMBER;) {
				if (party[party.length -1].gameId === me.gameId) {
					party.splice(party.length -2,1)
				} else {
					party.pop()
				}
			}
		}

		var cname
		var dps = 0
		var percentage = 0
		var crit = 0, healCrit = 0

		for (var i in party) {
			if (NPCs[npcIndex].totalPartyDamage == 0 || battleduration <= 0 || typeof party[i].Targets[targetId] === 'undefined') {
				// log('no attack data yet for this member')
				continue
			}
			cname = party[i].name
/* 			if (party[i].gameId === me.gameId) {
				cname = cname.color(cname_color)
			} */

			// totalDamage = Long.fromString(party[i].Targets[targetId].damage)
			// dps = totalDamage.div(battledurationbysec).toString()
			// var percentage = totalDamage.multiply(100).div(totalPartyDamage).toString()

			dps = Math.floor(party[i].Targets[targetId].damage / battleduration * 1000)
			percentage = Math.floor(party[i].Targets[targetId].damage * 100 / NPCs[npcIndex].totalPartyDamage)


			if (party[i].Targets[targetId].crit == 0 || party[i].Targets[targetId].hit == 0) {
				crit = 0
			} else {
				crit = Math.floor(party[i].Targets[targetId].crit * 100 / party[i].Targets[targetId].hit)
			}

			if (party[i].class == 6 || party[i].class == 7) {
				if (party[i].Targets[targetId].healCrit == 0 || party[i].Targets[targetId].healHit == 0) {
					healCrit = 0
				} else {
					healCrit = Math.floor(party[i].Targets[targetId].healCrit * 100 / party[i].Targets[targetId].healHit)
				}
			}

			dpsJson.push({
				"gameId": party[i].gameId,
				"name": cname,
				"class": party[i].class,
				"serverId": party[i].serverId,
				"totalDamage": party[i].Targets[targetId].damage,
				"dps": dps,
				"percentage": percentage,
				"crit": crit,
				"healCrit": healCrit
			})
		}

		// To display last msg on ui even if boss removed from list by DESPAWN packet
		if (bossOnly && isBoss(targetId)) {
			lastDps = dpsJson
		}
		if (!bossOnly) {
			lastDps = dpsJson
		}

		return dpsJson
	}

	function addSkillLog(d, targetId) {
		for (var i in d) {
			if (d[i].hasOwnProperty('monsterBattleInfo')) continue
			var index = getPartyMemberIndex(d[i].gameId)
			if (index < 0) continue
			if (typeof party[index].Targets[targetId].skillLog === 'undefined') {
				// log('skillLog === undefined')
				// log(party[index])
				continue
			}
			var _si = skillInfo.getSkillsJson(classIdToName(party[index].class))
			// var _si = skillInfo.getPetsSkillsJson().concat(skillInfo.getSkillsJson(classIdToName(party[index].class)))
			d[i]['stastics'] = dpsStastic(party[index].Targets[targetId].skillLog, _si)
			// log(d[i]['stastics'])
		}
	}

	function noticeDps(damage, skill) {
		if (!notice) return
		var msg = ''
		msg = damage.nFormatter(3)
		// log(skill + ':' + skill.slice(1, skill.length))
		d.send('S_DUNGEON_EVENT_MESSAGE', 2, {
			type: 2, //70 : 2,
			message: `<img src="img://skill__0__${me.templateId}__${skill.slice(1,skill.length-2)}00" width="40" height="40" />&nbsp;${msg}`
		})
		return msg
	}

	function classIdToName(id) {
		if (id == 0) return 'Warrior'
		if (id == 1) return 'Lancer'
		if (id == 2) return 'Slayer'
		if (id == 3) return 'Berserker'
		if (id == 4) return 'Sorcerer'
		if (id == 5) return 'Archer'
		if (id == 6) return 'Priest'
		if (id == 7) return 'Mystic'
		if (id == 8) return 'Reaper'
		if (id == 9) return 'Gunner'
		if (id == 10) return 'Brawler'
		if (id == 11) return 'Ninja'
		if (id == 12) return 'Valkyrie'
		return ''
	}

    function writeBackup() {

		var backupPath = path.join(__dirname, 'backup')

		if (!fs.existsSync(backupPath)) {
			fs.mkdirSync(backupPath)
		}

		if (Object.keys(me).length != 0) {
			me.currentbossId = currentbossId
			fs.writeFileSync(path.join(backupPath, '_me.json'), JSON.stringify(me, null, '\t'))
			// log('_me.json written')
		}

		if (Object.keys(currentParty).length != 0) {
			fs.writeFileSync(path.join(backupPath, '_currentParty.json'), JSON.stringify(currentParty, null, '\t'))
			// log('_currentParty.json written')
	    }

		if (party.length != 0) {
			fs.writeFileSync(path.join(backupPath, '_party.json'), JSON.stringify(party, null, '\t'))
			// log('_party.json written')
		}

		if (NPCs.length != 0) {
			fs.writeFileSync(path.join(backupPath, '_NPCs.json'), JSON.stringify(NPCs, null, '\t'))
			// log('_NPCs.json written')
		}

		if (Object.keys(Boss).length != 0) {
			for (var key in Boss) {
				if(Boss[key].enragedTimer)
				Boss[key].enragedTimer = {}
				fs.writeFileSync(path.join(backupPath, '_Boss.json'), JSON.stringify(Boss, null, '\t'))
				// log('_Boss.json written')
			}
		}

    }

    function readBackup() {

		var backupPath = path.join(__dirname, 'backup')

		if (!fs.existsSync(backupPath)) {
			// log('backup directory doesnt exist!')
			return
		} try {
			if (fs.existsSync(path.join(backupPath, '_me.json'))) {
				// log('_me.json read')
				var data = fs.readFileSync(path.join(backupPath, '_me.json'), "utf-8")
				me = {}
				me = JSON.parse(data)
				currentbossId = me.currentbossId
				// log('currentbossId ' + currentbossId)
			}

			if (fs.existsSync(path.join(backupPath, '_party.json'))) {
				// log('_party.json read')
				data = fs.readFileSync(path.join(backupPath, '_party.json'), "utf-8")
				party = []
				party = JSON.parse(data)
			}

			if (fs.existsSync(path.join(backupPath, '_currentParty.json'))) {
				// log('_currentParty.json read')
				data = fs.readFileSync(path.join(backupPath, '_currentParty.json'), "utf-8")
				currentParty = {}
				currentParty = JSON.parse(data)
			}

			if (fs.existsSync(path.join(backupPath,'_Boss.json'))) {
				// log('_Boss.json read')
				data = fs.readFileSync(path.join(backupPath, '_Boss.json'), "utf-8")
				Boss = {}
				Boss = JSON.parse(data)
			}

			if (fs.existsSync(path.join(backupPath, '_NPCs.json'))) {
				// log('_NPCs.json read')
				data = fs.readFileSync(path.join(backupPath, '_NPCs.json'), "utf-8")
				NPCs = []
				NPCs = JSON.parse(data)
			}
		} catch(err) {
		    // log(err)
	    }

    }

	function toChat(msg) {
		if (!msg) return
		send(msg.clr('FF0000'))
	}

	function statusToChat(tag, val) {
		send(`${tag}` + `${val ? '启用'.color(enable_color) : '禁用'.color(disable_color)}`)
	}

	function send(msg) {
		command.message([...arguments].join('\n  - '.color('FFFFFF')))
	}

	function sendExec(msg) {
		command.exec([...arguments].join('\n  - '.color('FFFFFF')))
	}

	function sLog(e) {
		if (debug) {
			log(e)
		}
	}

	function log(msg) {
		if (debug) {
			console.log(`[${(new Date).toTimeString().slice(0,8)}] `, msg)
		}
	}

	function sChangeEvetMatchingState(e) {
		sendCommand = [{'command': 'matching alarm'}]
	}

	// command
	command.add('dps', (arg, arg2, arg3) => {
		// toggle
		if (!arg) {
			enable = true
			statusToChat('DPS计数器 ', enable)
		}
		else if (arg == 'u' || arg == 'ui') {
			popup = true
			statusToChat('DPS面板 ', popup)
			ui.open()
		}
		else if (arg == 't' || arg == 'test') {
			sendCommand = [{ 'command': 'matching alarm' }]
		} else {
			send(`无效参数.`.color('FF0000') + ' dps or dps u/ui')
		}
	})

	this.destructor = () => {
		writeBackup()
		command.remove('dps')
	}

/* 	d.hook('*', 'raw', (code, data, fromServer) => {
		return
		if (!debug) return
		let file = path.join(__dirname, '..', '..', 'tera-proxy-' + Date.now() + '.log')
		fs.appendFileSync(file, (fromServer ? '<-' : '->') + ' ' + (d.base.protocolMap.code.get(code) || code) + ' ' + data.toString('hex') + '\n')
		log ((fromServer ? '<-' : '->') + ' ' + (d.base.protocolMap.code.get(code) || code) + ' ' + data.toString('hex') + '\n')
		log ((fromServer ? '<-' : '->') + ' ' + (d.base.protocolMap.code.get(code) || code))
	}) */

	d.hook('S_LOGIN', 10, sLogin)
	d.hook('S_SPAWN_ME', 3, sSpawnMe)
	d.hook('S_LOAD_TOPO', 3, sLoadTopo)
	d.hook('S_ANSWER_INTERACTIVE', 2, sAnswerInteractive)
	d.hook('S_BOSS_GAGE_INFO', 3, sBossGageInfo)
	d.hook('S_SPAWN_NPC', 9, {order: 200}, sSpawnNpc)
	d.hook('S_DESPAWN_NPC', 3, sDespawnNpc)
	d.hook('S_NPC_OCCUPIER_INFO', 1, sNpcOccupierInfo)
	d.hook('S_NPC_STATUS', 1, sNpcStatus)

	d.hook('S_DEAD_LOCATION', 2, sDeadLocation)
	d.hook('S_LEAVE_PARTY', 1, sLeaveparty)
	d.hook('S_LEAVE_PARTY_MEMBER', 2, sLeavePartyMember)
	d.hook('S_PARTY_MEMBER_LIST', 7 , sPartyMemberList)
	d.hook('S_DESPAWN_USER', 3, sDespawnUser)
	d.hook('S_SPAWN_USER', 13, sSpawnUser)

	d.hook('S_NPC_TARGET_USER', 1, sNpcTargetuser)

	d.hook('S_EACH_SKILL_RESULT', 12, {order: 200}, sEachSkillResult)

	d.hook('S_CHANGE_EVENT_MATCHING_STATE', 2, sChangeEvetMatchingState)
}

module.exports = TDM
