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

proto._queue_array = function(array) {
  var keep_going = true
    , i = 0

  while(keep_going && i < array.length) {
    keep_going = this.push(array[i])

    ++i
  }
}

