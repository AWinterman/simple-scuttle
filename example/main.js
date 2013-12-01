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

var fix = true
  , display

demo.start()
demo.force.start()

var graph = document.querySelector('.graph')
  , nodes = demo.node[0]

window.onload = function() {
  var val = getComputedStyle(sizzle('body')[0]).display

  if(val === 'flex') {
    display = true
  }

  onresize()
}

window.onresize = debounce(onresize)

function onresize() {
  demo.dim()
  demo.force.resume()
  console.log(display)

  if(document.body.clientWidth === graph.clientWidth) {
    fix = false
  } else {
    fix = true && display
  }
}

window.onscroll = function() {
  if(fix) {
    graph.style.marginTop = scrollY + 'px'
  }
}

for(var i = 0, len = nodes.length; i < len; ++i) {
  nodes[i].onmousedown = click()
  nodes[i].ontouchleave = click()
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

