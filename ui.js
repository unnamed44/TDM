'use strict'

const Express = require('express')
const {host, port} = require('./ui_config')

class LazyServer {
	constructor(dispatch) {
		this.dispatch = dispatch
		this.q = null
		this.app = null
		this.port = 0
		this.router = null
	}

	async get(router) {
		// Switch active router
		this.router = router
		// Load or await
		if (!this.port)
			if (!this.q) {
				this.app = await (this.q = new Promise((resolve, reject) => {
					const app = Express()
					.set('env', 'production')
					.enable('case sensitive routing')
					.disable('x-powered-by')
					.use((req, res, next) => { this.router(req, res, next) })
					.use((req, res) => { res.status(404).end() })
					.use((err, req, res, next) => {
						console.error(err)
						res.status(500).end()
					})
					.listen(port, host, () => { resolve(app) })
					.on('error', reject)
				}))
				this.port = this.app.address().port
				this.q = null
				// Clean up on exit
				this.dispatch.base.connection.serverConnection.once('close', () => { this.app.close() })
			} else {
				await this.q
			}
		return `${host}:${this.port}`
	}
}

const servers = new WeakMap()

async function getServer(router) {
	const base = router.dispatch.base
	if (servers.has(base)) return servers.get(base).get(router)
	const server = new LazyServer(router.dispatch)
	servers.set(base, server)
	return server.get(router)
}

function UI(dispatch, options) {
	return UI.Router(dispatch, options)
}

Object.assign(UI, Express, {
	Router(dispatch, options) {
		const router = Express.Router(options)
		Object.setPrototypeOf(router, UI.Router.prototype)
		router.dispatch = dispatch
		return router
	}
})

UI.Router.prototype = Object.assign({}, Express.Router, {
	async open(path = '/') {
		if (!path.startsWith('/')) path = '/' + path
		this.dispatch.toClient('S_OPEN_AWESOMIUM_WEB_URL', 1, {url: await getServer(this) + path})
	}
})

module.exports = UI
