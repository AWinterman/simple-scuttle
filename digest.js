module.exports = Digest

function Digest(id) {
  this.state = {}
  this.id = id
}

var cons = Digest
  , proto = cons.prototype

proto.constructor = proto

proto.create = function() {
  return Object.keys(this.state).sort(randomize).map(emit, this)
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

proto.set = function(source_id, version) {
  if(!this.state.hasOwnProperty(source_id) && source_id in this.state) {
    throw new Error('Cannot override prototypal properties')
  }

  if(version === undefined) {
    return this.state[source_id] = -Infinity
  }

  if(version > this.get(source_id)) {
    return this.state[source_id] = version
  }
}

proto.get = function(source_id) {
  if(this.state.hasOwnProperty(source_id)) {
    return this.state[source_id]
  }

  return -Infinity
}
