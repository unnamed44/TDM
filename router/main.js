module.exports = function(u, cb, managercb) {
	u.get(`/api/*`, cb)
	u.get(`/manager/*`, managercb)
}
