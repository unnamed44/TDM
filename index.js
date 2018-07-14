/**
* Created on 2018-05-21.
*/
"use strict"
const Command = require('command')
const Long = require("long")
const fs = require('fs')
const path = require('path')
const request = require('request')

String.prototype.color = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` }

Long.prototype.divThousand = function() {
	var stringValue = this.toString()
	return stringValue.substring(0, stringValue.length - 3)
}

const MAX_BAM_HISTORY = 10
const MAX_PARTY_MEMBER = 30
const MAX_NPC = 50
const MAX_BOSS = 50

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
	let enable = config.enable,
	notice = config.notice,
	notice_damage = config.notice_damage,
	debug = config.debug,
	leaving_msg = config.party_leaving_msg,
	bossOnly = config.bossOnly,
	region = config.region


	let me,
	Boss = new Object(),
	NPCs = new Array(),
	party = new Array(),
	BAMHistory = new Object(),
	lastDps= new Array(),
	currentbossId = '',
	allUsers = false,
	maxSize = false,
	hideNames = false,
	skillLog = true,
	popup = true,
	rankSystem = true

	let enable_color = 'E69F00',
	disable_color = '56B4E9'
	var update = new Update('version')
	var skillInfo = new SkillInfo(region,update)
	var monInfo = new MonsterInfo(region,update)
	var managerUi = new ManagerUi(d)
	update.checkUpdate()
	skillInfo.checkFiles()
	monInfo.checkFiles()

	// awesomnium web browser UI
	ui.use(UI.static(__dirname + '/html'))
	var router = require('./router/main')(ui,api,managerUi.api)

	function getData(param) {
		var paramRegex = /(\d*)(\D)/
		var data = param.match(paramRegex)
		data.shift()
		return data
	}

	function unitDps(dps)
	{
		if(dps.length <= 5) return numberWithCommas(dps) + ' /s '
		if(dps.length > 5 && dps.length < 10) {
			 var kdps= dps.substring(0, dps.length - 3)
			 return numberWithCommas(kdps) + 'k/s '
		}
		if(dps.length >= 10) {
			var mdps= dps.substring(0, dps.length - 6)
			return numberWithCommas(mdps) + 'm/s '
		}
	}

	function unitDmg(dps)
	{
		if(dps.length <= 5) return numberWithCommas(dps) + ' '
		if(dps.length > 5 && dps.length < 10) {
			 var kdps= dps.substring(0, dps.length - 3)
			 return numberWithCommas(kdps) + 'k '
		}
		if(dps.length >= 10) {
			var mdps= dps.substring(0, dps.length - 6)
			return numberWithCommas(mdps) + 'm '
		}
	}

	function textDPSFormat(data)
	{
		var dpsmsg = ''
		dpsmsg += stripOuterHTML(data[0].monsterBattleInfo) + '\n'
		for(var i in data){
			//if(i == 0) continue
			if(data[i].hasOwnProperty('enraged')) continue
			if(hideNames) data[i].name='HIDDEN'
			dpsmsg 	+=data[i].name + ' '+ unitDps(data[i].dps) + 'DPS '
			+ unitDmg(data[i].totalDamage) + 'Dmg '
			+ data[i].percentage  + '% ofTot '.color(enable_color)
			+ data[i].crit  + '% Crit '.color(enable_color) + '\n'


		}
		return dpsmsg
	}

	function sendByEachLine(where,dpsjson)
	{

		let i = 0
		var msg = textDPSFormat(dpsjson)
		let msgs = msg.split('\n'),
		CounterId = setInterval( () => {
			//log(msgs)
			if (msgs.length > 0) {
				if(typeof where === 'string') d.toServer('C_WHISPER', 1, {"target": where,"message": msgs.shift()})
				if(typeof where === 'number') d.toServer('C_CHAT', 1, {"channel":where,"message": msgs.shift()})
			} else {
				clearInterval(CounterId)
				CounterId = -1
			}
		}, 1000)
	}

	function getRecordFile(fn)
	{
		return JSON.parse( fs.readFileSync(path.join(__dirname,'history',fn), 'utf8') )
	}

	function recordsFiles()
	{
		const { join } = require('path')
		const { lstatSync, readdirSync ,renameSync} = require('fs')
		const isDirectory = source => lstatSync(source).isDirectory()
		const getDataFiles = source =>
			readdirSync(source).map(function(name){
				if(!isDirectory(join(source, name)) && name.includes('.json'))
					return name
			})

		var files = getDataFiles(join(__dirname,'history'))
		var fileNames = files.filter(function( element ) {
			   return element !== undefined;
			});
		log(files)
		return fileNames
	}

	function api(req, res) {
		const api = getData(req.params[0])
		var req_value = Number(api[0])
		//log(api)
		switch(api[1]) {
			case "A":
			notice_damage += 1000000
			if(notice_damage > 20000000) notice_damage = 1000000
			send('Notice damage is ' + numberWithCommas(notice_damage.toString()))
			return res.status(200).json(notice_damage.toString())
			case "B":
			debug = !debug
			statusToChat('Debug mode',debug)
			return res.status(200).json("ok")
			case "C":
			if(req_value == 1 || req_value == 2){
				if(lastDps === '' ) return res.status(200).json('ok')
				sendByEachLine(req_value,lastDps)
				return res.status(200).json('ok')
			}

			if(req_value == 3) return res.status(200).json(customCommand)
			if(req_value == 4){
				var cmd = req.params[0].substring(2, req.params[0].length)
				sendExec(cmd)
				return res.status(200).json('ok')
			}

			case "D":
			notice_damage = req_value
			send('Notice damage is ' + numberWithCommas(notice_damage.toString()))
			return res.status(200).json(notice_damage.toString())
			case "E":
			return res.status(200).json(require('./ui_config.json'))
			case "H":
			return res.status(200).json(BAMHistory)
			case "I":
			hideNames = !hideNames
			statusToChat('hideNames',hideNames)
			return res.status(200).json("ok")
			case "L":
			if(req_value == 1) // skill Log enable/disable
			{
				skillLog = !skillLog
				statusToChat('skillLog',skillLog)
				return res.status(200).json("ok")
			}
			if(req_value == 2) // skill Log
			{
				var name = req.params[0].substring(2, req.params[0].length)
				for(var i in party)
				{
					if(party[i].name === name) {
						return res.status(200).json(party[i].skillLog)
					}
				}
			}
			leaveParty()
			return res.status(200).json('ok')
			case "N":
			notice = !notice
			statusToChat('notice damage',notice)
			return res.status(200).json("ok")
			case "O":
			bossOnly = !bossOnly
			statusToChat('boss Only',bossOnly)
			return res.status(200).json("ok")
			case "P":
			popup = false
			statusToChat('dps popup',popup)
			return res.status(200).json("ok")
			case "Q":
			update.update()
			return res.status(200).json("restart proxy after downloads finish.")
			case "R":
			// Refresh DPS window
			if(req_value == 1){
				var dpsdata = membersDps(currentbossId)
				return res.status(200).json(dpsdata)
			}
			//reank system
			if(req_value == 2){
				rankSystem = !rankSystem
				statusToChat('rankSystem',rankSystem)
				return res.status(200).json("ok")
			}
			//records system
			if(req_value == 3){
				//log('records system')
				return res.status(200).json(recordsFiles())
			}
			if(req_value == 4){
				var filename = req.params[0].substring(2, req.params[0].length)
				//log('records system ' + filename)
				return res.status(200).json(getRecordFile(filename))
			}
			case "S":
			//reset
			if(req_value == 100){
				removeAllPartyDPSdata()
				return res.status(200).json('ok')
			}
			// skill info
			return res.status(200).json(skillInfo.getSkillsJson(classIdToName(req_value)))
			case "U":
			if(!debug) {
				toChat('This button is only for debug mode')
				return res.status(200).json("no")
			}
			allUsers = maxSize =  !allUsers
			ui.open()
			statusToChat('Count all dps',allUsers)
			return res.status(200).json("ok")
			case "V":
			var ver = []
			ver.push(update.getVersion())
			return res.status(200).json(ver)
			ver = []
			case "W":
			var wname = req.params[0].substring(2, req.params[0].length)
			if(wname === '' || lastDps === '' ) return res.status(200).json('ok')
			sendByEachLine(wname,lastDps)
			return res.status(200).json('ok')
			case "X":
			if(!debug) {
				toChat('This button is only for debug mode')
				return res.status(200).json("no")
			}
			sendExec('reload TDM')
			return res.status(200).json("ok")
			case "Y":
			return res.status(200).json(getSettings())
			case "Z":
			if(maxSize) return res.status(200).json('320,700')
			else return res.status(200).json('320,250')
			default:
			return res.status(404).send("404")
		}
	}

	// packet handle
	function sLogin(e){
		//party = []
		//NPCs = []
		//BAMHistory = {}
		//Boss = {}
		me = {
			"gameId":e.gameId.toString(),
			"serverId":e.serverId.toString(),
			"playerId":e.playerId.toString(),
			"templateId":e.templateId.toString(),
			"name":e.name.toString(),
			"class":Number((e.templateId - 1).toString().slice(-2)).toString()
		}
		putMeInParty(me)
		writeBackup()
	}

	function sSpawnMe(e){
		me.gameId=e.gameId.toString()
		currentbossId = ''
		//NPCs = []
		if (!popup) return
		// empty command
		ui.open()
		//log('sSpawnMe')
	}


	function sLoadTopo(e){
		// gg reset
		if(e.zone === 9714) d.toServer('C_RESET_ALL_DUNGEON', 1, {})
	}

	function sAnswerInteractive(e){
		if(debug){
			d.send('C_REQUEST_USER_PAPERDOLL_INFO', 1, {
				name: e.name
			})
		}
	}

	function sBossGageInfo(e){
		// notified boss before battle
		var id = e.id.toString()
		var hpMax = e.maxHp
		var hpCur = e.curHp
		if(!isBoss(id)) setBoss(id)
		Boss[id].hpPer = Number(hpCur.multiply(100).div(hpMax))
	}

	function setBoss(id)
	{
		Boss[id] = {
			"enraged" : false,
			"etimer" : 0,
			"nextEnrage" : 0,
			"hpPer" : 0,
			"enragedTimer" : 0,
			"estatus" : ''
		}

		if(Object.keys(Boss).length >= MAX_BOSS){
			for(var key in Boss) {
				clean(Boss[key])
				break
			}
		}
	}

	function isBoss(id)
	{
		if(typeof Boss[id] === 'undefined') return false
		else return true
	}

	function sSpawnNpc(e){
		var newNPC = {
			'gameId' : e.gameId.toString(),
			'owner' : e.owner.toString(),
			'huntingZoneId' : e.huntingZoneId,
			'templateId' : e.templateId,
			'zoneName' : 'unknown',
			'npcName' : e.npcName,
			'battlestarttime' : 0,
			'battleendtime' : 0,
			'totalPartyDamage' : '0',
			'dpsmsg' : ''
		}
		if(getNPCIndex(e.gameId.toString()) < 0)
		{
			if(NPCs.length >= MAX_NPC)
			{
				var removed = NPCs.shift()

				for(var i in party)
				if(typeof party[i].NPCInfo[removed.gameId] !== 'undefined') clean(party[i].NPCInfo[removed.gameId])
			}
			monInfo.getNPCInfoFromXml(newNPC)
			NPCs.push(newNPC)
			//log('sSpawnNpc '+newNPC.zoneName)
		}
	}
	function BigInt(n)
	{
		return Number(n)
	}

	function binarySearchSkillName(d, t, s , e)
	{
		const m = Math.floor((s + e)/2);
		var target = Number(t)
		var id = Number(d[m].id)
		if (target == id) return d[m].skillName;
		if (e - 1 == s) return 'undefined'
	  	if (target > id) return binarySearchSkillName(d,t,m,e);
	  	if (target < id) return binarySearchSkillName(d,t,s,m);
	}

	function skillIdToName(id,_skillInfo)
	{
		if(_skillInfo.length == 0) return 'skill tsv missing'
		var sid = id.slice(1,id.length)
		return binarySearchSkillName(_skillInfo, sid, 0, _skillInfo.length - 1)
	}

	function dpsStastic(slog,sInfo)
	{
		var s= []

		// set skill name
		for (var i in slog)
		{
			slog[i]['name'] = skillIdToName(slog[i].skillId,sInfo)
		}

		for(var i in slog)
		{
			var t=slog[i]
			var id = t.skillId
			var name = t.name
			var damage = BigInt(t.damage)
			var c = t.crit

			var found = false
			// search skill id and insert data
			for (var j in s)
			{
				if(s[j].name === name)
				{
					s[j].wDamage = c ? s[j].wDamage : BigInt(s[j].wDamage) + damage
					s[j].rDamage = c ? BigInt(s[j].rDamage) + damage : s[j].rDamage
					s[j].tDamage = BigInt(s[j].rDamage) + BigInt(s[j].wDamage)
					s[j].crit = c ? s[j].crit + 1 : s[j].crit,
					s[j].hitCount = s[j].hitCount + 1

					//console.log( s[j].wDamage + ' ' + s[j].wDamage)
					found = true
					break
				}
			}

			// not found push a new entity
			if(!found){
				var d = {
					'name' : name,
					'wDamage' : c ? BigInt(0) : (damage),
					'rDamage' : c ? (damage) : BigInt(0),
					'tDamage' : damage,
					'crit' : c ? 1 : 0,
					'hitCount' : 1
				}

				s.push(d)
				//console.log('pushed ' + id)
			}
		}
		//console.log(s)
		// sort by total damage
		s.sort(function(a,b) {
			if(a.tDamage > b.tDamage) return -1
			else if(a.tDamage < b.tDamage) return 1
			else return 0
		})

		var html = '<table><tr><td>Skill Name</td><td>White Dmg</td><td>Red Dmg</td><td>Total Dmg</td><td>Crit</td></tr>'
		for(var i in s){
				var t = s[i].wDamage + s[i].rDamage
				html+='<tr>'
				html+='<td>' + s[i].name + '</td>'
				html+='<td>' +unitDmg(s[i].wDamage.toString()) + '<br>Hit : ' + (s[i].hitCount-s[i].crit) + '</td>'
				html+='<td>' +unitDmg(s[i].rDamage.toString()) + '<br>' + s[i].crit + '</td>'
				html+='<td>' +unitDmg(s[i].tDamage.toString()) + '<br>' + s[i].hitCount + '</td>'
				html+='<td>' + Math.floor(s[i].crit*100/s[i].hitCount) + '%'.color('E69F00') + '<br>'+s[i].crit+'/'+s[i].hitCount+'</td>'
				html+='</tr>'
		}
		html+='</table>'
		s = []
		return html
	}

	function sendDPSData(data)
	{
		//log(data)
		request.post({
			headers: {'content-type': 'application/json'},
			url: 'http://tera.dvcoa.com.au:3000/uploadDps/test',
			//url: 'http://localhost:3000/uploadDps/test',
			form: data
		}, function(error, response, body){
			//log(body)
			if(typeof body === 'undefined') log(error)
		})
	}

	function saveDpsData(data)
	{
		// save first
		var json = JSON.stringify(data, null, '\t')

		var filename = path.join(__dirname,'history',Date.now()+'.json')

		if (!fs.existsSync(path.join(__dirname,'history'))) fs.mkdirSync(path.join(__dirname,'history'))

		fs.writeFile(filename, json, 'utf8', (err) => {
			// throws an error, you could also catch it here
			if (err) throw err
			// success case, the file was saved
			//log('dps data saved!')
		})

	}

	function sNpcStatus(e){
		if(!isBoss(e.creature.toString())) return
		var id = e.creature.toString()

		if (e.enraged === 1 && !Boss[id].enraged) {
			//log(Boss[id].hpPer + ' Eraged !! not set yet ' + id + ' '+ e.target)
			Boss[id].etimer = 36
			setEnragedTime(id,null)
			Boss[id].enragedTimer = setInterval( () => {
				setEnragedTime(id,Boss[id].enragedTimer)
			}, 1000)
		} else if (e.enraged === 1 && Boss[id].enraged) {
			//log(Boss[id].hpPer + ' Eraged but already set ' + id + ' '+ e.target)
		} else if (e.enraged === 0 && Boss[id].enraged) {
			//log('Stopped enraged ' + id + ' '+ e.target)
			if (Boss[id].hpPer === 100) return
			Boss[id].etimer = 0
			setEnragedTime(id,Boss[id].enragedTimer)
			clearInterval(Boss[id].enragedTimer)
		}
	}

	function setEnragedTime(gId,counter)
	{
		//log(Boss[gId])
		if (Boss[gId].etimer > 0) {
			//log(Boss[gId].etimer + ' HP: ' + Boss[gId].hpPer)
			Boss[gId].enraged = true
			Boss[gId].estatus = 'Boss Enraged'.color('FF0000') + ' ' + `${Boss[gId].etimer}`.color('FFFFFF') + ' seconds left'.color('FF0000')
			Boss[gId].etimer--
		} else {
			clearInterval(counter)
			Boss[gId].etimer = 0
			Boss[gId].enraged = false
			Boss[gId].nextEnrage = (Boss[gId].hpPer > 10) ? (Boss[gId].hpPer - 10) : 0
			Boss[gId].estatus = 'Next enraged at ' + Boss[gId].nextEnrage.toString().color('FF0000') + '%'
			if(Boss[gId].nextEnrage == 0) Boss[gId].estatus = ''
			//log(Boss[gId].hpPer + ' cleared enraged timer by Timer')
			//log('==========================================================')
		}
	}

	//party handler
	function sLeavePartyMember(e){
		//var id = e.playerId.toString()
		//for(var i in party){
		//	if(id===party[i].playerId) party.splice(i,1)
		//}
	}

	function sLeaveparty(e){
		//party = []
		//putMeInParty()
	}

	function sPartyMemberList(e){
		allUsers = false
		//party = []

		e.members.forEach(member => {
			var newPartyMember = {
				'gameId' : member.gameId.toString(),
				'serverId' : member.serverId.toString(),
				'playerId' : member.playerId.toString(),
				'name' : member.name.toString(),
				'class' : member.class,
				'NPCInfo' : new Array(),
				'skillLog' : new Array()
			}
			if(!isPartyMember(member.gameId.toString())) {
				for(;party.length >= MAX_PARTY_MEMBER;) {
					party.shift()
				}
				party.push(newPartyMember)
			}
		})
	}

	function sDespawnUser(e){
		// only allUsers mode
		if(!allUsers) return
		var id = e.gameId.toString()
		for(var i in party){
			if(id===party[i].gameId) party.splice(i,1)
		}
	}

	function sSpawnUser(e){
		if(!allUsers) return
		var uclass = Number((e.templateId - 1).toString().slice(-2)).toString()
		var newPartyMember = {
			'gameId' : e.gameId.toString(),
			'serverId' : e.serverId.toString(),
			'playerId' : e.playerId.toString(),
			'name' : e.name.toString(),
			'class' : uclass,
			'NPCInfo': new Array(),
			'skillLog' : new Array()
		}
		if(!isPartyMember(e.gameId.toString()) ) {
			//if(party.length >= 30) party.shift()
			party.push(newPartyMember)
		}
	}

	function removeAllPartyDPSdata()
	{
		BAMHistory = {}
		lastDps =''
		for(var i in party ){
			party[i].skillLog = []
			party[i].NPCInfo = []
		}

		for(var key in NPCs){
			NPCs[key].battlestarttime=0
			NPCs[key].battleendtime=0
		}
	}

	function leaveParty()
	{
		if(leaving_msg!=''){
			d.toServer('C_CHAT', 1, {
				"channel": 1,
				"message": leaving_msg
			})
		}
		setTimeout(function(){ d.toServer('C_LEAVE_PARTY', 1, { }) }, 1000)
	}

	function putMeInParty(m)
	{
		var newPartyMember = {
			'gameId' : m.gameId,
			'playerId' : m.playerId,
			'serverId' : m.serverId,
			'templateId' : m.templateId,
			'name' : m.name,
			'class' : m.class,
			'NPCInfo': new Array(),
			'skillLog': new Array()
		}

		if(!isPartyMember(me.gameId)) {
			party.push(newPartyMember)
		}
	}

	function getIndexOfPetOwner(sid,oid)
	{
		for(var i in party){
			for(var j in NPCs){
				if(NPCs[j].owner===party[i].gameId){
					// pet attack
					if(NPCs[j].gameId===sid) {
						return i
					}
					// pet projectile
					if(NPCs[j].gameId===oid) {
						return i
					}
				}
			}
		}
		return -1
	}

	function getNPCIndex(gId){
		for(var i in NPCs){
			if(gId===NPCs[i].gameId) return i
		}
		return -1
	}

	function isPartyMember(gid){
		for(var i in party){
			if(gid===party[i].gameId) return true
		}
		return false
	}

	function getPartyMemberIndex(id){
		for(var i in party){
			if(id===party[i].gameId) return i
		}
		return -1
	}

	function setCurBoss(gid)
	{
		if(currentbossId === gid) return
		if(bossOnly && !isBoss(gid)) return
		currentbossId = gid
	}
	// damage handler : Core
	function sEachSkillResult(e){
		if(!enable) return
		// read from saved : for reloading TDM
		if(party.length == 0) {
			readBackup()
			if(party.length == 0) return
			me = {
				"gameId":party[0].gameId,
				"serverId":party[0].serverId,
				"playerId":party[0].playerId,
				"templateId":party[0].templateId,
				"name":party[0].name,
				"class":party[0].class
			}
			log(party)
			log('me.gameId :'+ party[0].gameId)
		}

		//log('me.gameId :'+ me.gameId + '->'+ e.source.toString() +' ->'+ e.owner.toString())

		//log('[DPS] : ' + e.damage + ' target : ' + e.target.toString())
		var memberIndex = getPartyMemberIndex(e.source.toString())
		var sourceId = e.source.toString()
		var target = e.target.toString()
		var skill = e.skill.toString()

		if(e.damage.gt(0)){// && !e.blocked){
			if(memberIndex >= 0){
				// notice damage
				if(me.gameId===sourceId){
					setCurBoss(target)
					//currentbossId = target
					if(e.damage.gt(notice_damage)) {
						noticeDps(e.damage.toString(),skill)
					}
				}
				// members damage
				if(!addMemberDamage(sourceId,target,e.damage.toString(),e.crit,skill)){
					//log('[DPS] : unhandled members damage ' + e.damage + ' target : ' + target)
				}
			}
			else if(memberIndex < 0){
				// projectile
				var ownerIndex = getPartyMemberIndex(e.owner.toString())
				if(ownerIndex >= 0) {
					var sourceId = e.owner.toString()
					// notice damage
					if(me.gameId===sourceId){
						setCurBoss(target)
						//currentbossId = target
						if(e.damage.gt(notice_damage)) {
							noticeDps(e.damage.toString(),skill)
						}
					}
					if(!addMemberDamage(sourceId,target,e.damage.toString(),e.crit,skill)){
						//log('[DPS] : unhandled projectile damage ' + e.damage + ' target : ' + target)
						//log('[DPS] : srcId : ' + sourceId + ' me.gameId : ' + me.gameId)
						//log(e)
					}



				}
				else{// pet
					var petIndex=getIndexOfPetOwner(e.source.toString(),e.owner.toString())
					if(petIndex >= 0) {
						var sourceId = party[petIndex].gameId
						// notice damage
						if(me.gameId===sourceId){
							setCurBoss(target)
							//currentbossId = target
							if(e.damage.gt(notice_damage)) {
								noticeDps(e.damage.toString(),skill)
							}
						}
						if(!addMemberDamage(sourceId,target,e.damage.toString(),e.crit,skill)){
							//log('[DPS] : unhandled pet damage ' + e.damage + ' target : ' + target)
							//log('[DPS] : srcId : ' + sourceId + ' me.gameId : ' + me.gameId)
							//log(e)
						}



					}
					else{
						//var npcIndex= getNPCIndex(target)
						//if(npcIndex < 0) log('[DPS] : Target is not NPC ' + e.damage + ' target : ' + target)
						//else log('[DPS] : unhandled NPC damage ' + e.damage + ' target : ' + NPCs[npcIndex].npcName)
					}
				}
			}
		}
	}

	function addMemberDamage(id,targetId,damage,crit,skill)
	{
		//log('addMemberDamage ' + id + ' ' + target + ' ' + damage + ' ' + crit)
		var npcIndex = getNPCIndex(targetId)
		if(npcIndex <0) return false
		if(NPCs[npcIndex].battlestarttime == 0){
			NPCs[npcIndex].battlestarttime = Date.now()
			NPCs[npcIndex].battleendtime = 0 // 지배석 버그
		}

		NPCs[npcIndex].totalPartyDamage = Long.fromString(NPCs[npcIndex].totalPartyDamage).add(damage).toString()

		for(var i in party){
			if(id===party[i].gameId) {
				//new monster
				if(typeof party[i].NPCInfo[targetId] === 'undefined')
				{
					var critDamage
					if(crit) critDamage = damage
					else critDamage = "0"
					// reset skill log
					if(skillLog && bossOnly &&!allUsers && isBoss(targetId)) party[i].skillLog = []
					party[i].NPCInfo[targetId] = {
						'battlestarttime' : Date.now(),
						'damage' : damage,
						'critDamage' : critDamage,
						'hit' : 1,
						'crit' : crit
					}
					//log('addMemberDamage true new monster')
				}
				else {
					party[i].NPCInfo[targetId].damage = Long.fromString(damage).add(party[i].NPCInfo[targetId].damage).toString()
					if(crit) party[i].NPCInfo[targetId].critDamage = Long.fromString(party[i].NPCInfo[targetId].critDamage).add(damage).toString()
					party[i].NPCInfo[targetId].hit += 1
					if(crit) party[i].NPCInfo[targetId].crit +=1
					//log('addMemberDamage true ' + party[i].NPCInfo[targetId].damage)
				}

				if(skillLog && bossOnly &&!allUsers && isBoss(targetId)){
					var skilldata = {
						'skillId' : skill,
						'Time' : Date.now(),
						'damage' : damage,
						'crit' : crit
					}
					party[i].skillLog.push(skilldata)
				}
				return true
			}
		}
		//log('addMemberDamage false')
		return false
	}

	function getSettings()
	{
		var settings = {
			"noticeDamage" : notice ? numberWithCommas(notice_damage.toString()).color(enable_color) : numberWithCommas(notice_damage.toString()).strike().color(disable_color),
			"notice" : notice ? 'notice'.color(enable_color) : 'notice'.strike().color(disable_color),
			"bossOnly" : bossOnly ? 'Boss Only'.color(enable_color) : 'Boss Only'.strike().color(disable_color),
			"hideNames" : hideNames ? 'hideNames'.color(enable_color) : 'hideNames'.strike().color(disable_color),
			"skillLog" : skillLog ? 'skillLog'.color(enable_color) : 'skillLog'.strike().color(disable_color),
			"rankSystem" : rankSystem ? 'rankSystem'.color(enable_color) : 'rankSystem'.strike().color(disable_color),
			"allUsers" : allUsers ? 'allUsers'.color(enable_color) : 'allUsers'.strike().color(disable_color),
			"debug" : debug ? 'debug'.color(enable_color) : 'debug'.strike().color(disable_color),
			"partyLengh" : party.length,
			"NPCsLength" : NPCs.length,
			"BAMHistoryLength" : Object.keys(BAMHistory).length
		}
		return settings
	}

	function membersDps(targetId) // 0 : text,html 2:json
	{
		var endtime = 0
		var dpsmsg = ''
		var bossIndex = -1
		var tdamage = new Long(0,0)
		var dpsJson= []

		if(targetId==='') return lastDps
		var npcIndex = getNPCIndex(targetId)
		if(npcIndex < 0) return lastDps
		// new NPC but battle not started
		if( NPCs[npcIndex].battlestarttime == 0 ) return  lastDps
		// for despawned NPC
		if( NPCs[npcIndex].dpsmsg !== '' ) return NPCs[npcIndex].dpsmsg

		var totalPartyDamage = Long.fromString(NPCs[npcIndex].totalPartyDamage)

		endtime=NPCs[npcIndex].battleendtime
		if(endtime == 0) endtime=Date.now()
		var battleduration = endtime-NPCs[npcIndex].battlestarttime
		//log(battleduration +  ' = '+ endtime + ' - '+ NPCs[npcIndex].battlestarttime )

		if (battleduration < 1000) battleduration = 1000
		var battledurationbysec = Math.floor((battleduration) / 1000)

		var minutes = "0" + Math.floor(battledurationbysec / 60);
		var seconds = "0" + (battledurationbysec - minutes * 60);
		var monsterBattleInfo = NPCs[npcIndex].npcName + ' ' + minutes.substr(-2) + ":" + seconds.substr(-2) + '</br>'
		monsterBattleInfo = monsterBattleInfo.color(enable_color)
		if(isBoss(targetId) && Boss[targetId].enraged) monsterBattleInfo = '<img class=enraged />'+monsterBattleInfo

		dpsJson.push({
			"enraged": isBoss(targetId) ? Boss[targetId].estatus : '',
			"etimer": isBoss(targetId) ? Boss[targetId].etimer : 0,
			"eCountdown" : isBoss(targetId)&&Boss[targetId].nextEnrage !=0 ? Boss[targetId].hpPer - Boss[targetId].nextEnrage : 0,
			"monsterBattleInfo" : monsterBattleInfo,
			"battleDuration" : battledurationbysec,
			"battleendtime" : 0,
			"totalPartyDamage " : totalPartyDamage.toString(),
			"huntingZoneId" : NPCs[npcIndex].huntingZoneId,
			"templateId" : NPCs[npcIndex].templateId
		})

		// when party over 10 ppl, only sort at the end of the battle for the perfomance
		//if(party.length < 10 || NPCs[npcIndex].battleendtime != 0)
		party.sort(function(a,b) {
			if(typeof a.NPCInfo[targetId] === 'undefined' || typeof b.NPCInfo[targetId] === 'undefined') return 0
			if(Long.fromString(a.NPCInfo[targetId].damage).gt(b.NPCInfo[targetId].damage)) return -1
			else if(Long.fromString(b.NPCInfo[targetId].damage).gt(a.NPCInfo[targetId].damage)) return 1
			else return 0
		})

		// remove lowest dps member if over 30
		if(allUsers){
			for(;party.length > MAX_PARTY_MEMBER;) {
				if(party[party.length -1].gameId === me.gameId) party.splice(party.length -2,1)
				else party.pop()
			}
		}

		var cname
		var dps=0
		var fill_size = 0

		for(var i in party){
			if(totalPartyDamage.equals(0) || battleduration <= 0 || typeof party[i].NPCInfo[targetId] === 'undefined') continue
			cname=party[i].name
			if(hideNames) cname='HIDDEN'
			if(party[i].gameId===me.gameId) cname=cname.color('00FF00')


			tdamage = Long.fromString(party[i].NPCInfo[targetId].damage)
			dps = tdamage.div(battledurationbysec).toString()
			var percentage = tdamage.multiply(100).div(totalPartyDamage).toString()

			// the smallest gap size from highest damage (sorted)
			if(i==0) fill_size = 100 - percentage

			// add the gap size for each member graph
			var graph_size = percentage //+ fill_size

			var crit
			if(party[i].NPCInfo[targetId].crit == 0 || party[i].NPCInfo[targetId].hit == 0) crit = 0
			else crit = Math.floor(party[i].NPCInfo[targetId].crit * 100 / party[i].NPCInfo[targetId].hit)

			dpsJson.push({
				"name": cname,
				"class":party[i].class,
				"serverId": party[i].serverId,
				"totalDamage":tdamage.toString(),
				"dps":dps,
				"percentage":percentage,
				"crit":crit
			})
		}



		// To display last msg on ui even if boss removed from list by DESPAWN packet
		if(bossOnly && isBoss(targetId) ) lastDps = dpsJson
		if(!bossOnly) lastDps = dpsJson

		//return dpsmsg
		return dpsJson
	}

	function sDespawnNpc(e){
		var id = e.gameId.toString()
		var npcIndex = getNPCIndex(id)
		var duration = 0
		if(npcIndex <0) return
		// removing NPC which has battle
		if(NPCs[npcIndex].battlestarttime == 0) {
			NPCs.splice(npcIndex,1)
			//log('NPC removed : '+ NPCs[npcIndex].npcName)
			return
		}
		if(NPCs[npcIndex].battleendtime != 0) {
			log('DOUBLE sDespawnNpc ERROR' + NPCs[npcIndex].npcName)
			return
		}

		NPCs[npcIndex].battleendtime = Date.now()
		duration = NPCs[npcIndex].battleendtime - NPCs[npcIndex].battlestarttime

		if(isBoss(id)){
			Boss[id].enraged = false
			Boss[id].etimer = 0
			Boss[id].estatus = ''
		}

		var dpsmsg = membersDps(id)

		// dps history
		if(isBoss(id) && Boss[id].hpPer > 0)
			log('temp zone :' + NPCs[npcIndex].templateId +':'+ NPCs[npcIndex].huntingZoneId + ' HP :' + Boss[id].hpPer)
		// GG
		if(NPCs[npcIndex].huntingZoneId === 713 && NPCs[npcIndex].templateId === 81301 && Boss[id].hpPer <= 20){
			Boss[id].hpPer = 0
		}
		// 듀리안
		if(NPCs[npcIndex].huntingZoneId === 468 && NPCs[npcIndex].templateId === 2000 && Boss[id].hpPer <= 10){
			Boss[id].hpPer = 0
		}
		if(NPCs[npcIndex].huntingZoneId === 768 && NPCs[npcIndex].templateId === 2000 && Boss[id].hpPer <= 10){
			Boss[id].hpPer = 0
		}

		if(isBoss(id) && Boss[id].hpPer <= 0 && dpsmsg !== '')
		{
			addSkillLog(dpsmsg)
			dpsmsg[0].battleendtime = NPCs[npcIndex].battleendtime
			BAMHistory[id] = dpsmsg
			saveDpsData(dpsmsg)
			if(rankSystem) sendDPSData(dpsmsg)
		}

		NPCs[npcIndex].dpsmsg = dpsmsg

		//History limit 10
		if(Object.keys(BAMHistory).length >= MAX_BAM_HISTORY){
			for(var key in BAMHistory) {
				clean(BAMHistory[key])
				break
			}
		}

		// party clears when join in a new party
	}

	function getPartyMemberIndexByName(n)
	{
		for(var i in party){
			if(party[i].name === n) return i
		}
		return -1
	}

	function addSkillLog(d)
	{
		for(var i in d)
		{
			if(d[i].hasOwnProperty('monsterBattleInfo')) continue
			var index = getPartyMemberIndexByName(stripOuterHTML(d[i].name))
			if(index < 0) continue
			var _si = skillInfo.getSkillsJson(classIdToName(party[index].class))
			d[i]['stastics'] = dpsStastic(party[index].skillLog,_si)
			//log(d[i]['stastics'])
		}
	}

	function noticeDps(damage,skill)
	{
		if(!notice) return
		var msg = ''
		msg = unitDmg(damage)
		//log(skill + ':' + skill.slice(1,skill.length))
		d.send('S_DUNGEON_EVENT_MESSAGE', 1, {
			message: `<img src="img://skill__0__${me.templateId}__${skill.slice(1,skill.length)}" width="20" height="20" />&nbsp;${msg}`,
			unk1: 2, //70 : 2,
			unk2: 0,
			unk3: 0
		})
		return msg
	}

	function classIdToName(id)
	{
		if(id == 0) return 'Warrior'
		if(id == 1) return 'Lancer'
		if(id == 2) return 'Slayer'
		if(id == 3) return 'Berserker'
		if(id == 4) return 'Sorcerer'
		if(id == 5) return 'Archer'
		if(id == 6) return 'Priest'
		if(id == 7) return 'Mystic'
		if(id == 8) return 'Reaper'
		if(id == 9) return 'Gunner'
		if(id == 10) return 'Brawler'
		if(id == 11) return 'Ninja'
		if(id == 12) return 'Valkyrie'
		return ''
	}

	// helper
    function writeBackup() {
	    if(Object.keys(Boss).length != 0) {
			fs.writeFileSync(path.join(__dirname,'_Boss.json'), JSON.stringify(Boss, null, '\t'))
		//log('_Boss.json written')
		}
		if(NPCs.length != 0) {
			fs.writeFileSync(path.join(__dirname,'_NPCs.json'), JSON.stringify(NPCs, null, '\t'))
			//log('_NPCs.json written')
		}
		if(party.length != 0) {
			fs.writeFileSync(path.join(__dirname,'_party.json'), JSON.stringify(party, null, '\t'))
			//log('_party.json written')
		}
    }

    function readBackup() {
		var data = fs.readFileSync(path.join(__dirname,'_Boss.json'),"utf-8")
		Boss = []
		Boss = JSON.parse(data)
		log('_Boss.json read')

		data = fs.readFileSync(path.join(__dirname,'_NPCs.json'),"utf-8")
		NPCs = []
		NPCs = JSON.parse(data)
		log('_NPCs.json read')

		data = fs.readFileSync(path.join(__dirname,'_party.json'),"utf-8")
		party = []
		party = JSON.parse(data)
		log('_party.json read')
    }

    function clean(obj) {
        for (let key in obj) {
            if (obj[key] && typeof obj[key] === "object") {
                if (Object.keys(obj[key]).length !== 0) {
                    clean(obj[key])
                }
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key]
                }
            }
        }
    }

	function stripOuterHTML(str) {
		return str.replace(/^<[^>]+>|<\/[^>]+><[^\/][^>]*>|<\/[^>]+>$/g, '')
	}

	function numberWithCommas(x) {
		return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	}

	function toChat(msg) {
		if(!msg) return
		send(msg)
	}

	function toNotice(msg) {
		if (notice) d.toClient('S_DUNGEON_EVENT_MESSAGE',1, {
			unk1: 42,
			unk2: 0,
			unk3: 27,
			message: msg
		})
	}

	function send(msg) { command.message(`[DPS] : ` + [...arguments].join('\n  - '.color('FFFFFF'))) }
	function sendExec(msg) { command.exec([...arguments].join('\n  - '.color('FFFFFF'))) }

	function log(msg) {
		if(debug) console.log(`[${(new Date).toTimeString().slice(0,8)}] `, msg)
	}

	function statusToChat(tag,val)
	{
		send(`${tag} ${val ? 'enabled'.color(enable_color) : 'disabled'.color(disable_color)}`)
	}
	// command
	command.add('dps', (arg, arg2,arg3) => {
		// toggle
		if (!arg) {
			enable = true
			statusToChat('dps calulation ',enable)
		}
		else if (arg == 'u' || arg=='ui') {
			popup = true
			statusToChat('dps popup',popup)
			ui.open()
		}
		else if (arg == 'nd' || arg=='notice_damage') {
			notice_damage = arg2
			toChat('notice_damage : ' + notice_damage)
		}
		else if (arg == 't' || arg=='test') {
			d.toClient('S_NPC_MENU_SELECT', 1, {type:28})
		}
		// notice
		else if (arg === 'n' ||  arg === 'notice') {
			notice = !notice
			statusToChat('notice',notice)
		}
		else send(`Invalid argument.`.color('FF0000') + ' dps or dps u/h/n/s or dps nd 1000000')
	})

	this.destructor = () => {
		writeBackup()
		command.remove('dps')
	}

	d.hook('S_LOGIN',10, sLogin)
	d.hook('S_SPAWN_ME',2, sSpawnMe)
	d.hook('S_LOAD_TOPO',3, sLoadTopo)
	d.hook('S_ANSWER_INTERACTIVE', 2, sAnswerInteractive)
	d.hook('S_BOSS_GAGE_INFO',3, sBossGageInfo)
	d.hook('S_SPAWN_NPC',8,{order: 200}, sSpawnNpc)
	d.hook('S_DESPAWN_NPC',3, sDespawnNpc)
	d.hook('S_LEAVE_PARTY_MEMBER',2,sLeavePartyMember)
	d.hook('S_LEAVE_PARTY',1, sLeaveparty)
	d.hook('S_PARTY_MEMBER_LIST',6,sPartyMemberList)
	d.hook('S_DESPAWN_USER', 3, sDespawnUser)
	d.hook('S_SPAWN_USER',12, sSpawnUser)
	d.hook('S_NPC_STATUS',1, sNpcStatus)
	d.hook('S_EACH_SKILL_RESULT',d.base.majorPatchVersion < 74 ? 7:9, {order: 200}, sEachSkillResult)
}

module.exports = TDM
