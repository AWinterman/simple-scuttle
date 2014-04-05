var thorugh = require('through2')

module.exports = create_stream

function create_stream(options, history, clock, state) {
  var stream = through(options, onwrite, onend)
    , sofar = {}

  return stream

  function onwrite(data, encoding, cb) {
    sofar[data.id] = true
    // compute all the history you've seen and send it.

    queue_array(stream, history.news(data.id, data.version), cb)
  }

  function onend(cb) {
    for(var key in clock.clock) {
      if(sofar.hasOwnProperty(key)) {
        continue
      }

      // If you've ended, then we know about keys you don't know about
      queue_array(stream, history.news(key, -Infinity))
    }

    sofar = {}
    cb()
  }
}

function queue_aray(stream, array, cb) {
  var keep_going = true
    , i = 0

  while(keep_going && i < array.length) {
    keep_going = stream.push(array[i])

    ++i
  }

  cb()
}


