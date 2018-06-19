[![Donate](https://img.shields.io/badge/Donate-PayPal-ff69b4.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=C6BU555NMQJD6)

![DPS](https://image.ibb.co/mpSFny/dps.jpg)

## Introduction

Tera DPS monitor.(TDM)

Internal dps UI

who has a problem to see dps in RAID

who has a problem with reset data upon dying

## Prerequisite

- nodejs  [here](https://nodejs.org/en/)
- tera proxy

## Install

1. Download the dps via clicking in the button `Clone or Download` and then on `Download Zip`.

2. Uncompress dps,

   place the resulting folder in `Tera-proxy\bin\node_modules\`

## Optional data

   [download](https://github.com/neowutran/TeraDpsMeterData )

   Class icons and monsters put this under the

   html/class-icons

   html/monsters

## Usage

- It pops up automatically when you spawn in a dungeon
- Type "!dps u" if you want to open UI

## Functions

- Enraged notifier on UI
- If you don't want to pop up dps meter, press Close button on bottom. (X button on title is not same)
- you can automate party leaving message by setting party_leaving_msg in config.json. Then press LeaveParty button.
- Reset clears history and npc data, Data is reset by switching charactors anyway.
- DPS history is shown in the UI
- Whisper lastest dps to a user type in the input
- Right click on LFG pops up inspecting window (debug mode only)

## Credits

Bluehole Studio
Meishu,Pinkipi,Caali
GIO/neowutran
