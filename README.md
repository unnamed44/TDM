[![Donate](https://img.shields.io/badge/Donate-PayPal-ff69b4.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=C6BU555NMQJD6)

![DPS](https://image.ibb.co/mpSFny/dps.jpg)

## 介绍:

Tera DPS monitor.(TDM)

内部/外部 dps UI

[Discord](https://discord.gg/JRa7FXd)

------------------------------

## 安装环境

- node.js  [here](https://nodejs.org/en/)
- tera proxy

------------------------------

## 安装步骤

1. 克隆下载整个代码库 TDM-master.zip

2. 解压TDM-master.zip文件 TDM,

   存放到目录 `\Tera-proxy\bin\node_modules\` 下

3. 管理员权限运行 npm_install.bat (在TDM文件夹中)
![DPS](http://imgsrc.baidu.com/forum/pic/item/e92df051352ac65cc7bfc26ef6f2b21192138aa5.jpg)
![DPS](http://imgsrc.baidu.com/forum/pic/item/6da37262f6246b60b38b1669e6f81a4c500fa256.jpg)
![DPS](http://imgsrc.baidu.com/forum/pic/item/15f609395343fbf268e3023ebd7eca8064388f08.jpg)

4. 编辑 config.json 设置游戏地区 "region": TW
![DPS](http://imgsrc.baidu.com/forum/pic/item/4744e91e3a292df5ee570808b1315c6035a87346.jpg)
------------------------------

## 功能

- 愤怒提示
- 高伤害技能提示
- DPS历史记录(保存最近30份)
- 简单技能日志与分析
- 排行榜系统 (由于网络和服务器系统的原因不完善，系统不稳定。)
- 模块管理器
- 自定义便捷命令

------------------------------

## 用法

- 例 "!dps u" 如果要打开UI或重新加载UI
- 如果你不希望DPS窗口弹出, 点击 [外置浏览器] 或 [隐藏面板]. (并非标题右上角的 X)
- 你可以编辑 config.json 中, "party_leaving_msg" 的值. 当你点击 [离开队伍] 按钮, 自动发送文字并退队
- 需要向指定玩家发送DPS数据时, 在 [空白框] 里输入昵称并点击 [密语] 按钮
- 点击 [模块管理器] 按钮, 可对 `\Tera-proxy\bin\node_modules\` 下的模块进行 [卸载/安装/重装/启用/禁用] 操作
- 编辑 customCommands.json 后, 点击 [自定义命令] 按钮中的对应命令按钮, 可一键发送指令
