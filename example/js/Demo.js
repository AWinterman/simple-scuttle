module.exports = Demo

var d3 = require('d3')

function Demo(el, network) {
  this.n = network.n
  this.el = el
  this.canvas = d3.select(el)
  this.keys = network.keys

  this.fill = d3.scale.category20().domain(d3.range(this.keys))

  network.on('state', this.update.bind(this))

  this.force = d3.layout.force()
    .nodes(network.nodes)
    .links(network.links)

  this.line = d3.svg.line.radial()
}

Demo.prototype.tick = function() {
  /* this.link.attr('d', linkArc) */
  this.node.attr('transform', translate)

  this.link
      .filter(lookup('source.x'))
      .filter(lookup('source.y'))
      .filter(lookup('target.x'))
      .filter(lookup('target.y'))
      .attr("x1", lookup('source.x'))
      .attr("y1", lookup('source.y'))
      .attr("x2", lookup('target.x'))
      .attr("y2", lookup('target.y'));

}

function translate(d) {
  return 'translate(' + d.x + ',' + d.y + ')'
}

Demo.prototype.dim = function() {
  console.log(this.el)
  var rect = this.el.getBoundingClientRect()
  this.width = rect.width
  this.height = rect.height

  if(!this.height || !this.width) {
    return false
  }

  var max_length = Math.min(this.width, this.height) / 10

  this.force
      .size([this.width, this.height])
      .linkDistance(max_length)
      .charge(-1000)

  return true
}

Demo.prototype.start = function() {
  // Establishing some constants
  var self = this

  self.dim()

  self.force
    .gravity(0.3)
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
    .attr('name', lookup('gossip.id'))
    .attr('transform', function(d, i) {
      return 'translate(' + (+self.width / 2) + ',' + (+self.height / 2) + ')'
    })

  self.node.attr('class', 'node')
    .attr('fill', function(d, i) {
      return self.fill(d.gossip.id)
    })
    .attr('stroke', function(d, i) {
      return self.fill(d.gossip.id)
    })

  self.node.append('polygon')

  self.node.append('g')
    .append('text')
    .attr('x', 10)

  self.node.select('g')
    .append('text')
    .attr('x', '-0.25em')
    .attr('y', '0.25em')
    .attr('class', 'id')
    .text(lookup('gossip.id'))

  self.node.call(self.force.drag)

  for(var i = 0, len = self.force.nodes().length; i < len; ++i) {
    self.update(
        self.force.nodes()[i].gossip.id
      , self.force.nodes()[i].gossip.state
    )
  }
}

Demo.prototype.update = function(id, state) {
  var self = this

  self.node.select('[name=' + id + '] polygon')
    .transition()
    .attr('points', self.points.bind(self))

  self.node.select('text').text(lookup('gossip.version'))
}

Demo.prototype.points = function(data) {
  var step = 2 * Math.PI / this.n
    , points = []
    , i = 0

  while(i < this.n) {
    var val = data.gossip.get(this.keys[i]).value || 0

    points[2 * i] = [val * 5 + 20, i * step]
    points[(2 * i) + 1] = [10, (i + 0.5) * step]

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
