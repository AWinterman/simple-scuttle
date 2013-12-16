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

var networks = [
    new networks.Ring(10)
  , new networks.Pair()
  , new networks.Random(20)
  , new networks.PairConflict()
  , new networks.RingConflict(10)
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


