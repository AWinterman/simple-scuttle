var Gossip = require('../lib/gossip')
  , test = require('tape')
  , Stream = require('stream')

test('Integration test via readable calls', readable)
test('can pipe together', can_pipe)

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

  assert.plan(writes.length)

  var counter = 0

  var onreadable = verify.bind(A, writes.slice())

  A.on('readable', onreadable)

  function verify(writes) {
    var copy = writes.slice()

    var result = A.read()

    if(counter === writes.length) {
      return A.end()
    }

    var expected = copy[counter]

    if(!expected.version) {
      expected.version = counter + 1
    }

    assert.deepEqual(result, expected, 'i-th write comes out')
    counter++
  }

  var repeat_id = setInterval(next, 20)
    , second
    , start

  function next() {
    if(start) {
      start = false
      A.write(
          {'source_id': '#A', version: -Infinity, digest: true, done: true}
      )

      return
    }

    if(second) {
      second = false
      A.write(
          {'source_id': 'peer', version: -Infinity, digest: true, done: true}
      )

      return
    }

    if(!writes.length) {

      clearInterval(repeat_id)

      return
    }

    A.write(writes.shift())

    if(writes.length === 2) {
      start = true
    }

    if(writes.length === 0) {
      second = true
    }
  }
}

function can_pipe(assert) {
  assert.plan(5)

  var A = new Gossip('#A')
    , B = new Gossip('#B')
    , C = new Gossip('#B')

  var key = [1, 2, 3, 4]
    , val = 'abcd'
    , count = 0

  function verify() {
    var expected = {
        1: {value: 'a', version: 1}
      , 2: {value: 'b', version: 1}
      , 3: {value: 'c', version: 2}
      , 4: {value: 'd', version: 2}
    }

    assert.deepEqual(C.state[1], expected[1])
    assert.deepEqual(C.state[2], expected[2])
    assert.deepEqual(C.state[3], expected[3])
    assert.deepEqual(C.state[4], expected[4])
    assert.strictEqual(count, 4)
  }

  A.pipe(B).pipe(A)
  B.pipe(C).pipe(B)

  var go = setInterval(gossip, 100)

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
      verify()
      clearInterval(go)
    }

  }

}
