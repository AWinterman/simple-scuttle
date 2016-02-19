window.sizzle = require('sizzle')

var interaction = require('./interaction')
  , fps = require('fps')
  , networks = require('./network')

var ticker = fps({
    every: 25   // update every 10 frames
})

var fps_el = document.createElement('span')

fps_el.className += 'fps'

document.body.appendChild(fps_el);

setInterval(function() {
  ticker.tick()
}, 1000 / 60)


ticker.on('data', function(framerate) {
  framerate = Math.round(framerate)
  fps_el.innerHTML = 'fps: ' + framerate
})

var sections = sizzle('section')
  , article = document.querySelector('article')

sections = sizzle('.container .example')

var config = {}

config.mtu = 10
config.max_history = 10
config.sort = sort
config.resolve = function strictly_order_values(gossip, update) {
  var val = gossip.get(update.key).value

  if(val === null) {
    return true
  }

  return gossip.sort(val, update.value) < 0
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


var networks = [
    new networks.Ring(10, config)
  , new networks.Pair(config)
  , new networks.Random(20, config)
  , new networks.PairConflict(config)
  , new networks.RingConflict(10, config)
]

setTimeout(function() {
  for(var i = 0, len = Math.max(networks.length, sections.length); i < len; ++i) {
    var method
    if(i == 1) {
      method = 'sequential'
    }

    interaction(sections[i], networks[i], method)
  }
}, 1)


