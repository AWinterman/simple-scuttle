var History = require('./history')
  , Digest = require('./digest')
  , Stream = require('stream')
  , util = require('util')

util.inherits(Gossip, Stream.Transform)

module.exports = Gossip

function Gossip(id, maximum_transmission_unit, max_history, order_ids) {
  var opts = {}

  opts.objectMode = true
  opts.highWaterMark = maximum_transmission_unit || 10 // 10 seems reasonable


  Stream.Transform.call(this, opts)

  this.max_history = max_history || 10

  this.digest = new Digest(id, opts)
  this.history = new History(
      max_history
    , maximum_transmission_unit
    , order_ids || order
  )

  this.state = {}
  this.peers = {}

  this.id = id
  this.version = 0
}

function order(A, B) {
  return A.id < B.id
}

var cons = Gossip
  , proto = cons.prototype

proto.gossip = function() {
  emit(this.digest.create(), this)
}

var sofar = []

proto._write = function(data, encoding, callback) {
  if(data.update) {
    // update state
    if(!data.version) {
      data.version = this.version++
    }

    this._set(data.key, data.value, data.version, data.source_id)

    return callback()
  }

  if(data.digest) {
    // compute all the history you've seen and send it.
    emit(this.history.news(data.source_id, data.version), this)
    sofar.push(data.source_id)
  }

  if(data.digets && data.done) {
    // if we have information for sources our partner never asked about, que up
    // all updates from these.

    var unseen = []

    for(var key in this.state) {
      var have = this.digest.get(key) !== -Infinity

      if(have && sofar.indexOf(key) !== -1) {

        // que all updates that we've seen from that source.
        unseen.push({source_id: key, version: -Infinity})
      }
    }

    sofar = []
  }

  return callback()
}

function emit(arr, self) {
  for(var i = 0, len = arr.length; i < len; ++i) {
    self.push(arr[i])
  }
}

proto._read = function() {
  // Can push more data!
  this.emit('ready')
}

function greater_version(A, B) {
  return A.version - B.version
}

proto._set = function(key, value, version, source_id) {
  if(key in this.state && !this.state.hasOwnProperty(key)) {
    throw new Error('Cannot override prototypal properties of object')
  }

  if(!this.state.hasOwnProperty(key)) {
    this.state[key] = {}
  }

  this.state[key].value = value

  // emit the new state.
  this.emit('state', this.state)

  if(source_id && this.peers.hasOwnProperty(source_id)) {
    this.digest.set(source_id, version)
  }

  // and remember the update.
  this.history.write(key, value, version, source)
}


proto.get = function(key) {
  if(this.state.hasOwnProperty(key)) {
    return this.state[key]
  }

  if(key in this.state) {
    throw new Error('Cannot override prototype attributes')
  }

  return {
      version: -Infinity
    , value: null
  }
}
