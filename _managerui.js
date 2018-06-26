'use strict'
const Command = require('command');
const UI = require('ui')

module.exports = function ModulesManager(d,ctx) {
	const command = Command(d);
	const ui = UI(d)
	let modules,htmls

	// awesomnium web browser UI
	ui.use(UI.static(__dirname + '/manager'))
	ui.get(`/api2/*`, api.bind(ctx))

	const { lstatSync, readdirSync ,renameSync} = require('fs')
	const { join } = require('path')
	const isDirectory = source => lstatSync(source).isDirectory()
	const getDirectories = source =>
		readdirSync(source).map(function(name){ if(isDirectory(join(source, name))) return name })

	var moduleDir = join(__dirname, '..')

	loadModulebuttons()

	for(var i in modules){


	}

	function loadModulebuttons()
	{
		modules=getDirectories(moduleDir)
		htmls = ''
		for(var i in modules){
			htmls += modules[i] + '<br>'
			htmls += ` <button type='button' class='btn' onclick='onClick(this.value)' value='1U${modules[i]}'> Unload </button> `
			htmls += ` <button type='button' class='btn' onclick='onClick(this.value)' value='1L${modules[i]}'> Load </button> `
			htmls += ` <button type='button' class='btn' onclick='onClick(this.value)' value='1R${modules[i]}'> Reload </button> `
			htmls += ` <button type='button' class='btn' onclick='onClick(this.value)' value='1D${modules[i]}'> Disable  </button> `
			htmls += ` <button type='button' class='btn' onclick='onClick(this.value)' value='1E${modules[i]}'> Enable  </button> `
			htmls += ` <button type='button' class='btn' onclick='onClick(this.value)' value='1C${modules[i]}'> !!!!!!  </button> <br><br>`
		}
	}

	function getData(param) {
		var paramRegex = /(\d*)(\D)/
		var data = param.match(paramRegex)
		if(data==null) return ''
		data.shift()
		return data
	}

	function api(req, res) {
		const api = getData(req.params[0])
		var req_value = Number(api[0])
		var moduleName = req.params[0].substring(2, req.params[0].length)
		switch(api[1]) {
			case "U":
				Unload(moduleName)
				return res.status(200).json('ok')
			case "L":
				Load(moduleName)
				return res.status(200).json('ok')
			case "R":
				if(req_value == 0){
					return res.status(200).json(htmls)
				}
				else{
					Reload(moduleName)
				}
				return res.status(200).json('ok')
			case "D":
				Disable(moduleName)
				return res.status(200).json('ok')
			case "E":
				Enable(moduleName)
				return res.status(200).json('ok')
			case "T":
				TDM(moduleName)
				return res.status(200).json('ok')
			case "C":
				Commands(moduleName)
				return res.status(200).json('ok')
			}
		}

	function sendExec(msg) { command.exec([...arguments].join('\n  - '.clr('FFFFFF'))) }

	command.add('manager', m => {
		ui.open()
	});

	function Unload(m)
	{
		sendExec(`unload ${m}`)
	}

	function Load(m)
	{
		sendExec(`load ${m}`)
	}

	function Reload(m)
	{
		sendExec(`reload ${m}`)
	}

	function TDM(m)
	{
		sendExec(`dps ${m}`)
	}

	function Commands(m)
	{
		sendExec(`${m}`)
	}

	function Enable(m){
		var newFoldername = m.replace('_','')
		renameSync(join(moduleDir,m),join(moduleDir,newFoldername))
		loadModulebuttons()
		Load(newFoldername)
		ui.open()
	}
	function Disable(m){
		Unload(m)
		var newFoldername = '_' + m
		renameSync(join(moduleDir,m),join(moduleDir,newFoldername))
		loadModulebuttons()
		ui.open()
	}

};
