var Gossip = require('../../index')
  , stream = require('stream')
  , inherit = require('util').inherits
  , EE = require('events').EventEmitter

module.exports = {}
module.exports.Ring = Ring
module.exports.RingConflict = RingConflict
module.exports.Pair = Pair
module.exports.Random = Random
module.exports.PairConflict = PairConflict
// module.exports.double_ring = double_ring

inherit(Ring, EE)
inherit(RingConflict, EE)
inherit(Pair, EE)
inherit(PairConflict, EE)
inherit(Random, EE)

function Ring(n, mtu, history) {
  EE.call(this)

  this.nodes = []
  this.links = []

  for(var i = 0; i < n; ++i) {
    this.nodes[i] = {
        gossip: new Gossip(id(i), mtu, history)
    }
  }

  for(var i = 0; i < n; ++i) {
    var start = i
      , end = i + 1

    if(i === n - 1) {
      end = 0
    }

    this.links[i] = {
        source: this.nodes[start]
      , target: this.nodes[end]
    }

    this.nodes[start].gossip
      .pipe(this.nodes[end].gossip)
      .pipe(this.nodes[start].gossip)
  }

  keys_n(this, this.nodes)
}

function RingConflict(n, mtu, history) {
  EE.call(this)

  this.nodes = []
  this.links = []

  var halfn = Math.floor(n / 2)

  for(var i = 0; i < halfn; i++) {
    this.nodes[i] = {
        gossip: new Gossip(id(i), mtu, history)
    }
    this.nodes[i + halfn] = {
        gossip: new Gossip(id(i), mtu, history)
    }
  }

  keys_n(this, this.nodes)

  for(var i = 0; i < this.nodes.length; ++i) {
    var start = i
      , end = i + 1

    if(i === (this.nodes.length - 1)) {
      end = 0
    }

    this.links[i] = {
        source: this.nodes[start]
      , target: this.nodes[end]
    }

    this.nodes[start].gossip
      .pipe(this.nodes[end].gossip)
      .pipe(this.nodes[start].gossip)
  }
}

function Random(n, mtu, history) {
  EE.call(this)

  this.nodes = []
  this.links = []

  var i = 0
  while(this.nodes.length < n) {
    i++
    this.nodes.push({gossip: new Gossip(id(i), mtu, history)})
  }

  while(this.links.length < n) {
    var i = Math.floor(Math.random() * n)
      , j = Math.floor(Math.random() * n)

    while(j === i) {
      j = Math.floor(Math.random() * n)
    }

    this.links.push({
          source: this.nodes[i]
        , target: this.nodes[j]
    })

    this.nodes[i].gossip
      .pipe(this.nodes[j].gossip)
      .pipe(this.nodes[i].gossip)
  }

  keys_n(this, this.nodes)
}

function PairConflict(mtu, history) {
  EE.call(this)

  var A = {gossip: new Gossip('A')}
    , B = {gossip: new Gossip('A')}

  this.nodes = [A, B]
  this.links = [{source: A, target: B}]

  A.gossip.pipe(B.gossip).pipe(A.gossip)

  keys_n(this, this.nodes)
}

function Pair(mtu, history) {
  EE.call(this)

  var A = {gossip: new Gossip('A')}
    , B = {gossip: new Gossip('B')}

  this.nodes = [A, B]
  this.links = [{source: A, target: B}]

  A.gossip.pipe(B.gossip).pipe(A.gossip)

  keys_n(this, this.nodes)
}

function keys_n(self) {
  self.n = self.nodes.length
  self.keys = []

  for(var i = 0; i < self.n; ++i) {
    self.keys[i] = self.nodes[i].gossip.id

    self.nodes[i].gossip.on(
        'state'
      , self.emit.bind(
            self
          , 'state'
          , self.nodes[i].gossip.id
        )
    )
  }

  return self
}

function id(i) {
  return String.fromCharCode(97 + i)
}
