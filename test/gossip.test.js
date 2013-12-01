var Gossip = require('../lib/gossip')
  , test = require('tape')

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
  var A = new Gossip('#A', 2, 1)

  var expected = ['Doctor', 'Who', 'Just', 'Me']

  A.write({key: 'name', value: 'Doctor'})
  A.write({key: 'name', value: 'Who'})
  A.write({key: 'name', value: 'Just'})
  A.write({key: 'name', value: 'Me'})

  var result = []
    , i = 0

  A.on('readable', function() {

    var ith_result = A.read()

    assert.deepEqual(ith_result.value, expected[i])

    i++

    if(i === 4) {
      assert.end()
    }

  })

  A.write({ source_id: '#A', version: -10, digest: true, done: true })
}

function readable(assert) {
  var A = new Gossip('#A')

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
  var A = new Gossip('#A', mtu, buffer)
    , B = new Gossip('#B', mtu, buffer)
    , C = new Gossip('#C', mtu, buffer)
    , D = new Gossip('#D', mtu, buffer)

  var gossips = [A, B, C, D]
    , awaiting_drain = []

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
  var A = new Gossip('#A', mtu, buffer)
    , B = new Gossip('#B', mtu, buffer)
    , C = new Gossip('#C', mtu, buffer)
    , D = new Gossip('#D', mtu, buffer)

  var key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    , val = 'abcdefghij'
    , count = 0

  A.pipe(B).pipe(A)
  B.pipe(C).pipe(B)
  A.pipe(D).pipe(A)

  var go = setInterval(gossip, 100)

  function verify() {
    var expected = {
        1: {value: 'a', version: 1}
      , 2: {value: 'b', version: 1}
      , 3: {value: 'c', version: 2}
      , 4: {value: 'd', version: 2}
      , 5: {value: 'e', version: 3}
      , 6: {value: 'f', version: 3}
      , 7: {value: 'g', version: 4}
      , 8: {value: 'h', version: 4}
      , 9: {value: 'i', version: 5}
      , 10: {value: 'j', version: 5}
    }

    assert.deepEqual(C.state[1], expected[1])
    assert.deepEqual(C.state[2], expected[2])
    assert.deepEqual(C.state[3], expected[3])
    assert.deepEqual(C.state[4], expected[4])
    assert.deepEqual(D.state[5], expected[5])
    assert.deepEqual(D.state[6], expected[6])
    assert.deepEqual(D.state[7], expected[7])
    assert.strictEqual(count, 10)
    clearInterval(go)
    assert.end()
  }


  function gossip() {
    if(count % 2) {
      A.set(key[count], val[count])
    } else {
      B.set(key[count], val[count])
    }

    count++

    if(count === key.length) {
      A.gossip()
      B.gossip()
      C.gossip()
      D.gossip()

      verify()
    }
  }
}
