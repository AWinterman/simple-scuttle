module.exports = interaction

var Demo =  require('./Demo')
  , debounce = require('debounce')

function interaction(el, network) {
  var demo = new Demo(sizzle('svg', el), network)

  demo.start()
  demo.force.start()

  for(var i = 0, len = demo.node[0].length; i < len; ++i) {
    demo.node[0][i].onmousedown = click()
    demo.node[0][i].ontouchleave = click()
  }

  window.addEventListener('scroll', debounce(onscroll))

  setInterval(gossip_once, 500)

  function gossip_once() {
    var i = Math.floor(Math.random() * demo.n)

    demo.node[0][i].__data__.gossip.gossip()
  }

  var going = true

  function onscroll() {
    var rect =  el.getBoundingClientRect()
    if((rect.top > 0) || (rect.bottom > 0)) {
      if(!going) {
        going = true
        demo.force.start()
        console.log('Ring is onscreen again, starting animation')
      }
    } else if(going) {
      demo.force.stop()
      going = false
      console.log('Ring is offscreen, stopping animation')
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
