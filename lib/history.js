var Stream = require('stream')
  , util = require('util')

module.exports = History

util.inherits(History, Stream.Duplex)

function History(max_depth, mtu, sort) {
  var opts = {}

  opts.highWaterMarkd = mtu
  opts.objectMode = true

  Stream.Duplex.call(this, opts)
  this.max_depth = max_depth
  this.sort = sort

  this.memory = []
  this.length = 0
}

History.prototype.write = function(key, value, source_id, version) {
  // create a single object form it, and remember it.
  var update = {}

  update.key = key
  update.value = value
  update.source_id = source_id
  update.version = version

  this.memory[this.length++] = update
  this.order(this.memory)

  // Emitting an event so the user can remove stale information from memory if
  // necessary, before the call to splice. (Recall that listeners are
  // executed synchronously).
  this.emit('update', update)

  if(this.length > this.max_depth) {
    this.memory.splice(0, this.length - this.max_depth)
    this.length = this.memory.length
  }

  return update
}

History.prototype.order = function(arr) {
  var self = this

  return arr.sort(sort)

  function sort(A, B) {
    return self.sort(A, B) ? -1 : 1
  }
}

History.prototype.news = function(id, version) {
  // given the id and the version, return all updates for the given id greater
  // than the given version.
  var news = []

  for(var i = 0; i < this.length; ++i) {
    var delta = this.memory[i]

    if(delta.version > version && delta.source_id === id) {
      news.push(delta)
    }
  }

  return news
}
