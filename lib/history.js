var EventEmitter = require('events').EventEmitter
  , util = require('util')

module.exports = History

util.inherits(History, EventEmitter)

function History(max_depth, mtu, sort) {
  EventEmitter.call(this)
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

  this.emit('update', update)

  if(this.length > this.max_depth) {
    this.emit('compaction', this.memory, this)
  }

  if(this.memory.length > this.max_depth) {
    this.memory.splice(0, this.length - this.max_depth)
    this.length = this.memory.length
  }

  return update
}

History.prototype.order = function(arr) {
  return arr.sort(this.sort)
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
