var Clock = require('../lib/clock')
  , test = require('tape')

test('test setter method', function(assert) {
  var d = new Clock('B')

  d.set('A')
  d.set('A')

  assert.strictEqual(
      d.get('B')
    , 2
    , 'Local id gets bumped every time (0 indexed)'
  )

  d.set('B')
  d.set('A')

  assert.strictEqual(1, d.get('A'))
  assert.strictEqual(5, d.get('B'))
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
