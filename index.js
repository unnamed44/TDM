/**
* Created on 2018-05-21.
*/
"use strict"
const Command = require('command')
const Long = require("long")
const config = require('./config.json')
const manifest = require('./manifest.json')
const fs = require('fs')
const path = require('path')
const ui_install = require('./ui_install')
const UI = require('ui')
const ManagerUi = require('./managerui')
const customCommand = require('./customCommands.json')
const Update = require('./update.js')
const MonsterInfo = require('./monsterinfo')

String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` }

Long.prototype.divThousand = function() {
	var stringValue = this.toString()
	return stringValue.substring(0, stringValue.length - 3)
}

function TDM(d) {

	const command = Command(d)
	const ui = UI(d)
	let enable = config.enable,
	notice = config.notice,
	notice_damage = config.notice_damage,
	debug = config.debug,
	leaving_msg = config.party_leaving_msg,
	bossOnly = config.bossOnly,
	region = config.region


	let mygId,
	myplayerId= '',
	myserverId= '',
	myclass='',
	myname='',
	Boss = new Object(),
	gzoneId = new Array(),
	gmonsterId = new Array(),
	NPCs = new Array(),
	party = new Array(),
	BAMHistory = new Object(),
	lastDps= new Array(),
	currentZone='',
	currentbossId = '',
	missingDamage = new Long(0,0),
	timeout = 0,
	timeoutCounter = 0,
	allUsers = false,
	maxSize = false,
	hideNames = false,
	rankSystem = true

	let enable_color = 'E69F00',
	disable_color = '56B4E9'
	var update = new Update('version')
	var monInfo = new MonsterInfo(region,update)
	var managerUi = new ManagerUi(d)
	update.checkUpdate()
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
		if(dps.length <= 5) return numberWithCommas(dps) + ' Dmg '
		if(dps.length > 5 && dps.length < 10) {
			 var kdps= dps.substring(0, dps.length - 3)
			 return numberWithCommas(kdps) + 'k Dmg '
		}
		if(dps.length >= 10) {
			var mdps= dps.substring(0, dps.length - 6)
			return numberWithCommas(mdps) + 'm Dmg '
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
			dpsmsg 	+=data[i].name + ' '+ unitDps(data[i].dps)
			+ unitDmg(data[i].totalDamage)
			+ data[i].percentage  + '% ofTot '.clr(enable_color)
			+ data[i].crit  + '% Crit '.clr(enable_color) + '\n'


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

	function api(req, res) {
		const api = getData(req.params[0])
		var req_value = Number(api[0])
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
			case "H":
			return res.status(200).json(BAMHistory)
			case "I":
			hideNames = !hideNames
			statusToChat('hideNames',hideNames)
			return res.status(200).json("ok")
			case "L":
			leaveParty()
			return res.status(200).json('ok')
			return
			case "N":
			notice = !notice
			statusToChat('notice damage',notice)
			return res.status(200).json("ok")
			case "O":
			bossOnly = !bossOnly
			statusToChat('boss Only',bossOnly)
			return res.status(200).json("ok")
			case "P":
			enable = false
			statusToChat('dps popup',enable)
			return res.status(200).json("ok")
			case "Q":
			update.update()
			return res.status(200).json("restart proxy after downloads finish.")
			case "R":
			//reank system
			if(req_value == 2){
				rankSystem = !rankSystem
				statusToChat('rankSystem',rankSystem)
				return res.status(200).json("ok")
			}
			// Refresh DPS window
			var dpsdata = membersDps(currentbossId)
			return res.status(200).json(dpsdata)
			case "S":
			removeAllPartyDPSdata()
			return res.status(200).json('ok')
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
		party = []
		NPCs = []
		BAMHistory = {}
		mygId=e.gameId.toString()
		myserverId=e.serverId.toString()
		myplayerId=e.playerId.toString()
		myname=e.name.toString()
		//# For players the convention is 1XXYY (X = 1 + race*2 + gender, Y = 1 + class). See C_CREATE_USER
		myclass = Number((e.templateId - 1).toString().slice(-2)).toString()
		putMeInParty()
	}

	function sSpawnMe(e){
		mygId=e.gameId.toString()
		currentbossId = ''
		NPCs = []
		if (!enable) return
		// empty command
		ui.open()
	}


	function sLoadTopo(e){
		currentZone = e.zone
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
		Boss[id].nextEnrage = (Boss[id].hpPer > 10) ? (Boss[id].hpPer - 10) : 0
	}

	function setBoss(id)
	{
		Boss[id] = {
			"enraged" : false,
			"etimer" : 0,
			"nextEnrage" : 0,
			"hpPer" : 0,
			"estatus" : ''
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
			if(NPCs.length >= 50)
			{
				var removed = NPCs.shift()

				for(var i in party)
				if(typeof party[i].NPCInfo[removed.gameId] !== 'undefined') delete party[i].NPCInfo[removed.gameId]
			}
			monInfo.getNPCInfoFromXml(newNPC)
			NPCs.push(newNPC)
			//log('sSpawnNpc '+newNPC.zoneName)
		}
	}



	function sendDPSData(data)
	{
		log(data)
		var request = require('request')
		request.post({
			headers: {'content-type': 'application/json'},
			url: 'http://tera.dvcoa.com.au:3000/uploadDps/test',
			form: data
		}, function(error, response, body){
			log(body)
		})
	}

	function saveDpsData(data)
	{
		// save first
		var json = JSON.stringify(data)

		var filename = path.join(__dirname,'history',Date.now()+'.json')

		if (!fs.existsSync(path.join(__dirname,'history'))) fs.mkdirSync(path.join(__dirname,'history'))

		fs.writeFile(filename, json, 'utf8', (err) => {
			// throws an error, you could also catch it here
			if (err) throw err
			// success case, the file was saved
			log('dps data saved!')
		})

	}

	function sNpcStatus(e){
		if(!isBoss(e.creature.toString())) return
		var id = e.creature.toString()
		var timeoutCounter,timeout
		if (e.enraged === 1 && !Boss[id].enraged) {
			Boss[id].etimer = 36
			setEnragedTime(id,null)
			timeoutCounter = setInterval( () => {
				setEnragedTime(id,timeoutCounter)
			}, 1000)
		} else if (e.enraged === 0 && Boss[id].enraged) {
			if (Boss[id].hpPer === 100) return //??
			Boss[id].etimer = 0
			setEnragedTime(id,timeoutCounter)
			clearInterval(timeoutCounter)
		}
	}

	function setEnragedTime(gId,counter)
	{
		//log(Boss[gId])
		if (Boss[gId].etimer > 0) {
			Boss[gId].enraged = true
			Boss[gId].estatus = 'Boss Enraged'.clr('FF0000') + ' ' + `${Boss[gId].etimer}`.clr('FFFFFF') + ' seconds left'.clr('FF0000')
			Boss[gId].etimer--
		} else {
			clearInterval(counter)
			Boss[gId].etimer = 0
			Boss[gId].enraged = false
			Boss[gId].estatus = 'Next enraged at ' + Boss[gId].nextEnrage.toString().clr('FF0000') + '%'
			if(Boss[gId].nextEnrage == 0) Boss[gId].estatus = ''
		}
	}

	//party handler
	function sLeavePartyMember(e){
		var id = e.playerId.toString()
		for(var i in party){
			if(id===party[i].playerId) party.splice(i,1)
		}
	}

	function sLeaveparty(e){
		party = []
		putMeInParty()
	}

	function sPartyMemberList(e){
		allUsers = false
		statusToChat('Count all users dps ',allUsers)
		party = []

		e.members.forEach(member => {
			var newPartyMember = {
				'gameId' : member.gameId.toString(),
				'serverId' : member.serverId.toString(),
				'playerId' : member.playerId.toString(),
				'name' : member.name.toString(),
				'class' : member.class.toString(),
				'NPCInfo' : new Array(),
				'skillLog' : new Array()
			}
			if(!isPartyMember(member.gameId.toString())) {
				party.push(newPartyMember)
			}
		})
	}

	function sDespawnUser(e){
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

	function putMeInParty()
	{
		var newPartyMember = {
			'gameId' : mygId,
			'playerId' : myplayerId,
			'serverId' : myserverId,
			'name' : myname,
			'class' : myclass,
			'NPCInfo': new Array(),
			'skillLog': new Array()
		}

		if(!isPartyMember(mygId)) {
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
		// first hit must be myself to set this values
		if(party.length == 0)
		{
			mygId=e.source.toString()
			myplayerId='NODEF'
			myname='_ME'
			myserverId='500'
			//# For players the convention is 1XXYY (X = 1 + race*2 + gender, Y = 1 + class). See C_CREATE_USER
			myclass = Number((e.templateId - 1).toString().slice(-2)).toString()
			log('S_EACH_SKILL_RESULT ' + mygId)
			putMeInParty()
		}

		//log('[DPS] : ' + e.damage + ' target : ' + e.target.toString())

		var memberIndex = getPartyMemberIndex(e.source.toString())
		var sourceId = e.source.toString()
		var target = e.target.toString()
		var skill = e.skill.toString()

		if(e.damage.gt(0)){// && !e.blocked){
			if(memberIndex >= 0){
				// notice damage
				if(mygId===sourceId){
					setCurBoss(target)
					//currentbossId = target
					if(e.damage.gt(notice_damage)) {
						toNotice(noticeDps(memberIndex,e.damage,target))
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
					if(mygId===sourceId){
						setCurBoss(target)
						//currentbossId = target
						if(e.damage.gt(notice_damage)) {
							toNotice(noticeDps(ownerIndex,e.damage,target))
						}
					}
					if(!addMemberDamage(sourceId,target,e.damage.toString(),e.crit,skill)){
						//log('[DPS] : unhandled projectile damage ' + e.damage + ' target : ' + target)
						//log('[DPS] : srcId : ' + sourceId + ' mygId : ' + mygId)
						//log(e)
					}



				}
				else{// pet
					var petIndex=getIndexOfPetOwner(e.source.toString(),e.owner.toString())
					if(petIndex >= 0) {
						var sourceId = party[petIndex].gameId
						// notice damage
						if(mygId===sourceId){
							setCurBoss(target)
							//currentbossId = target
							if(e.damage.gt(notice_damage)) {
								toNotice(noticeDps(petIndex,e.damage,target))
							}
						}
						if(!addMemberDamage(sourceId,target,e.damage.toString(),e.crit,skill)){
							//log('[DPS] : unhandled pet damage ' + e.damage + ' target : ' + target)
							//log('[DPS] : srcId : ' + sourceId + ' mygId : ' + mygId)
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
					if(debug) party[i].skillLog = []
					party[i].NPCInfo[targetId] = {
						'battlestarttime' : Date.now(),
						'damage' : damage,
						'critDamage' : critDamage,
						'hit' : 1,
						'crit' : crit
					}
					//log('addMemberDamage true new monster')
					return true
				}
				else {
					party[i].NPCInfo[targetId].damage = Long.fromString(damage).add(party[i].NPCInfo[targetId].damage).toString()
					if(crit) party[i].NPCInfo[targetId].critDamage = Long.fromString(party[i].NPCInfo[targetId].critDamage).add(damage).toString()
					party[i].NPCInfo[targetId].hit += 1
					if(crit) party[i].NPCInfo[targetId].crit +=1
					//log('addMemberDamage true ' + party[i].NPCInfo[targetId].damage)
					return true
				}

				if(debug && !allUsers){
					var skilldata = {
						'skillId' : skill,
						'Time' : Date.now(),
						'damage' : damage,
						'crit' : crit
					}
					party[i].skillLog.push(skilldata)
				}
			}
		}
		//log('addMemberDamage false')
		return false
	}

	function getSettings()
	{
		var settings = {
			"noticeDamage" : notice ? numberWithCommas(notice_damage.toString()).clr(enable_color) : numberWithCommas(notice_damage.toString()).strike().clr(disable_color),
			"notice" : notice ? 'notice'.clr(enable_color) : 'notice'.strike().clr(disable_color),
			"bossOnly" : bossOnly ? 'Boss Only'.clr(enable_color) : 'Boss Only'.strike().clr(disable_color),
			"hideNames" : hideNames ? 'hideNames'.clr(enable_color) : 'hideNames'.strike().clr(disable_color),
			"rankSystem" : rankSystem ? 'rankSystem'.clr(enable_color) : 'rankSystem'.strike().clr(disable_color),
			"allUsers" : allUsers ? 'allUsers'.clr(enable_color) : 'allUsers'.strike().clr(disable_color),
			"debug" : debug ? 'debug'.clr(enable_color) : 'debug'.strike().clr(disable_color),
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
		monsterBattleInfo = monsterBattleInfo.clr(enable_color)
		if(isBoss(targetId) && Boss[targetId].enraged) monsterBattleInfo = '<img class=enraged />'+monsterBattleInfo

		dpsJson.push({
			"enraged": isBoss(targetId) ? Boss[targetId].estatus : '',
			"etimer": isBoss(targetId) ? Boss[targetId].etimer : 0,
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
			for(;party.length >= 30;) {
				if(party[party.length -1].gameId === mygId) party.splice(party.length -2,1)
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
			if(party[i].gameId===mygId) cname=cname.clr('00FF00')


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
		if(NPCs[npcIndex].battleendtime != 0) return // 길리안 두번

		NPCs[npcIndex].battleendtime = Date.now()
		duration = NPCs[npcIndex].battleendtime - NPCs[npcIndex].battlestarttime

		if(isBoss(id)){
			Boss[id].enraged = false
			Boss[id].etimer = 0
			Boss[id].estatus = ''
		}

		var dpsmsg = membersDps(id)

		// dps history only for boss and non-boss over 1 min
		if(isBoss(id) || duration > 1000 * 60 * 1)
		{
			if(dpsmsg !== '') {
				dpsmsg[0].battleendtime = NPCs[npcIndex].battleendtime
				BAMHistory[id] = dpsmsg
			}
			if(debug) saveDpsData(dpsmsg)
			if(rankSystem) sendDPSData(dpsmsg)
		}

		NPCs[npcIndex].dpsmsg = dpsmsg

		//History limit 10
		if(Object.keys(BAMHistory).length >= 10){
			for(var key in BAMHistory) {
				delete BAMHistory[key]
				break
			}
		}

		// S_SPAWN_ME clears NPC data
		// S_LEAVE_PARTY clears party and battle infos
	}

	function noticeDps(i,damage,targetId)
	{

		var endtime = 0
		var dpsmsg = ''
		var bossIndex = -1
		var tdamage = new Long(0,0)
		var totalPartyDamage  = new Long(0,0)
		var dps=0

		var npcIndex = getNPCIndex(targetId)

		if(npcIndex < 0) return

		if( NPCs[npcIndex].battleendtime == 0) endtime=Date.now()
		else endtime=NPCs[npcIndex].battleendtime
		var battleduration = Math.floor((endtime-NPCs[npcIndex].battlestarttime) / 1000)

		if(battleduration <= 0 || typeof party[i].NPCInfo[targetId] === 'undefined'){
			return
		}

		tdamage = Long.fromString(party[i].NPCInfo[targetId].damage)
		dps = numberWithCommas(tdamage.div(battleduration).divThousand())
		dpsmsg = numberWithCommas(damage.divThousand()) + ' k '.clr(enable_color) + dps + ' k/s '.clr(enable_color)

		return dpsmsg
	}

	// helper
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

	function send(msg) { command.message(`[DPS] : ` + [...arguments].join('\n  - '.clr('FFFFFF'))) }
	function sendExec(msg) { command.exec([...arguments].join('\n  - '.clr('FFFFFF'))) }

	function log(msg) {
		if(debug) console.log(msg)
	}

	function statusToChat(tag,val)
	{
		send(`${tag} ${val ? 'enabled'.clr(enable_color) : 'disabled'.clr(disable_color)}`)
	}
	// command
	command.add('dps', (arg, arg2,arg3) => {
		// toggle
		if (!arg) {
			enable = true
			statusToChat('dps popup',enable)
		}
		else if (arg == 'u' || arg=='ui') {
			enable = true
			statusToChat('dps popup',enable)
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
		else send(`Invalid argument.`.clr('FF0000') + ' dps or dps u/h/n/s or dps nd 1000000')
	})

	this.destructor = () => {
		command.remove('dps')
	}


	d.hook('S_LOGIN',10, sLogin)
	d.hook('S_SPAWN_ME',2, sSpawnMe)
	d.hook('S_LOAD_TOPO',3, sLoadTopo)
	d.hook('S_ANSWER_INTERACTIVE', 2, sAnswerInteractive)
	d.hook('S_BOSS_GAGE_INFO',3, sBossGageInfo)
	d.hook('S_SPAWN_NPC',8, sSpawnNpc)
	d.hook('S_DESPAWN_NPC',3, sDespawnNpc)
	d.hook('S_LEAVE_PARTY_MEMBER',2,sLeavePartyMember)
	d.hook('S_LEAVE_PARTY',1, sLeaveparty)
	d.hook('S_PARTY_MEMBER_LIST',6,sPartyMemberList)
	d.hook('S_DESPAWN_USER', 3, sDespawnUser)
	d.hook('S_SPAWN_USER',12, sSpawnUser)
	d.hook('S_NPC_STATUS',1, sNpcStatus)
	d.hook('S_EACH_SKILL_RESULT',d.base.majorPatchVersion < 74 ? 7:9, sEachSkillResult)
}

module.exports = TDM
