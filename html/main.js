var previousDps = ''
var TDMSettings
var agree = false
var waitForThis = false
var slog = []
var _skillInfo = []
var _petsSkillInfo = []
var 	_name = ''
var	_classId = ''
var _record = {}
var _recordfilename = ''

// manager ui
function manager_ajax(url, cb) {
	var x = new XMLHttpRequest();
	pending = true;
	x.open("GET", "manager/" + url, true);
	x.onload = cb;
	x.send();
	return;
}
function onClick(val)
{
	manager_ajax(val,null)
}
function ManagerCB()
{
	document.getElementById("manager").innerHTML = this.responseText.substring(1, this.responseText.length - 1)
}
function Manager()
{
	manager_ajax("R",ManagerCB)
}

// TDM ui
function ajax(url, cb) {
	var x = new XMLHttpRequest();
	pending = true;
	x.open("GET", "api/" + url, true);
	x.onload = cb;
	x.send();
	return;
}


function stripOuterHTML(str) {
	return str.replace(/\'|^<[^>]+>|<\/[^>]+><[^\/][^>]*>|<\/[^>]+>$/g, '')
}

String.prototype.color = function (hexColor) {
	return '<font color="#' +hexColor+'">'+ this +'</font>'
}


function Clipboard() {
	var copyText = document.getElementById("txt");
	copyText.select();
	document.execCommand("copy");
}

function validate(evt) {
	var theEvent = evt || window.event;
	var key = theEvent.keyCode || theEvent.which;
	key = String.fromCharCode( key );
	var regex = /[0-9]|\./;
	if( !regex.test(key) ) {
		theEvent.returnValue = false;
		if(theEvent.preventDefault) theEvent.preventDefault();
	}
}


function warningMsg()
{
	if(agree) return true
	if(typeof _tera_client_proxy_ !== 'undefined') {
		_tera_client_proxy_.alert("Please remember TDM is not for mocking others. It is at your own risk to get banned by sending dps data. Press again if you agree with this.");
	}
	agree = true
	return false
}

function Whisper() {
	if(!warningMsg()) return
	var n = document.getElementById("name").value;
	ajax("0W"+ n,null)
}

function ToGuild() {
	if(!warningMsg()) return
	ajax("2C",null)
}

function ToParty() {
	if(!warningMsg()) return
	ajax("1C",null)
}

function LeaveParty() {
	ajax("L",null)
}

function ResetCB(){
	document.getElementById("content").innerHTML = '<br>'
}

function Reset() {
	ajax("100S",ResetCB)
}
function CloseDpsCB() {
	if(typeof _tera_client_proxy_ !== 'undefined') {
		_tera_client_proxy_.close()
	}
}
function CloseDps() {
	ajax("P",CloseDpsCB)
}

// settings
function NoticeDamageAdd() {
	ajax("A",Settings)
}

function Debug() {
	ajax("B",Settings)
}

function Notice() {
	ajax("N",Settings)
}

function AllUsers() {
	ajax("U",Settings)
}
function BossOnly() {
	ajax("O", Settings)
}
function HideNames()
{
	ajax("I",Settings)
}
function SkillLog()
{
	ajax("1L",Settings)
}
function RankSystem()
{
	ajax("2R",Settings)
}
function ReloadTDM()
{
	ajax("X",refreshCB)
}

function UpdateCB()
{
	var dpsmsg = this.responseText.substring(1, this.responseText.length - 1)
	document.getElementById("content").innerHTML = dpsmsg.replace(/(\\n|\\)/gm,"");
}
function Update()
{
	waitForThis = true
	ajax("Q",UpdateCB)
}

function openweb(e) {
	//_tera_client_proxy_.alert("TDM does not support details of skill info yet.");
}


function recordedStastics(index)
{
	document.getElementById("content").innerHTML = _record[index].stastics
}

function RecordTableDPSFormat(data,tableId)
{
	var dpsmsg = ''
	var enragedBar = 0
	var class_image=''

	//console.log(data)

	dpsmsg += '<table class="" id="'+tableId+'">'

	for(var i in data){
		if(data[i].monsterBattleInfo) {
			if(data[i].etimer > 0)
			{
				enragedBar = data[i].etimer * 100 / 36
				dpsmsg += '<tr><th colspan="4" style="background: url(\'./icons/enraged_bar.jpg\'); background-repeat: no-repeat; background-size: ' + enragedBar +'% 10%;">'
			}
			else {
				enragedBar = data[i].eCountdown * 10
				dpsmsg += '<tr><th colspan="4" style="background: url(\'./icons/bar.jpg\'); background-repeat: no-repeat; background-size: ' + enragedBar +'% 10%;">'
			}

			dpsmsg += data[i].enraged
			dpsmsg += '<br>' + data[i].monsterBattleInfo + '</th></tr>'
			continue
		}


		dpsmsg 	+='<tr><td> ' + data[i].name
				+ '<img onclick="recordedStastics(\''+ i +'\')" src="./class-icons/'+classIdToName(data[i].class).toLowerCase()+'.png' +'" />'
				+ '<td style="display:none;">' + data[i].dps + ' </td>'
				+ ' </td>' + '<td style="background: url(\'./icons/bar.jpg\'); background-repeat: no-repeat; background-size: '+data[i].percentage+'% 20%;">' + nFormatter(Number(data[i].dps),1) + '</td>'
				+ '<td> ' + data[i].percentage  + '%'.color('E69F00') + ' </td>'
				+ '<td> ' +  data[i].crit  + '%'.color('E69F00') + ' </td></tr>'
	}
	dpsmsg += '</table>'
	return dpsmsg
}


// records tab
function clickRecordsCB() {
	_record = JSON.parse(this.responseText)
	if(_record === '') return
	document.getElementById("content").innerHTML = RecordTableDPSFormat(_record,"recordTable");
	sortTable("recordTable")
}

function clickRecordsFile(filename) {
	_recordfilename = filename
	ajax("4R"+filename,clickRecordsCB)
}

function DeleteFile(filename) {
	ajax("1F"+filename)
}

function printDateInFormat(m)
{
   var result="";
   var d = new Date(m);
   result += d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate() +
             " "+ d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()
   return result;
}

function RecordsCB() {
	var res = JSON.parse(this.responseText)
	var html = '<br><table>'
	for(var i in res)
	{
		html	+='<tr><td><button class="btn" onclick="clickRecordsFile(\''+res[i]+'\')">View</button></td>'
			+ '<td>' + printDateInFormat(Number(res[i].split('.')[0])) + '</td>'
			//+ '<td><button class="btn" onclick="DeleteFile(\''+res[i]+'\')">delete</button></td></tr>'
	}
	html += '</table>'

	document.getElementById("content").innerHTML = html;
}


function Records() {
	ajax("3R",RecordsCB)
}

// setting tab
function SettingsCB()
{
	TDMSettings = JSON.parse(this.responseText)
	document.getElementById("NoticeDamageAdd").innerHTML = TDMSettings.noticeDamage
	document.getElementById("Notice").innerHTML = TDMSettings.notice
	document.getElementById("BossOnly").innerHTML = TDMSettings.bossOnly
	document.getElementById("HideNames").innerHTML = TDMSettings.hideNames
	document.getElementById("SkillLog").innerHTML = TDMSettings.skillLog
	document.getElementById("RankSystem").innerHTML = TDMSettings.rankSystem
	document.getElementById("AllUsers").innerHTML = TDMSettings.allUsers
	document.getElementById("Debug").innerHTML = TDMSettings.debug
	document.getElementById("debug").innerHTML = 'party:'+ TDMSettings.partyLengh + '| NPCs:' + TDMSettings.NPCsLength
}

function Settings(){
	ajax("Y",SettingsCB)
}

// dps tab
function DPS(){
	ajax("5R",null) // reset recordFilename
	if(waitForThis == true) return refreshDPS()
	waitForThis = false
	previousDps = 'NEW'
}

// Custom tab
function excuteCCmd(evt,cmd)
{
	//document.getElementById("debug").innerHTML = cmd
	ajax("4C"+cmd,null)
}

function CustomCB()
{
	var data = JSON.parse(this.responseText)
	var html = ''
	//'<table><tr><td>'
	for(var key in data){
		html += '<button class=btn onclick="excuteCCmd(event,\''+ key +'\')">' + data[key] + '</button><br>'
	}
	//document.getElementById("debug").innerHTML = html
	document.getElementById("custom").innerHTML = html
}

function Custom(){
	ajax("3C",CustomCB)
}

function getVersionCB()
{
	var c = JSON.parse(this.responseText)
	document.getElementById("version").innerHTML = c[0]
}

function getVersion()
{
	ajax("V",getVersionCB)
}

function ExtUICB()
{
	//console.log(this.responseText)
	var c = JSON.parse(this.responseText)
	if(typeof _tera_client_proxy_ === 'undefined') {
		//window.open(window.location.href, 'TDM', 'titlebar=no, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no');
		window.open(window.location.href, 'TDM', 'height=240,width=200,top=0,left=0,directories=no,titlebar=nostatus=no,toolbar=no,menubar=no,navigationbar=no,location=no,resizable=no,scrollbars=no');
	}
	else {
		openWebsite('http://' + c.host + ':'+ c.port)
	}
	CloseDps()
}

function ExtUI()
{
	ajax("E",ExtUICB)
}

function numberWithCommas(x) {
	return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
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

function searchPetSkillName(id)
{
	return 'Pet skill ' + id
	var pid = id.split(':').shift()
	var skillId = id.split(':').pop()
	//console.log(id)
	//console.log(pid + '-' + skillId)
	for(var i in _petsSkillInfo)
	{
			if(_petsSkillInfo[i].id === pid && _petsSkillInfo[i].className === skillId) return _petsSkillInfo[i].petName + ':'+ _petsSkillInfo[i].skillName
	}
	return 'Unknown pet skill'
}

function skillIdToName(id,pet)
{
	if(_skillInfo.length == 0) return 'skill tsv missing'
	var sid = id.slice(1,id.length)
	//if(pet == true) return 'pet skill'
	if(pet == true) {
		return searchPetSkillName(sid)
	}
	else {
		return binarySearchSkillName(_skillInfo, sid, 0, _skillInfo.length - 1)
	}
}

function dpsStastic()
{
	var s= []

	// set skill name
	for (var i in slog)
	{
		slog[i]['name'] = skillIdToName(slog[i].skillId,slog[i].isPet)
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

	var html='<button class="btn" onclick="refreshDPS()">return to DPS</button><button class="btn" onclick="skillLog(\''+_name+'\',\''+_classId+'\')">Skill Log</button><br>'

	html += '<table class="stastics"><tr><th rowspan=2>Skill Name</th><th>White</th><th>Red</th><th>Total</th><th>Crit</th></tr>'
	html += '<tr><th>Avrage</th><th>Avrage</th><th>Avrage</th><th>Red/Total</th></tr>'
	//console.log(s)
	var avg=0
	for(var i in s){
			//console.log(s[i].wDamage +' '+ s[i].rDamage)
			var t = s[i].wDamage + s[i].rDamage
			html+='<tr>'
			html+='<td>' + s[i].name + '</td>'
			avg = '0'
			if(s[i].hitCount-s[i].crit != 0) avg = Math.floor(s[i].wDamage/(s[i].hitCount-s[i].crit)).toString()
			html+='<td>' +nFormatter(Number(s[i].wDamage.toString()),1) + '<br>' + nFormatter(Number(avg),1) + '</td>'
			avg = '0'
			if(s[i].crit != 0) avg = Math.floor(s[i].rDamage/(s[i].crit)).toString()
			html+='<td>' +nFormatter(Number(s[i].rDamage.toString()),1) + '<br>' + nFormatter(Number(avg),1) + '</td>'
			avg = '0'
			if(s[i].hitCount != 0) avg = Math.floor(s[i].tDamage/(s[i].hitCount)).toString()
			html+='<td>' +nFormatter(Number(s[i].tDamage.toString()),1) + '<br>' + nFormatter(Number(avg),1) + '</td>'
			html+='<td>' + Math.floor(s[i].crit*100/s[i].hitCount) + '%'.color('E69F00') + '<br>'+s[i].crit+'/'+s[i].hitCount+'</td>'
			html+='</tr>'
	}
	html+='</table>'
	document.getElementById("content").innerHTML = html

}

function printStastics(value)
{
	document.getElementById("content").innerHTML = html
}

function skillLogCB()
{
	slog = []
	slog = JSON.parse(this.responseText)
	//console.log(slog)
	var html='<button class="btn" onclick="refreshDPS()">return to DPS</button><button class="btn" onclick="dpsStastic()">Stastic</button><br>'
	html += '<table class="stastics"><tr><th>Time</th><th>Skill Name</th><th>Damage</th></tr>'
	for(var i in slog){
			html+='<tr>'
			html+='<td>' +(new Date(slog[i].Time)).toTimeString().slice(0,8)+ '</td>'
			html+='<td>' +skillIdToName(slog[i].skillId,slog[i].isPet)+ '</td>'
			html+='<td>' + (slog[i].crit ? nFormatter(Number(slog[i].damage),1).color('FF3000') : nFormatter(Number(slog[i].damage)),1) + '</td>'
			html+='</tr>'
	}
	html+='</table>'
	document.getElementById("content").innerHTML = html
}

function getSkillInfoCB()
{
	var si = JSON.parse(this.responseText)

	_petsSkillInfo = si.slice(0,181)
	_skillInfo = si.slice(181,si.length)

	//console.log(_petsSkillInfo)
	//console.log(_skillInfo)


	ajax("2L"+_name,skillLogCB)
}

function skillLog(n,c)
{
	_name = n
	_classId = c
	waitForThis = true
	ajax(c+"S",getSkillInfoCB)
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


function sortTable(tabeId) {
	var table, rows, switching, i, x, y, shouldSwitch;
	table = document.getElementById(tabeId);
	switching = true;
	/*Make a loop that will continue until
	no switching has been done:*/
	while (switching) {
		//start by saying: no switching is done:
		switching = false;
		rows = table.getElementsByTagName("TR");
		/*Loop through all table rows (except the
		first, which contains table headers):*/
		for (i = 1; i < rows.length - 1; i++) {
			//start by saying there should be no switching:
			shouldSwitch = false;
			/*Get the two elements you want to compare,
			one from current row and one from the next:*/
			x = rows[i].getElementsByTagName("TD")[1];
			y = rows[i + 1].getElementsByTagName("TD")[1];
			//check if the two rows should switch place:
			if (Number(x.innerHTML.replace(',','')) < Number(y.innerHTML.replace(',',''))) {
				//if so, mark as a switch and break the loop:
				shouldSwitch = true;
				break;
			}
		}
		if (shouldSwitch) {
			/*If a switch has been marked, make the switch
			and mark that a switch has been done:*/
			rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
			switching = true;
		}
	}
}

function nFormatter(num, digits) {
	var si = [
		{ value: 1, symbol: "" },
		{ value: 1E3, symbol: "k" },
		{ value: 1E6, symbol: "M" },
		{ value: 1E9, symbol: "G" },
		{ value: 1E12, symbol: "T" },
		{ value: 1E15, symbol: "P" },
		{ value: 1E18, symbol: "E" }
	];
	var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	var i;
	for (i = si.length - 1; i > 0; i--) {
		if (num >= si[i].value) {
			break;
		}
	}
	return (num / si[i].value).toFixed(digits+i-1).replace(rx, "$1") + si[i].symbol;
}

function tableDPSFormat(data,tableId)
{
	var dpsmsg = ''
	var enragedBar = 0
	var class_image=''

	//console.log(data)

	dpsmsg += '<table id="'+tableId+'">'

	for(var i in data){
		if(data[i].monsterBattleInfo) {
			if(data[i].etimer > 0)
			{
				enragedBar = data[i].etimer * 100 / 36
				dpsmsg += '<tr><th colspan="4" style="background: url(\'./icons/enraged_bar.jpg\'); background-repeat: no-repeat; background-size: ' + enragedBar +'% 10%;">'
			}
			else {
				enragedBar = data[i].eCountdown * 10
				dpsmsg += '<tr><th colspan="4" style="background: url(\'./icons/bar.jpg\'); background-repeat: no-repeat; background-size: ' + enragedBar +'% 10%;">'
			}

			dpsmsg += data[i].enraged
			dpsmsg += '<br>' + data[i].monsterBattleInfo + '</th></tr>'
			continue
		}


		var crit = data[i].crit  + '%'.color('E69F00')
		if(data[i].class == 6 || data[i].class == 7) crit += ' ' + data[i].healCrit  + '%'.color('56B4E9')


		dpsmsg 	+='<tr><td> ' + data[i].name
				+ '<img onclick="skillLog(\''+ stripOuterHTML(data[i].name) +'\', '+data[i].class+')" src="./class-icons/'+classIdToName(data[i].class).toLowerCase()+'.png' +'" />'
				+ '<td style="display:none;">' + data[i].dps + ' </td>'
				+ ' </td>' + '<td style="background: url(\'./icons/bar.jpg\'); background-repeat: no-repeat; background-size: '+data[i].percentage+'% 20%;">' + nFormatter(Number(data[i].dps),1) + ' </td>'
				+ '<td> ' + data[i].percentage  + '%'.color('E69F00') + ' </td>'
				+ '<td> ' + crit  + ' </td></tr>'

		//if(data[i].stastics){}
	}
	dpsmsg += '</table>'
	return dpsmsg
}

function refreshCB()
{
	_skillInfo = []
	_petsSkillInfo = []
	var res = JSON.parse(this.responseText)
	if(res === '' ) return
	var result = tableDPSFormat(res,"dpsTable")
	if(result === previousDps) return
	if(waitForThis == true) return
	document.getElementById("content").innerHTML = result + '<br>'
	//sortTable("dpsTable")

	previousDps = result

}

function refreshDPS()
{
	previousDps = 'NEW'
	waitForThis = false
	ajax("1R",refreshCB)
	var i = setInterval(function(){
		if(waitForThis){
			clearInterval(i);
			return
		}
		ajax("1R",refreshCB)
	}, 1000);
}

function setStyleCB()
{
	document.getElementById("debug").innerHTML = this.responseText
	var data = this.responseText.substring(1, this.responseText.length - 1)
	var size = data.split(',')
	if(typeof _tera_client_proxy_ !== 'undefined') {
		_tera_client_proxy_.resize_to(Number(size[0]), Number(size[1]))
	}
}

function readConfig()
{
	ajax("Z",setStyleCB)
}

function useBrowser(url)
{
	if(typeof _tera_client_proxy_ !== 'undefined') {
		_tera_client_proxy_.resize_to(1024, 768)
	}
	window.location.href=url
}

function useBrowserHelp()
{
	var locale = ''
	if(typeof _tera_client_proxy_ !== 'undefined') {
		locale = _tera_client_proxy_.get_locale()
	}
	//_tera_client_proxy_.alert(locale);
	var url = ''
	if(locale === 'ko') url = 'https://github.com/xmljson/TDM/blob/master/README_KR.md'
	else url = 'https://github.com/xmljson/TDM/blob/master/README.md'
	_tera_client_proxy_.open_web_direct(url)
}
function openWebsite(url)
{
	if(typeof _tera_client_proxy_ !== 'undefined') {
		_tera_client_proxy_.open_web_direct(url)
	}
	else{
		window.location.href=url
	}
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    if(tabName !== 'records') document.getElementById(tabName).style.display = "block";
    if(evt != null)evt.currentTarget.className += " active";

    if(tabName === 'wrapper') DPS()
    if(tabName === 'records') {
	    document.getElementById('wrapper').style.display = "block";
	    Records()
    }
    if(tabName === 'settings') Settings()
    if(tabName === 'custom') Custom()
    if(tabName === 'manager') Manager()
}

function nullClientProxy () {
    this.set_title = function (t){
	    document.title = t
    }
    function alert(m) {alert(m)}
    this.get_locale = function() {}
    this.open_web_direct = function (url){
	    window.location.href=url
    }
    this.close = 0;
}

window.addEventListener('error', function(e) {
	if(typeof _tera_client_proxy_ !== 'undefined') {
		_tera_client_proxy_.alert('Error: ' + e.message)
	}
	else {
		alert('Error: ' + e.message)
	}
})



window.addEventListener('resize', function(event){
  // do stuff here
  	var width = window.innerWidth;
	var height = window.innerHeight;

	var divhight = 'height:' + (height - 55) + 'px'
	document.getElementById('content').setAttribute("style",divhight);
	var wrapperdivhight = 'height:' + height + 'px'
	document.getElementById('wrapper').setAttribute("style",wrapperdivhight);
	document.getElementById('settings').setAttribute("style",divhight);
	document.getElementById('manager').setAttribute("style",divhight);
	document.getElementById('custom').setAttribute("style",divhight);
	document.getElementById('wrapper').style.display = "block";

});

window.onload = function() {

	if(typeof _tera_client_proxy_ === 'undefined') {
	}
	else {
		_tera_client_proxy_.resize_to(320, 250)
		_tera_client_proxy_.set_title('Tera DPS Monitor')
	}
	readConfig()
	refreshDPS()
	getVersion()
}
