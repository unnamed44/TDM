'use strict'

const https = require('https')
const fs = require('fs')
const path = require('path')

const rootUrl = `https://raw.githubusercontent.com/xmljson/TDM/master/`

String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` }

function Update() {

	var version = '0.0'

	this.download = function (url, dest, cb) {
		return _download(url, dest, cb)
	}

	function _download(url, dest, cb) {
		return new Promise(resolve  => {

				var file = fs.createWriteStream(dest)

				var request = https.get(url, function(response) {
					response.pipe(file)
				}).on('error', function(err) { // Handle errors
					console.log(err)
					fs.unlinkSync(dest) // Delete the file async. (But we don't check the result)
					reject(err)
				})

				file.on('finish', function() {
					file.close(cb)
					console.log('downloaded')
					resolve('success')
				})

				file.on('error', function (err) {
					fs.unlinkSync(dest)
					console.log(err)
					reject(err)
				})

				console.log('downloading... => ' + dest)
		  });
	}

	this.checkUpdate = function()
	{
		asyncCheckUpdate()
	}

	async function asyncCheckUpdate()
	{
		const gitkey = 'manifest.json'
		const dest = path.join(__dirname,'_' + gitkey)
		const url = rootUrl + gitkey
		try{
			var result = await _download(url,dest)
			//console.log(result)
		}
		catch(_){
		}
		if(result !== 'success') return
		delete require.cache[require.resolve('./_manifest.json')]
		delete require.cache[require.resolve('./manifest.json')]
		const gitManifest = require('./_manifest.json')
		const currentManifest = require('./manifest.json')
		fs.unlinkSync(dest)
		if(currentManifest.version === gitManifest.version) version = 'TDM version ' + currentManifest.version
		else version = `Please update new ${gitManifest.version} version.`.clr('FF0000') + '<button class=btn onclick="Update()">Update</button>'
		console.log(version)
	}

	this.update = function ()
	{
		asyncUpdate()
	}

	async function asyncUpdate()
	{
		const gitkey = 'manifest.json'
		const dest = path.join(__dirname,'_' + gitkey)
		const url = rootUrl + gitkey
		try{
			var result = await _download(url,dest)
			//console.log(result)
		}
		catch(_){
		}
		if(result !== 'success') return
		delete require.cache[require.resolve('./_manifest.json')]
		delete require.cache[require.resolve('./manifest.json')]
		const gitManifest = require('./_manifest.json')
		const currentManifest = require('./manifest.json')
		if(currentManifest.version === gitManifest.version) version = 'TDM version ' + currentManifest.version
		else version = `Downloading new ${gitManifest.version} version.`.clr('FF0000')
		updateFiles()
	}

	async function updateFiles()
	{
		var dest,url
		const _manifest = require('./_manifest.json')
		try{
			for(var key in _manifest.files)
			{
				if(key === 'config.json') continue
				if(key === 'customCommands.json') continue
				dest = path.join(__dirname,key)
				url = rootUrl + key
				//downloadRename(url,dest+'.downloaded',dest,null)
				var result = await _download(url,dest+'.downloaded')
				if(result === 'success') fs.renameSync(dest+'.downloaded', dest)
				//fs.unlinkSync(dest+'.test')
			}
		}
		catch(err){
			console.log(err)
			return
		}
		fs.renameSync(path.join(__dirname,'_manifest.json'), path.join(__dirname,'manifest.json'))
		version = `TDM has been Updated. restart tera proxy.`.clr('FF0000')
	}

	this.getVersion = function ()
	{
		return version
	}

}

module.exports = Update
