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

var sections = sizzle('section.level2')
  , article = document.querySelector('article')

for(var i = 0; i < sections.length; ++i) {
  sections[i].outerHTML = '<section class="container">' + sections[i].outerHTML  + '</section>'
}

sections = sizzle('.container')

var pair = create_demo('example pair')
var pair_conflict = create_demo('example pair conflict')
var ring = create_demo('example ring')
var ring_conflict = create_demo('example ring conflict')
var random = create_demo('example random')

sections[0].appendChild(pair)
sections[1].appendChild(ring)
sections[3].appendChild(pair_conflict)
sections[4].appendChild(ring_conflict)
sections[5].appendChild(random)

setTimeout(function() {
  interaction(pair, new networks.Pair())
  interaction(pair_conflict, new networks.PairConflict())
  interaction(ring, new networks.Ring(10))
  interaction(ring_conflict, new networks.RingConflict(10))
  interaction(random, new networks.Random(20))
}, 1)

function create_demo(classname) {
  var demo = document.createElement('section')

  demo.className = classname
  demo.innerHTML = '<svg></svg>'

  return demo
}
