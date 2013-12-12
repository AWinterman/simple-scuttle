var hyperstream = require('hyperstream')
  , browserify = require('browserify')
  , mini = require('html-minifier')
  , fs = require('fs')

var b = browserify([__dirname + '/js/index.js'])

var hs = hyperstream({
    "style.style": fs.createReadStream(__dirname + '/style.css')
  , "script.bundle": b.bundle()
})

var rs = fs.createReadStream(__dirname + '/html/temp.html')

rs.pipe(hs).pipe(process.stdout)

