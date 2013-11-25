# [Scuttlebutt Gossip Protocol Demo][scuttlebutt] # 

with [d3 force directed layouts](https://github.com/mbostock/d3/wiki/Force-Layout).

<div>
<svg></svg>
</div>

This graph is randomly generated on page load. If you dislike it, reload
the page!

Clicking on a node causes it to change its own state-- you will see a point
start to diverge from the circle (actually an
[icosagon](http://faculty.kutztown.edu/schaeffe/Tutorials/General/Polygons.html)).
It will then propagate its state across the network via [my
implementation][simple-scuttle] of the scuttlebutt gossip protocol.

Every 30 miliseconds, a randomly chosen node gossips with the nodes connected
to it by an edge.

[scuttlebutt]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[simple-scuttle]: https://github.com/awinterman/simple-scuttle 
