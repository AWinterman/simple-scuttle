var History = require('../lib/history')
  , test = require('tape')

test('writes correctly', function(assert) {
  var hist = new History(3, 100, order)

  var expected = [
      {version: 0, source_id: 'A'}
    , {version: 0, source_id: 'Z'}
    , {version: 1, source_id: 'B'}
  ].map(function(d) {
    d.key = 0
    d.value = Infinity

    return d
  })

  hist.write(0, Infinity, 'A', 0)
  hist.write(0, Infinity, 'B', 1)
  hist.write(0, Infinity, 'Z', 0)

  assert.deepEqual(expected, hist.memory)

  hist.write(0, Infinity, 'C', 2)

  expected.splice(0, 1)
  expected.push({
      version: 2
    , source_id: 'C'
    , key: 0
    , value: Infinity
  })

  assert.deepEqual(hist.memory, expected)

  assert.end()
})

test('newses correctly', function(assert) {
  var hist = new History(10, 10, order)

  var _ = 0

  hist.write(_, _, 'A', 1)
  hist.write(_, _, 'A', 2)

  hist.write(_, _, 'B', 3)
  hist.write(_, _, 'B', 4)

  var expected = [
      [
          {version: 1, source_id: 'A', key: _, value: _}
        , {version: 2, source_id: 'A', key: _, value: _}
      ]
    , [
          {version: 4, source_id: 'B', key: _, value: _}
      ]
  ]

  assert.deepEqual(hist.news('A', -Infinity), expected[0])
  assert.deepEqual(hist.news('B', 3), expected[1])
  assert.deepEqual(hist.news(0, -Infinity), [])
  assert.deepEqual(hist.news(2, 10), [])
  assert.end()
})

test('`update` events fire as expected', function(assert) {
  var hist = new History(5, 10, order)
    , _ = 0

  var expected = {
      version: _
    , key: _
    , source_id: _
    , value: _
  }

  hist.on('update', function(update) {
    assert.deepEqual(update, expected)
    assert.end()
  })

  hist.write(_, _, _, _)

})


function order(A, B) {
  if(A.version === B.version) {
    return A.source_id < B.source_id
  }
  return A.version < B.version
}


