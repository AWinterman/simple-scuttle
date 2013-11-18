module.exports = Clock
// A vector clock

function Clock(id) {
  this.clock = {}
  this.id = id
}

Clock.prototype.create = function() {
  return Object.keys(this.clock).sort(randomize).map(emit, this)
}

function randomize(A, B) {
  return Math.random() > 0.5 ? -1 : 1
}

function emit(key, index, array) {
  var data = {}

  data.source_id = key
  data.version = this.get(key)
  data.digest = true

  if(index === array.length - 1) {
    data.done = true
  }

  return data
}

Clock.prototype.set = function(source_id, version) {
  if(!this.clock.hasOwnProperty(source_id) && source_id in this.clock) {
    throw new Error('Cannot override prototypal properties')
  }

  if(version === undefined) {
    return this.clock[source_id] = -Infinity
  }

  if(version > this.get(source_id)) {
    return this.clock[source_id] = version
  }
}

Clock.prototype.get = function(source_id) {
  if(this.clock.hasOwnProperty(source_id)) {
    return this.clock[source_id]
  }

  return -Infinity
}
