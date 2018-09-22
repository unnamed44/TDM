'use strict'

const WARN_DEPRECATED = true,
	WARN_ONLY_ONCE = true

const warnings = new Set()

function warn() {
	if(!WARN_DEPRECATED || WARN_ONLY_ONCE && warnings.size) return

	const src = Error().stack.split('\n')[3].slice(7)

	if(!warnings.has(src)) {
		warnings.add(src)
		//console.warn(`DeprecationWarning: Long.JS is deprecated. Use BigInt equivalents instead.\n    at ${src}`)
	}
}

Object.defineProperties(BigInt.prototype, {
	low: {
		get() { warn(); return Number(BigInt(this) & 0xffffffffn) | 0 },
		set() { throw Error('Cannot set property "low", use BigInt operators instead.') }
	},
	high: {
		get() { warn(); return Number(BigInt(this) >> 32n & 0xffffffffn) | 0 },
		set() { throw Error('Cannot set property "high", use BigInt operators instead.') }
	},
	unsigned: {
		get() { throw Error('Cannot get property "unsigned", use BigInt operators instead.') },
		set() { throw Error('Cannot set property "unsigned", use BigInt operators instead.') }
	}
})

Object.assign(BigInt.prototype, {
    add(val) { warn(); return BigInt(this) + BigInt(val) },
    sub(val) { warn(); return BigInt(this) - BigInt(val) },
    multiply(val) { warn(); return BigInt(this) * BigInt(val) },
    div(val) { warn(); return BigInt(this) / BigInt(val) },
    divThousand(val) { warn(); var stringValue = this.toString()
  		return stringValue.substring(0, stringValue.length - 3) },
    equals(val) { warn(); return BigInt(this) === BigInt(val) },
    gt(val) { warn(); return BigInt(this) > BigInt(val) ? true:false },
    isZero() { warn(); return BigInt(this) === 0n },
    eqz() { warn(); return BigInt(this) === 0n },
    toNumber() { warn(); return Number(this) }
})

function BigIntLong() { warn() }
//throw Error('Long constructor is no longer supported, use BigInt type instead') }

Object.defineProperties(BigIntLong, {
	ZERO: { get() { warn(); return 0n } },
	ONE: { get() { warn(); return 1n } },
	NEG_ONE: { get() { warn(); return -1n } },
	UZERO: { get() { warn(); return 0n } },
	UONE: { get() { warn(); return 1n } },
	MAX_VALUE: { get() { warn(); return 0x7fffffffffffffffn } },
	MIN_VALUE: { get() { warn(); return -0x8000000000000000n } },
	MAX_UNSIGNED_VALUE: { get() { warn(); return 0xffffffffffffffffn } }
})

Object.assign(BigIntLong, {
	isLong(val) { warn(); return typeof val === 'bigint' },
	fromNumber(val, unsigned) { warn(); return BigInt[unsigned ? 'asUintN' : 'asIntN'](64, BigInt(val)) },
	fromString(val, unsigned, radix = 10) {
		if(radix !== 10) throw Error('Cannot parse radix != 10, use BigInt functions instead.')
		warn(); return BigInt[unsigned ? 'asUintN' : 'asIntN'](64, BigInt(val))
	},
	fromValue(val, unsigned) { warn(); return BigInt[unsigned ? 'asUintN' : 'asIntN'](64, BigInt(val)) }
})

module.exports = BigIntLong
