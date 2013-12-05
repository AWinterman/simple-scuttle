module.exports = Clock
// A vector clock

function Clock(id, start) {
  this.id = id
  this.start = (start === undefined) ? 0 : start
  this.clock = {}
  this.clock[this.id] = this.start
}

Clock.prototype.create = function() {
  var keys = Object.keys(this.clock).sort(randomize)
    , data

  if(keys.length) {
    return keys.map(emit, this)
  }

  // if we haven't seen anything yet, then ask for all possible updates.
  data = {}
  data.source_id = this.id
  data.version = -Infinity
  data.digest = true
  data.done = true

  return [data]
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

Clock.prototype.get = function(source_id) {
  if(this.clock.hasOwnProperty(source_id)) {
    return this.clock[source_id]
  }

  return -Infinity
}

Clock.prototype.bump = function(id) {
  if(!this.clock.hasOwnProperty(id) && (id in this.clock)) {
    throw new Error('Cannot override prototypal properties')
  }
  // if it's there, bump it. Otherwise add it. Then make sure this clocks
  // version number is still bigger.

  if(id in this.clock) {
    this.clock[id]++
  } else {
    this.clock[id] = this.start
  }

  if(this.clock[this.id] <= this.clock[id]) {
    this.clock[this.id] = this.clock[id] + 1
  }

  return this.clock[id]
}
