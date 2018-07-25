[![Donate](https://img.shields.io/badge/Donate-PayPal-ff69b4.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=C6BU555NMQJD6)

![DPS](https://image.ibb.co/mpSFny/dps.jpg)

## Introduction

Tera DPS monitor.(TDM)

Internal/External dps UI

For those who have a problem to see dps in RAID

For those who have a problem with reset data upon dying

For those who have a lag when you press skill log analysis

[Discord](https://discord.gg/JRa7FXd)

## Prerequisite

- nodejs  [here](https://nodejs.org/en/)
- tera proxy

## Install

1. Download the TDM via clicking in the button `Clone or Download` and then on `Download Zip`.

2. Uncompress TDM,

   place the resulting folder in `Tera-proxy\bin\node_modules\`

3. Double click on the file npm_install.bat in TDM folder

(If you are using pinkie's proxy double click on the file pinkie_proxy_patch.bat)

4. Set region in config.json

## Optional data (for dev)

   module manager [manager](https://github.com/Mathicha/manager)

## Functions

- Enraged notifier
- Notify high damage on screen with skill image and number
- DPS history(circular history: max 30 BAM) is shown in the UI
- Simple skill log and analysis
- rank system

## Usage

- Type "!dps u" if you want to open UI or reload ui
- It pops up automatically when you spawn in a dungeon
- If you don't want the dps meter to pop up, press Close button. (X button on title is not the same)
- You can automate party leaving message by setting party_leaving_msg in config.json. Then press LeaveParty button.
- To whisper the lastest/history dps to a user, type one's name in the input then press the button

## Credits

Bluehole Studio

Meishu,Pinkipi,Caali

GIO/neowutran - for monster data, class image
