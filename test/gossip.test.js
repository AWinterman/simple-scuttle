var Gossip = require('../lib/gossip')
  , defaults = require('../lib/base')
  , Stream = require('stream')
  , test = require('tape')
  , config

config = defaults.config
config.resolve = defaults.resolution.lww_vs_current_vers

test('Integration test via readable calls', readable)

test(
    'updates from one propagate across the network (large)'
  , can_pipe.bind(null, 100, 100)
)


test(
    'updates from one propagate across the network (medium)'
  , can_pipe.bind(null, 10, 10)
)

test(
    'updates from one propagate across the network (tiny)'
  , can_pipe.bind(null, 3, 3)
)

test('can handle more data than mtu', verify_mtu)

test(
    'can handle updates from all across network (large)'
  , everyone_their_own.bind(null, 100, null)
)

test(
    'can handle updates from all across network (medium)'
  , everyone_their_own.bind(null, 10, null)
)

test(
    'can handle updates from all across network (small)'
  , everyone_their_own.bind(null, 3, null)
)

test(
    'can handle updates from all across network (tiny)'
  , everyone_their_own.bind(null, 1, 30)
)

function verify_mtu(assert) {
  var new_config = Object.create(config)
  new_config.mtu = 1
  new_config.max_history = 4

  var A = new Gossip('#A', new_config)

  var expected = ['Doctor', 'Who', 'Just', 'Me']

  var result = []
    , i = 0

  A.on('data', (data) => result.push(data.value))
  A.on('data', (data) => ++i)
  A.on('data', (data) => {if (i >= 4) {
      assert.deepEqual(result, expected)
      assert.deepEqual(A.state.name.value, 'Me')
      assert.end()
  }})

    
  A.write({key: 'name', value: 'Doctor'})
  A.write({key: 'name', value: 'Who'})
  A.write({key: 'name', value: 'Just'})
  A.write({key: 'name', value: 'Me'})
  A.write({ source_id: '#A', version: -10, digest: true, done: true })

}

function readable(assert) {
  var A = new Gossip('#A', config)

  // always ask for just the newest data.
  var local_updates = [
      {key: 'greeting', value: 'hello'}
    , {key: 'name', value: 'Doctor'}
    , {key: 'name', value: 'Who'}
    , {key: 'name', value: 'Just'}
  ]

  var peer_updates = [
      {key: 'name', value: 'Return', source_id: 'peer', version: 24}
    , {key: 'name', value: 'Barry', source_id: 'peer', version: 25}
  ]

  var writes = local_updates.concat(peer_updates)

  var counter = 0

  var onreadable = verify.bind(A, writes.slice())

  A.on('readable', onreadable)

  function verify(writes) {
    var copy = writes.slice()

    var result = A.read()

    var expected = copy[counter]

    if(!expected.version) {
      expected.version = counter + 1
    }

    assert.deepEqual(result, expected, 'i-th write comes out')
    counter++
  }

  var repeat_id = setInterval(next, 20)
    , start

  function next() {
    if(start) {
      start = false
      A.write({
          'source_id': '#A'
        , version: -Infinity
        , digest: true
        , done: true
      })

      return
    }

    if(!writes.length) {
      clearInterval(repeat_id)
      assert.end()

      return
    }

    A.write(writes.shift())

    if(writes.length === 2) {
      start = true
    }
  }
}

function everyone_their_own(mtu, buffer, assert) {
  var new_config = Object.create(config)

  new_config.mtu = mtu
  new_config.max_history = buffer

  var A = new Gossip('#A', config)
    , B = new Gossip('#B', config)
    , C = new Gossip('#C', config)
    , D = new Gossip('#D', config)

  var gossips = [A, B, C, D]
    , awaiting_drain = []

  A.pipe(B).pipe(A)
  B.pipe(C).pipe(B)
  C.pipe(D).pipe(C)
  D.pipe(B).pipe(A)

  for(var i = 0, len = gossips.length; i < len; ++i) {

    if(i === 0) {
      gossips[i].pipe(gossips[len - 1]).pipe(gossips[i])

      continue
    }

    gossips[i - 1].pipe(gossips[i])
    gossips[i].pipe(gossips[i - 1])

    awaiting_drain[i] = false
    gossips[i].on('drain', ondrain.bind(gossips[i], i))
  }

  function ondrain(i) {
    awaiting_drain[i] = false
  }

  function bump(gossip) {
    return gossip.set(gossip.id, gossip.version++)
  }

  function share() {
    for(var i = 0, len = gossips.length; i < len; ++i) {
      if(!awaiting_drain[i]) {
        awaiting_drain[i] = !gossips[i].gossip()
      }
    }
  }

  var cycle = 0
    , i = 0

  function go() {
    if(i < 10) {
      i++
      cycle = (cycle + 1) % gossips.length

      awaiting_drain[cycle] = !bump(gossips[cycle])

      share()
    }

    for(var i = 0; i < awaiting_drain.length; ++i) {
      if(awaiting_drain[i]) {
        return
      }
    }

    verify()
  }

  var interval = setInterval(go, 10)

  function verify() {
    assert.notEqual(A.state, {})
    assert.deepEqual(A.state, B.state)
    assert.deepEqual(A.state, C.state)
    assert.deepEqual(A.state, D.state)
    assert.end()
    clearInterval(interval)
  }
}

function can_pipe(mtu, buffer, assert) {
  var new_config = Object.create(config)

  config.mtu = mtu
  config.max_history = buffer
  var A = new Gossip('#A', config)
    , B = new Gossip('#B', config)
    , C = new Gossip('#C', config)
    , D = new Gossip('#D', config)

  var key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    , val = 'abcdefghij'
    , count = 0

  A.pipe(B).pipe(A)
  B.pipe(C).pipe(B)
  A.pipe(D).pipe(A)

  var go = setInterval(gossip, 100)

  function verify() {
    clearInterval(go)

    var expected = {
        1: 'a'
      , 2: 'b'
      , 3: 'c'
      , 4: 'd'
      , 5: 'e'
      , 6: 'f'
      , 7: 'g'
      , 8: 'h'
      , 9: 'i'
      , 10: 'j'
    }

    assert.deepEqual(C.state[1].value, expected[1])
    assert.deepEqual(C.state[2].value, expected[2])
    assert.deepEqual(C.state[3].value, expected[3])
    assert.deepEqual(C.state[4].value, expected[4])
    assert.deepEqual(D.state[5].value, expected[5])
    assert.deepEqual(D.state[6].value, expected[6])
    assert.deepEqual(D.state[7].value, expected[7])
    assert.strictEqual(count, 10)
    assert.end()
  }

  function gossip() {
    if(count % 2) {
      A.set(key[count], val[count])
    } else {
      B.set(key[count], val[count])
    }

    A.gossip()
    B.gossip()
    C.gossip()
    D.gossip()

    count++

    if(count === key.length) {
      verify()
    }
  }
}
