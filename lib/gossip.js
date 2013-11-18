var History = require('./history')
  , Digest = require('./digest')
  , Stream = require('stream')
  , util = require('util')

util.inherits(Gossip, Stream.Transform)

module.exports = Gossip

function Gossip(id, mtu, max_history, sort) {
  if(!(this instanceof Gossip)) {
    return new Gossip(id, mtu, max_history, sort)
  }

  var opts = {}

  opts.objectMode = true
  opts.highWaterMark = mtu || 10 // 10 seems reasonable

  Stream.Transform.call(this, opts)

  this.sort = sort || order
  this.max_history = max_history || 10
  this.digest = new Digest(id, opts)
  this.history = new History(
      max_history
    , mtu
    , sort || order
  )

  this.state = {}
  this.id = id
  this.version = 0
}

function order(A, B) {
  if(A.version === B.version) {
    return A.source_id < B.source_id
  }

  return A.version < B.version
}

var cons = Gossip
  , proto = cons.prototype

proto.gossip = function() {
  push(this.digest.create(), this)
}

var sofar = []

proto._transform = function(data, encoding, callback) {
  if(!data) {
    return callback()
  }

  if(data.digest) {
    // compute all the history you've seen and send it.
    push(this.history.news(data.source_id, data.version), this)
    sofar.push(data.source_id)

    if(data.done) {
      var unseen = []

      for(var key in this.digest.state) {
        if(sofar.indexOf(key) !== -1) {
          continue
        }

        push(this.history.news(key, -Infinity), this)
      }

      sofar = []
    }

    return callback()
  }

  if(!data.version) {
    data.version = ++this.version
  }

  if(!data.hasOwnProperty('source_id')) {
    data.source_id = this.id
  }

  var current = this.state[data.key]

  if(!current) {
    current = {}
    current.key = data.key
    current.value = data.value
    current.source_id = this.id
    current.version = -Infinity
  }

  if(!this.sort(current, data)) {
    return callback()
  }

  this._set(data.key, data.value, data.version, data.source_id)

  return callback()
}

function push(arr, self) {
  for(var i = 0, len = arr.length; i < len; ++i) {
    self.push(arr[i])
  }
}

proto._set = function(key, value, version, source_id) {
  if(key in this.state && !this.state.hasOwnProperty(key)) {
    throw new Error('Cannot override prototypal properties of object')
  }

  if(!this.state.hasOwnProperty(key)) {
    this.state[key] = {}
  }

  this.state[key].value = value
  this.state[key].version = version

  this.digest.set(source_id, version)
  this.history.write(key, value, source_id, version)

  // emit the updated state.
  this.emit('state', this.state)
}

proto.set = function(key, value) {
  var data = {}

  data.key = key
  data.value = value

  this.write(data)
}

proto.get = function(key) {
  if(this.state.hasOwnProperty(key)) {
    return this.state[key]
  }

  return {
      version: -Infinity
    , value: null
  }
}
