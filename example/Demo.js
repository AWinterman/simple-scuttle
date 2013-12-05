module.exports = Demo

var d3 = require('d3')

function Demo(network) {
  this.n = network.n
  this.keys = []

  this.force = d3.layout.force()
    .nodes(newtork.nodes)
    .links(network.links)

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
  this.height = this.canvas[0][0].clientHeight
  this.width = this.canvas[0][0].clientWidth

  if(!this.height || !this.width) {
    this.force.stop()
    return this.canvas[0][0].classList.add('browser-error')
  }

  this.force
      .size([this.width, this.height])
      .linkDistance(100)
      .charge(-(this.width) || -1000)
      .gravity(0.2)
}

Demo.prototype.start = function() {
  // Establishing some constants
  var self = this

  self.canvas = d3.select('body')
      .insert('div', ':first-child')
      .attr('class', 'graph')
      .append('svg')

  d3.select('body').select('.graph')
    .append('h3')
    .attr('class', 'error-message')
    .text("For best viewing, check this out in opera or chrome.")

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
