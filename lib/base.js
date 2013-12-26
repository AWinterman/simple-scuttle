module.exports = {}
module.exports.sort = sort
module.exports.resolution = {}

module.exports.config = {}

module.exports.config.mtu = 10
module.exports.config.max_history = 10
module.exports.config.sort = sort
module.exports.config.resolve = null

// Update rules are consequential. You need to be careful here. Three examples
// are provided.
module.exports.resolution.lww_vs_clock = lww_vs_clock
module.exports.resolution.lww_vs_current_vers = lww_vs_current_vers
module.exports.resolution.strictly_order_values = strictly_order_values

// Use gossip's .sort method to compare the current value to the value in the update. If the
// current value is sorted to before the update value, apply the update.
function strictly_order_values(gossip, update) {
  var val = gossip.get(update.key).value

  if(val === null) {
    return true
  }

  return gossip.sort(val, update.value) < 0
}

// Last write wins, but compared against the current version of the key in the
// gossip's state.
function lww_vs_current_vers(gossip, update) {
  var last_seen = gossip.get(update.key).version
    , current_value = gossip.get(update.key).value
    , current

  current = {}
  current.key = update.key
  current.value = current_value === null ? update.value : current_value
  current.source_id = gossip.id
  current.version = last_seen

  return sort(update, current) > 0
}

// Last write wins, but the update is compared against the version number in
// the vector clock
function lww_vs_clock(gossip, update) {
  var last_seen = gossip.clock.get(update.source_id)
    , current_value = gossip.get(update.key).value
    , current

  current = {}
  current.key = update.key
  current.value = current_value === null ? update.value : current_value
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

