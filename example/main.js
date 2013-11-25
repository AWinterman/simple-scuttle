var Demo = require('./Demo')
  , debounce = require('debounce')

window.sizzle = require('sizzle')

var demo = new Demo(20)

window.onresize = function() {
  demo.dim()
  demo.force.start()
}

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

  nodes[i].__data__.gossip.gossip()
}

var stopped = false

sizzle('[data-pause-play]')[0].addEventListener('click', function(ev) {
  ev.preventDefault()

  if(!stopped) {
    demo.force.stop()
    ev.target.textContent = 'play'
    stopped = true

    return
  }

  demo.force.alpha(1.0)
  demo.force.start()
  ev.target.textContent = 'pause'
  stopped = false
})

function click() {
  var v = 0

  return function(ev) {
    v++
    ev.target.__data__.gossip.set(ev.target.__data__.gossip.id, v)
  }

}

