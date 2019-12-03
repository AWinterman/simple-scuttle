var Clock = require('vector-clock-class')
  , History = require('./history')
  , Stream = require('stream')
  , base = require('./base')
  , util = require('util')

util.inherits(Gossip, Stream.Transform)

module.exports = Gossip

function Gossip(id, config, state) {
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

  this.state = state || {}
  this.id = id
  this.backlog = []

  return this
}

var cons = Gossip
  , proto = cons.prototype

// for local events.
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

proto.gossip = function() {
  var self = this

  self.clock.update(self.id)

  var stream = self.clock.createReadStream()

  stream.on('readable', gossip_onreadable.bind(null, self, stream))
  stream.on('end', gossip_onend.bind(null, self))
}

function gossip_onreadable(self, clock_stream) {
  var val = true
    , go = true

  while(val && go)  {
    val = clock_stream.read()

    if(!val) {
      break
    }

    val.digest = true
    go = self.push(val)
  }
}

function gossip_onend(self) {
  self.push({digest: true, done: true})
}


proto._queue_array = function(array) {
  var keep_going = true
    , i = 0

  while(keep_going && i < array.length) {
    keep_going = this.push(array[i])

    ++i
  }
}

var sofar = []

proto._digest = function(data) {
  if(!data.digest || (data.digest && data.done)) {
    return false
  }

  sofar.push(data.id)


  // compute all the history you've seen and send it.
  this._queue_array(this.history.news(data.id, data.version))
  return true
}


proto._digest_done = function(data) {
  if(!data.done || !data.digest) {
      return false
   }

  for(var key in this.clock.clock) {
    if(sofar.indexOf(key) !== -1) {
      continue
    }

    // If we've made it here, then the peer sending the digest has never seen
    // anything for this key.  This is the step that makes deletes difficult.
    this._queue_array(this.history.news(key, -Infinity))
  }

  sofar = []
  return true
}

proto._transform = function(data, encoding, callback) {
  var digest_done = this._digest_done(data)
    , digest = this._digest(data)

  if(digest_done || digest) {
    return callback()
  }

  if(!('source_id' in data)) {
    data.source_id = this.id
  }

  this._set(data)

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

  // Note that the version is bumped whether or not the update is applied.
  new_version = this.clock.update(source_id, version)

  if(version === undefined) {
    version = new_version
  }

  this.history.write(key, value, source_id, version)

  if(!(key in this.state)) {
    this.state[key] = {}
  }

  // update the state
  this.state[key].value = value
  this.state[key].version = version

  // emit the updated state.
  this.emit('state', this.state)
}

