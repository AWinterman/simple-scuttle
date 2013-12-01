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
    nodes[i] = {}
    nodes[i].gossip = Gossip(this.keys[i], 100, 10)
    nodes[i].gossip.on('state', this.update.bind(this))
  }

  for(var i = 0; i < n; ++i) {

    var after  = i ? i - 1 : n - 1
      , before = i % (n - 1)

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
    .attr('d', linkArc)

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
  this.width = this.canvas[0][0].clientWidth
  console.log(this.width)

  this.force
      .size([this.width, this.height])
      .linkDistance(200)
      .charge(-(this.width / 5))
      .gravity(0.2)
}

Demo.prototype.start = function() {
  // Establishing some constants
  var self = this

  self.canvas = d3.select('body')
      .insert('div', ':first-child')
      .attr('class', 'graph')
      .append('svg')

  self.dim()

  self.force
    .charge(-1000)
    .on('tick', this.tick.bind(this))

  self.link = self.canvas.selectAll('.link')
      .data(self.force.links())
      .enter()
      .append('path')
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
    .attr('fill', function(d, i) {
      return fill(i)
    })
    .attr('stroke', function(d, i) {
      return fill(i)
    })

  self.node.append('polygon')

  self.node.append('g')
    .append('text')
    .attr('x', 10)

  self.node.select('g')
    .append('text')
    .attr('x', -20)
    .attr('class', 'id')
    .text(lookup('gossip.id'))

  self.node.call(self.force.drag)
  self.update()
}

var fill = d3.scale.category10().domain(d3.range(10))

Demo.prototype.update = function() {
  var self = this

  self.node.select('polygon')
    .transition()
    .duration(300)
    .attr('points', self.points.bind(self))

  self.node.select('text').text(lookup('gossip.version'))
}

Demo.prototype.points = function(data) {
  var step = 2 * Math.PI / this.n
    , points = []
    , i = 0

  while(i < this.n) {
    var val = data.gossip.get(this.keys[i]).value || 0

    points[2 * i] = [(val + 1) * 10, i * step]
    points[(2 * i) + 1] = [1, (i + 0.5) * step]

    i += 1
  }

  return this.line(points).slice(1).split('L').join(' ')
}

function linkArc(d) {
  var dy = d.target.y - d.source.y
    , dx = d.target.x - d.source.x

  var dr = Math.sqrt(dx * dx + dy * dy)

  return 'M' + d.source.x + ',' + d.source.y +
    'A' + dr + ',' + dr + ' 0 0,1 ' +
     d.target.x + ',' + d.target.y
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
