'use strict'

const https = require('https')
const fs = require('fs')
const { join } = require('path')

const rootUrl = `https://raw.githubusercontent.com/xmljson/TDM/master/`

String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` }

function Update() {

	var version = ''

	this.download = function (url, dest, cb) {
		return _download(url, dest, cb)
	}

	this.update = function ()
	{
		deleteDataFiles()
		npm_install()
		asyncUpdate()
	}

	function npm_install()
	{
		const { exec } = require('child_process')
		var cmd = 'npm install'
		exec(cmd,{cwd:__dirname},function (error, stdout, stderr) {
			if(error) console.log(error)
			if(stdout) console.log(stdout)
			if(stderr) console.log(stderr)
		});
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
					console.log('downloaded...' + dest)
					resolve('success')
				})

				file.on('error', function (err) {
					fs.unlinkSync(dest)
					console.log(err)
					reject(err)
				})

				console.log('downloading...' + dest)
		  });
	}

	this.checkUpdate = function()
	{
		asyncCheckUpdate()
	}

	async function asyncCheckUpdate()
	{
		const gitkey = 'package.json'
		const dest = join(__dirname,'_' + gitkey)
		const url = rootUrl + gitkey
		try{
			var result = await _download(url,dest)
			//console.log(result)
		}
		catch(_){
		}
		if(result !== 'success') return
		delete require.cache[require.resolve('./_package.json')]
		delete require.cache[require.resolve('./package.json')]
		const gitPackage = require('./_package.json')
		const currentPackage = require('./package.json')
		fs.unlinkSync(dest)
		if(currentPackage.version === gitPackage.version) version = 'TDM version ' + currentPackage.version
		else version = `Please update new ${gitPackage.version} version.`.clr('FF0000') + '<button class=btn onclick="Update()">Update</button>'
		console.log(version)
	}

	async function asyncUpdate()
	{
		try{
			var result = await _download(rootUrl + 'package.json',join(__dirname,'_' + 'package.json'))
			if(result !== 'success') throw err
			var result2 = await _download(rootUrl + 'manifest.json',join(__dirname,'_' + 'manifest.json'))
			if(result2 !== 'success') throw err
			//console.log(result)
		}
		catch(err){
			throw err
		}

		delete require.cache[require.resolve('./_package.json')]
		delete require.cache[require.resolve('./package.json')]
		const gitPackage = require('./_package.json')
		const currentPackage = require('./package.json')
		if(currentPackage.version === gitPackage.version) version = 'TDM version ' + currentPackage.version
		else version = `Downloading new ${gitPackage.version} version.`.clr('FF0000')
		updateFiles()
	}

	function deleteDataFiles()
	{
		const { lstatSync, readdirSync ,renameSync} = require('fs')
		const isDirectory = source => lstatSync(source).isDirectory()
		const getDataFiles = source =>
			readdirSync(source).map(function(name){
				if(!isDirectory(join(source, name)) &&( name.includes('.xml') || name.includes('.tsv')))
					return name
			})

		var files = getDataFiles(__dirname)
		var fileNames = files.filter(function( element ) {
			   return element !== undefined;
			});

		for(var i in fileNames){
			//fs.unlinkSync(join(__dirname,fileNames[i]))
			console.log('deleted...' + fileNames[i])
		}
	}

	async function updateFiles()
	{
		var dest,url
		const _package = require('./_manifest.json')
		try{
			for(var key in _package.files)
			{
				if(key === 'config.json') continue
				if(key === 'customCommands.json') continue
				dest = join(__dirname,key)
				url = rootUrl + key
				//downloadRename(url,dest+'.downloaded',dest,null)
				var result = await _download(url,dest+'.downloaded')
				if(result === 'success') fs.renameSync(dest+'.downloaded', dest)
				//fs.unlinkSync(dest+'.test')
			}
			fs.renameSync(join(__dirname,'_package.json'), join(__dirname,'package.json'))
			fs.unlinkSync(join(__dirname,'_manifest.json'))
			version = `TDM has been Updated. restart tera proxy.`.clr('FF0000')
			console.log('TDM has been Updated. restart tera proxy')
		}
		catch(err){
			throw err
		}

	}

	this.getVersion = function ()
	{
		return version
	}

}

module.exports = Update
