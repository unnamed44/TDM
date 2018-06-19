/**
* Created by 2018-05-21.
*/
"use strict"

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

//module.exports = function (){
  var unzip = path.join(__dirname,'unzip.exe')
  var zipfile = path.join(__dirname,'ui.zip')
  var option = ' -d '
  var dest=path.join(__dirname,'..','ui')
  if (!fs.existsSync(dest)) {
    exec('\"'+unzip+'\" '+'\"'+zipfile+'\" '+option + '\"'+dest+'\"', (err, stdout, stderr) => {
      if (err) {
        console.log('node could not execute the command  : ' + err)
        return
      }
      if(stderr != null)console.log(`stderr: ${stderr}`)
      console.log('------------------------------------------------')
      console.log('UI installed please restart tera-proxy.')
      console.log('------------------------------------------------')
      process.exit()
    })
  }
//}
