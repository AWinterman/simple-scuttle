#!/usr/bin/env node

var fs = require('fs')
  , hyperstream = require('hyperstream')
  , make_trumpet = require('trumpet')
  , concat = require('concat-stream')
  , opts = {}

opts.outer = true

var trumpet = make_trumpet()

trumpet.selectAll('section.level2', wrap)

process.stdin.pipe(trumpet)
trumpet.pipe(process.stdout)

function wrap(elem) {
  var first = elem.createStream(opts)

  first.pipe(done(first))
}

function done(stream) {
  return concat(function(data) {

    stream.write(
      '<section class=container>' +
      '<section class=example><svg></svg></section>' +
       data.toString() +
      '</section>'
    )
  })
}
