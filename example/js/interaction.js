module.exports = interaction

var Demo =  require('./Demo')
  , debounce = require('debounce')

function interaction(el, network) {
  var demo = new Demo(sizzle('svg', el)[0], network)

  var going = false

  resize()
  onscroll()
  demo.start()

  for(var i = 0, len = demo.node[0].length; i < len; ++i) {
    demo.node[0][i].onmousedown = click()
    demo.node[0][i].ontouchleave = click()
  }

  window.addEventListener('scroll', debounce(onscroll))
  window.addEventListener('resize', debounce(resize))

  setInterval(gossip_once, 200)

  function resize() {
    if(!going) {
      demo.force.resume()
      demo.dim()
      demo.force.stop()
    }

    demo.dim()
    demo.force.resume()
  }

  function gossip_once() {
    var i = Math.floor(Math.random() * demo.n)

    demo.node[0][i].__data__.gossip.gossip()
  }

  function onscroll() {
    var rect =  el.getBoundingClientRect()
    // are we below the top
    if((rect.top < window.innerHeight ) && (rect.bottom > 0)) {
      if(!going) {
        going = true
        demo.force.start()
        console.log(network, ' is onscreen starting animation')
      }
    } else if(going) {
      demo.force.stop()
      going = false
      console.log(network, ' is offscreen, stopping animation')
    }
  }
}

function click() {
  var v = 0

  return function(ev) {
    v++
    ev.target.__data__.gossip.set(ev.target.__data__.gossip.id, v)
  }
}
