
module.exports = {}
module.exports.should_apply = should_apply
module.exports.sort = sort
module.exports.mtu = 10
module.exports.max_history = 10

function should_apply(gossip, update) {
  var last_seen = gossip.clock.get(update.source_id)
    , current_value = gossip.state[update.key]
    , current

  current = {}
  current.key = update.key
  current.value = current_value === undefined ? update.value : current_value
  current.source_id = gossip.id
  current.version = last_seen

  return sort(update, current) > 0
}

function sort(A, B) {
  var Afirst

  if(A.version === B.version) {
    Afirst = A.source_id < B.source_id
  } else {
    Afirst = A.version < B.version
  }

  return Afirst ? -1 : 1
}

