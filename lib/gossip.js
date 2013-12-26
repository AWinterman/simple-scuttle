var Clock = require('vector-clock-class')
  , History = require('./history')
  , Stream = require('stream')
  , base = require('./base')
  , util = require('util')

util.inherits(Gossip, Stream.Transform)

module.exports = Gossip

function Gossip(id, config) {
  if(!(this instanceof Gossip)) {
    return Gossip.apply(Object.create(proto), arguments)
  }

  if(!config.resolve) {
    throw new Error(
          'config object has no resolve for determining when to apply ' +
          'an update. There are examples in lib/base.js'
    )
  }

  var opts = {}

  opts.objectMode = true
  opts.highWaterMark = config.mtu

  Stream.Transform.call(this, opts)

  this.should_apply = config.resolve // No default for you!
  this.max_history = config.max_history
  this.clock = new Clock(id, 0)
  this.history = new History(
      this.max_history
    , config.mtu
    , config.sort
  )

  this.state = {}
  this.id = id
  this.backlog = []

  return this
}

var cons = Gossip
  , proto = cons.prototype

proto.queue_array = function(array) {
  var keep_going = true
    , i = 0

  while(keep_going && i < array.length) {
    keep_going = this.push(array[i])

    ++i
  }

  return array.slice(i)
}

proto.gossip = function() {
  var self = this

  self.clock.update(self.id)

  var stream = self.clock.createReadStream()

  stream.on('readable', onreadable)
  stream.on('end', onend)

  function onend() {
    self.push({digest: true, done: true})
  }

  function onreadable() {
    var val = true
      , go = true

    while(val && go)  {
      val = stream.read()
      if(val) {
        val.digest = true
        go = self.push(val)
      }
    }
  }
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
  if(data.done && data.digest) {
      this._send_new_key_updates(data)
      return callback()
   }

  if(data.digest) {
    // compute all the history you've seen and send it.
    sofar.push(data.source_id)
    this.queue_array(this.history.news(data.source_id, data.version))
    return callback()
  }

  if(!('source_id' in data)) {
    data.source_id = this.id
  }

  // I think we should write the update to history regardless of whether it is
  // included in the state.
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

  new_version = this.clock.update(source_id, version)

  if(version === undefined) {
    version = new_version
  }

  // update the state, the clock, and the history with this new update.
  this.state[key].value = value
  // I don't *think* we actually need to keep track of version number on the
  // state object.
  this.state[key].version = version
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
