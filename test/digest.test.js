var Clock = require('../lib/clock')
  , test = require('tape')

test('test setter method', function(assert) {
  var d = new Clock('B')

  d.set('A', 2)
  d.set('A', 1)

  assert.strictEqual(d.get('B'), -Infinity)

  d.set('B', 3)

  // direct access :\
  assert.strictEqual(d.clock.A, 2)

  assert.strictEqual(d.get('B'), 3)
  assert.strictEqual(d.get('A'), 2)
  assert.end()
})

test('creates digest correctly', function(assert) {
  var d = new Clock('A')

  d.clock = {
      'A': 0
    , 'B': 2
    , 'C': 3
    , 'D': 1
  }

  var result = d.create()

  result.sort(sort_by_id)

  var expected = [
      {source_id: 'A', version: 0, digest: true}
    , {source_id: 'B', version: 2, digest: true}
    , {source_id: 'C', version: 3, digest: true}
    , {source_id: 'D', version: 1, digest: true}
  ]

  for(var i = 0, len = result.length; i < len; ++i) {
    if(result[i].done) {
      expected[i].done = true
    }
  }

  assert.deepEqual(result, expected)
  assert.end()
})

function sort_by_id(A, B) {
  return A.source_id < B.source_id ? -1 : 1
}
