var through = require('through2')

module.exports = create_stream

function create_stream(options, history, clock, state) {
  var stream = through(write)

  return stream

  function write(data) {
    var source_id = data.source_id
      , version = data.version
      , value = data.value
      , key = data.key

    if(key in state && !state.hasOwnProperty(key)) {
      throw new Error('Cannot override prototypal properties of object')
    }

    // Note that the version is bumped whether or not the update is applied.
    new_version = clock.update(source_id, version)

    if(version === undefined) {
      version = new_version
    }

    history.write(key, value, source_id, version)

    if(!(key in state)) {
      state[key] = {}
    }

    // update the state
    state[key].value = value
    state[key].version = version
  }
}
