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
  opts.highWaterMark = mtu || base.mtu // 10 seems reasonable

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
  this.version = 0
}

var cons = Gossip
  , proto = cons.prototype

proto.gossip = function() {
  var digest = this.clock.create()

  for(var i = 0, len = digest.length; i < len; ++i) {
    this.push(digest[i])
  }
}

var sofar = []

proto._transform = function(data, encoding, callback) {
  if(!data) {
    return callback()
  }

  if(data.digest) {
    // compute all the history you've seen and send it.
    var news

    news = this.history.news(data.source_id, data.version)

    for(var i = 0, len = news.length; i < len; ++i) {
      this.push(news[i])
    }

    sofar.push(data.source_id)
  }

  if(data.done && data.digest) {
    var unseen = []

    for(var key in this.clock.clock) {
      if(sofar.indexOf(key) !== -1) {
        continue
      }

      // This peer has never seen anything for this key.
      // This is the step that makes deletes difficult.
      news = this.history.news(key, -Infinity)

      for(var i = 0, len = news.length; i < len; ++i) {
        this.push(news[i])
      }
    }

    sofar = []
  }

  if(data.done || data.digest) {
    return callback()
  }

  if(!data.version) {
    data.version = ++this.version
  }

  if(!data.hasOwnProperty('source_id')) {
    data.source_id = this.id
  }

  if(!this.should_apply(this, data)) {
    return callback()
  }

  this._set(data.key, data.value, data.version, data.source_id)

  return callback()
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

  if(version > this.version) {
    this.version = version + 1
  }

  this.clock.set(source_id, version)
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
