var Demo = require('./Demo')

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

