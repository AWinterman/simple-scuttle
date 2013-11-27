module.exports = Demo

var Gossip = require('../index')
  , d3 = require('d3')

function Demo(n) {
  this.n = n
  this.keys = []

  var nodes = []
    , links = []

  for(var i = 0; i < n; ++i) {
    this.keys[i] = 'id-' + i

    var gossip = Gossip(this.keys[i], 10, 10)

    gossip.on('state', this.update.bind(this))

    nodes[i] = {gossip: gossip}
  }

  for(var i = 0; i < n; ++i) {
    var before = Math.floor((Math.random() * n))
      , after = Math.floor((Math.random() * n))

    links.push({
        source: nodes[i]
      , target: nodes[after]
    })

    links.push({
        source: nodes[i]
      , target: nodes[before]
    })

    nodes[i].gossip
      .pipe(nodes[after].gossip)
      .pipe(nodes[i].gossip)

    nodes[i].gossip
      .pipe(nodes[before].gossip)
      .pipe(nodes[i].gossip)
  }

  this.force = d3.layout.force()
    .nodes(nodes)
    .links(links)

  this.line = d3.svg.line.radial()
}

Demo.prototype.tick = function() {
  this.link
    .attr('x1', lookup('source.x'))
    .attr('y1', lookup('source.y'))
    .attr('x2', lookup('target.x'))
    .attr('y2', lookup('target.y'))

  this.node.attr(
      'transform'
    , translate
  )

  function translate(d) {
    return 'translate(' + d.x + ',' + d.y + ')'
  }
}

Demo.prototype.dim = function() {
  this.height = this.canvas[0][0].offsetHeight
  this.width = this.canvas[0][0].offsetWidth
  this.force
      .size([this.width, this.height])
      .linkDistance(this.width / 10)
      .charge(-(this.width / 5))
}

Demo.prototype.start = function() {
  // Establishing some constants
  var self = this

  self.canvas = d3.select('svg')
  self.dim()

  self.force
    .charge(-1000)
    .on('tick', this.tick.bind(this))

  self.link = self.canvas.selectAll('.link')
      .data(self.force.links())
      .enter()
      .append('line')
      .attr('class', 'link')

  self.node = self.canvas.selectAll('.node')
    .data(self.force.nodes())
    .enter()
    .append('g')
    .attr('id', lookup('gossip.id'))
    .attr('transform', function(d, i) {
      return 'translate(' + (+self.width / 2) + ',' + (+self.height / 2) + ')'
    })

  self.node.attr('class', 'node')
  self.node.append('polygon')
  self.node.call(self.force.drag)
  self.update()
}

var fill = d3.scale.category20().domain(d3.range(10))

Demo.prototype.update = function() {
  var self = this

  self.node.select('polygon')
    .transition()
    .duration(300)
    .ease('quad')
    .attr('points', self.points.bind(self))
    .attr('fill', compose(lookup('gossip.version'), fill))
}

Demo.prototype.points = function(data) {
  var step = 2 * Math.PI / this.n
    , points = []
    , i = 0

  while(i < this.n) {
    var val = data.gossip.get(this.keys[i]).value || 0

    points[i] = [(val + 1) * 5, i * step]

    i += 1
  }

  return this.line(points).slice(1).split('L').join(' ')
}

function lookup(str) {
  var keys = str.split('.')

  return function(obj) {
    for(var i = 0, len = keys.length; i < len; ++i) {
      if(obj === null || obj === undefined) {
        return
      }

      obj = obj[keys[i]]
    }

    return obj
  }
}

function compose() {
  var self = this

  var fns = [].slice.call(arguments)

  return function() {
    var out = fns[0].apply(self, arguments)

    for(var i = 1, len = fns.length; i < len; ++i) {
      out = fns[i].call(self, out)
    }

    return out
  }
}
