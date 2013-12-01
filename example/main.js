var debounce = require('debounce')
  , Demo = require('./Demo')
  , fps = require('fps')

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

window.sizzle = require('sizzle')

var demo = new Demo(15)

window.onresize = debounce(function() {
  demo.dim()
  demo.force.resume()
})

demo.start()
demo.force.start()

var nodes = demo.node[0]

for(var i = 0, len = nodes.length; i < len; ++i) {
  nodes[i].onmousedown = click()
}

setInterval(gossip_once, 200)

var i = 0

function gossip_once() {
  /* i = (i+1) % demo.n */
  var i = Math.floor(Math.random() * demo.n)

  process.nextTick(function() {
    nodes[i].__data__.gossip.gossip()
  })
}

function click() {
  var v = 0

  return function(ev) {
    v++
    process.nextTick(function() {
      ev.target.__data__.gossip.set(ev.target.__data__.gossip.id, v)
    })
  }

}

