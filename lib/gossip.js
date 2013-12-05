var History = require('./history')
  , Clock = require('./clock')
  , Stream = require('stream')
  , base = require('./base')
  , util = require('util')

util.inherits(Gossip, Stream.Transform)

module.exports = Gossip

function Gossip(id, mtu, max_history, should_apply, sort) {
  if(!(this instanceof Gossip)) {
    return new Gossip(id, mtu, max_history, should_apply, sort)
  }

  var opts = {}

  opts.objectMode = true
  opts.highWaterMark = mtu

  Stream.Transform.call(this, opts)

  this.should_apply = should_apply || base.should_apply
  this.max_history = max_history || base.max_history
  this.clock = new Clock(id, opts)
  this.history = new History(
      base.max_history
    , mtu
    , sort || base.sort
  )

  this.state = {}
  this.id = id
  this.clock.set(this.id, 0)

  this.backlog = []
}

var cons = Gossip
  , proto = cons.prototype

proto.queue_array = function(array) {
  var keep_going = 0 < array.length
    , i = 0

  while(keep_going && i < array.length) {
    keep_going = this.push(array[i])

    ++i
  }

  return array.slice(i)
}

proto.gossip = function() {
  return this.queue_array(this.clock.create())
}

var sofar = []

proto._send_new_key_updates = function(data) {
  if(data.done && data.digest) {
    var unseen = []

    for(var key in this.clock.clock) {
      if(sofar.indexOf(key) !== -1) {
        continue
      }

      // This peer has never seen anything for this key.
      // This is the step that makes deletes difficult.
      this.queue_array(this.history.news(key, -Infinity))
    }

    sofar = []
  }
}

proto._transform = function(data, encoding, callback) {
  if(data.digest) {
    // compute all the history you've seen and send it.
    this.queue_array(this.history.news(data.source_id, data.version))

    sofar.push(data.source_id)

    this._send_new_key_updates(data)

    return callback()
  }

  if(!('version' in data)) {
    data.version  = this.clock.bump(this.id)
  }

  if(!('source_id' in data)) {
     data.source_id = this.id
  }

  if(this.should_apply(this, data)) {
    this._set(data)
  }

  return callback()
}

proto._set = function(data) {
  var source_id = data.source_id
    , version = data.version
    , value = data.value
    , key = data.key

  if(key in this.state && !this.state.hasOwnProperty(key)) {
    throw new Error('Cannot override prototypal properties of object')
  }

  if(!(key in this.state)) {
    this.state[key] = {}
  }

  // update the state, the clock, and the history with this new update.
  this.state[key].value = value
  this.state[key].version = version
  this.clock.set(source_id, version)
  this.history.write(key, value, source_id, version)

  // emit the updated state.
  this.emit('state', this.state)
}

proto.set = function(key, value) {
  var data

  data = {}
  data.key = key
  data.value = value

  return this.write(data)
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
