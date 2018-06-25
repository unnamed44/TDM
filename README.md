[![Donate](https://img.shields.io/badge/Donate-PayPal-ff69b4.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=C6BU555NMQJD6)

![DPS](https://image.ibb.co/mpSFny/dps.jpg)

## Introduction

Tera DPS monitor.(TDM)

Internal dps UI

For those who have a problem to see dps in RAID

For those who have a problem with reset data upon dying

[Discord](https://discord.gg/JRa7FXd)

## Prerequisite

- nodejs  [here](https://nodejs.org/en/)
- tera proxy

## Install

1. Download the TDM via clicking in the button `Clone or Download` and then on `Download Zip`.

2. Uncompress TDM,

   place the resulting folder in `Tera-proxy\bin\node_modules\`

## Optional data

   [tera data](https://github.com/neowutran/TeraDpsMeterData )

   Find class-icons and monsters from above then put under the html folder like below

   html/class-icons

   html/monsters

   proxy module ui [manager](https://github.com/Mathicha/manager)

   Tera-proxy/bin/node_modules/

## Usage

- It pops up automatically when you spawn in a dungeon
- Type "!dps u" if you want to open UI
- Set region in config.json

## Functions

- If you don't want the dps meter to pop up, press Close button. (X button on title is not the same)
- You can automate party leaving message by setting party_leaving_msg in config.json. Then press LeaveParty button.
- Reset clears history and npc data, Data is reset by switching charactors anyway.
- DPS history is shown in the UI
- To whisper the lastest dps to a user, type one's name in the input then press the button
- Enraged notifier on UI

## Credits

Bluehole Studio

Meishu,Pinkipi,Caali

GIO/neowutran
