var Gossip = require('../gossip')
  , test = require('tape')

test('Integration test via readable calls', function(assert) {
  var A = new Gossip('A')

  // always ask for just the newest data.
  var writes = [
      {key: 'greeting', value: 'hello'}
    , {version: 0, id: 'tester', digest: true}
    , {key: 'name', value: 'Doctor'}
    , {version: 1, id: 'tester', digest: true}
    , {key: 'name', value: 'Who'}
    , {version: 2, id: 'tester', digest: true}
    , {} // anything which has neither key nor digest causes the receiver to send
         // digest. false would also work here.
    , {key: 'name', value: 'Just'}
    , {key: 'name', value: 'Return'}
    , {key: 'name', value: 'Barry'}
    , {version: 4, id: 'tester', digest: true}
  ]

  var greet_value = ['hello', 'hello', 'hello']
    , is_digests = [false, false, false, false]
    , name_value = [null, 'Doctor', 'Who']
    , name_version = [-Infinity, 2, 3]
    , greet_version = [1, 1, 1]
    , versions = [1, 2, 3]
    , value = ['hello', 'Doctor', 'Who', 'Barry']

  var counter = 0

  A.on('readable', function() {
    var data = A.read()

    assert.strictEqual(data.value, value[counter])

    // responds with a digest when it should
    assert.strictEqual(!!data.digest, !!is_digests[counter])

  })

  A.on('readable', function() {
    if(counter >= 3) {
      return
    }

    assert.strictEqual(A.version, versions[counter])
    assert.strictEqual(A.get('greeting').value, greet_value[counter])
    assert.strictEqual(A.get('greeting').version, greet_version[counter])

    assert.strictEqual(A.get('name').value, name_value[counter])
    assert.strictEqual(A.get('name').version, name_version[counter])
  })

  A.on('readable', function() {
    counter++
  })

  A.on('end', function() {
    assert.ok(counter)
  })

  var repeat_id = setInterval(next, 20)

  function next() {
    if(!writes.length) {
      A.end()

      clearInterval(repeat_id)
      return assert.end()
    }

    A.write(writes.shift())
  }
})


test('Can pipe gossipers together appropriately', function(assert) {
  var Stream = require('stream')

  var C = new Gossip('C')
    , D = new Gossip('D')
    , E = new Gossip('E')

  var counter = 0

  C.pipe(D).pipe(C)
  D.pipe(E).pipe(D)


  var report = new Stream.Writable({objectMode: true})

  report._write = function(chunk, enc, cb) {
    console.log(chunk)
    cb && cb()
  }

  // C.pipe(report)
  // D.pipe(report)
  // E.pipe(report)

  C.set('a', 1)
  C.set('b', 2)
  C.set('c', 3)

  D.set('e', 3)
  D.set('d', 3)


  C.on('digest', function(dig) {
    console.log('digest', dig)
  })

  setInterval(gossip, 1000)

  function gossip() {
    console.log(counter)
    console.log('C', C.state)
    console.log('D', D.state)
    console.log('E', E.state)

    counter++

    if(!(counter % 5)) {
      console.log('set z on C')
      C.set('z', 'GOODBYE ' + counter)
    }

    if(!(counter % 3)) {
      console.log('set e on D')
      D.set('e', 'HELLO! ' + counter)
    }

    C.start()
    D.start()
    E.start()
  }
})
