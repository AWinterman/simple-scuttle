% Scuttlebutt
% **[A Scuttlebutt Demo][scuttlebutt]**
% with [d3 force directed layouts](https://github.com/mbostock/d3/wiki/Force-Layout) and node.js

<aside class="admonition">For best viewing, use chrome, opera or safari.</aside>

##What is it?##

This is a demo of *Simple-Scuttle*, a [Javascript implementation][simple-scuttle]
of the Scuttlebutt gossip protocol as it is described in [van Renesse et
al.][scuttlebutt].  *Simple-Scuttle* builds on the
[node.js](http://nodejs.org/) core library, leveraging node streams[^stream] to
manage data over time, meaning it plays well with other elements of node
core, like `http` or `tcp`.

[Scuttlebutt][scuttlebutt] is a protocol for flow control and efficient
reconciliation-- meaning it propagates information across a network, and does
it well. In general, the network could be any distributed system-- computers
distributed in space, processes in a single machine, or as is the case here,
svg polygons (![inline-ten](./assets/ten.svg)) in the DOM.

Polygons, ![pair](./assets/pair.svg), ![ten](./assets/ten.svg), or
![twenty](./assets/twenty.svg) represent nodes in the network. In the toy
examples here, each node is responsible for a single value - the number of
times it has been clicked - and each node reports that value to the nodes with
which it shares an edge.

**Click on a node to update its state!**

The state at each node is represented by the polygon's shape- there is one
point per node in the network, so ![pair](./assets/pair.svg) describes the
initial the state of a network with two nodes in it, and
![ten](./assets/ten.svg) a network with ten. When the user clicks on a node,
its corresponding point distends, 

<aside class=inline>so after a few clicks, ![full](./assets/pair.svg) might turn into ![full](./assets/distended-pair.svg).</aside>

## The Protocol##

*I recommend reading the [paper][scuttlebutt] for the full story, including a
discussion of Scuttlebutt's performance characteristics.*

There are essentially three data structures to Scuttlebutt-- some sort of store
for the state, a [vector clock](http://npm.im/vector-clock-class),  which helps
determine what updates to ask for, and a structure for replaying, compacting,
and holding on to
[history](https://github.com/AWinterman/simple-scuttle/blob/master/lib/history.js).
Additionally, there is an etiquette for how gossip should happen.

The vector clock allows sensible application of version numbers to all updates,
and ensures that updates received by a node can be at least partially ordered
by a `precedes` relation, which allows quick exchange about the most recent
information a given node has seen. 

The history data structure keeps track of new updates as they come in, and
can replay all updates from a given node in chronological order upon request.

Gossip between two peers begins by exchanging vector clocks-- each peer sends
the other a list of highest version number they've seen  from each other node 
in the network (including themselves). 

For example, suppose ![pair](./assets/pair.svg) sends its vector clock to
![red-pair](./assets/red-pair.svg). In that list there's the two-ple
(![red-pair](./assets/red-pair.svg), 10), so ![red-pair](./assets/red-pair.svg)
responds with all the updates it has heard about from itself (e.g. local
updates) with version numbers greater than 10, ordering them in chronological order.
![red-pair](./assets/red-pair.svg) sends them one at a time until it has sent them
all, or exceeded the its bandwidth. The next time
![red-pair](./assets/red-pair.svg) and ![pair](./assets/pair.svg)  gossip, they will
again exchange vector clocks, which will ensure that they neither repeate
themselves nor leave anything out. This extends directly to a more complicated
network, since gossip is always pairwise.

Scuttlebutt is cpu and network efficient, and **eventually** consistent.

## The Vector Clock##

How do we assign version numbers to updates occuring across a distributed
network? How does one node tell an update coming from a peer occured before a
local update?

Scuttlebutt [partially orders](partial-ordering) updates by means of a [a vector
clock][vector clock], described in full in [Lamport 1978][vector clock]. It
works, more or less as follows:

Suppose nodes `A`, `B` must exhange updates. Each node maintains a vector,
called the `clock` of logical times[^logical-time] for each node in the
network. The `clock` is updated according to the following two rules (IR1 and
IR2 from [the paper][vector clock]):

1. Each peer must update it's own entry in the vector between any two updates
2. If A sends an update to B, it must also send along the logical time, `t`, at
   which the update occured.  Upon receive the update, B updates A's entry in
   its own clock to `t`, and then ensures its own entry in its clock is greater
   than `t`.

In the beginning, they each maintain a vector clock that looks like this:

```
A : [0, 0] 
B : [0, 0]
```

Now A receives a local update, so it updates its own entry in its clock.

```
A : [1, 0] 
B : [0, 0]
```

When `A` gossips with `B`, it sends an update along with the version number at
which the update occured, in this case `1`. `B` updates the entry in the clock
corresponding to `A`. It also increments its own entry in its clock to be one
higher than `A`'s. Note that no individual update is marked with time 2, and
none will be.

```
A : [1, 0] 
B : [1, 2] 
```

Now B encounters a local update, so it increments it's own clock.


```
A: [1, 0] 
B: [1, 3]
```

And sends the new update to A:

```
A: [4, 3]
B: [1, 3]
```

## Conflict

How do peers decided when to apply updates? What happens if B encounters another local update?

```
A: [4, 3] 
B: [1, 4]
```

When B sends it's update to A,  A will merrily apply the update rules, arriving
at:

```
A: [5, 4]
B: [1, 4]
```

But A is still left to resolve which of `[4, 3]` and `[1, 4]` came first. It
turns out it cannot do so without appeal to external heauristics or physical
time, a difficult task across a distributed network. 

Lamport recommends reading [*Dissemination of System Time* by Ellingson et
al.][system time], but the paper remains behind a tall paywall[^system-time], so I haven't
been able to read it.

During my research (furious googling for the most part), heuristics proved the
more common approach. Some are maddeningly arbitrary. For example,
[Cassandra][], which uses scuttlebutt to propagate updates across its network,
orders updates by their value. It gives primacy to `DELETE` operations, which
is to say if `A` sent `DELETE key` to `B`, then no matter what the value of
concurrent (as far as the vector clock is concerned) updates, `key` is deleted
from the `B`'s store. If non-delete updates occur simultaneously, Cassandra
saves the update which **is lexically larger**!  

In the
[scuttlebutt/model](https://github.com/dominictarr/scuttlebutt/blob/master/model.js)
of [npm.im/scuttlebutt][], [\@dominictarr][dominic] uses *last write wins*, and
then [lexically compares][dominic-resolve] node names to resolve precedence 
ambiguities, essentially attributing credibility based on alphabetically
sorting node names.

Even if we can definitively determine which update happend most recently, 
it is not at all clear that *last write wins* is the best way to determine
whether an update should be applied. The constraints of the use case are going
to determine the update rule, but it turns out this is a hard problem.  so
*Simple-Scuttle* [leaves it to the client](https://github.com/AWinterman/simple-scuttle#constructor).

## Relation to npm.im/scuttlebuttand *van Renesse et al.*

My implementation, and consequently this module, was inspired by [Dominic
Tarr's scuttlebut module][npm.im/scuttlebutt]. This module works, but
I found the source hard to parse, which was problematic since it is 
designed to be subclassed. I also found it difficult to draw parallels between
[the paper][scuttlebutt] and this implementation. So I wrote my own.

[^stream]: [Node Streams][node streams] abstractions built into the node core
library for handling data over time. They present a unix-like api which allows
one to write to sinks, read from sources, and pipe sources to sinks. They are
available in the browser via [browserify][].&nbsp;

[^logical-time]: Logical time, as distinct from physical time, is essentially
the count of events witnessed by the node. Physical time is somewhat
similar&mdash; seconds count the number of times a physical clock's second hand
ticked, or the number of particles emitted from an atom. 

[^system-time]: If anyone has contact information for the author, or is able to
grant legitimate free access to the paper, please [contact
me](https://twitter.com/andywinterman).&nbsp;

[cassandra]: https://wiki.apache.org/cassandra/FAQ#clocktie
[dominic]: https://github.com/dominictarr
[dominic-resolve]: https://github.com/dominictarr/scuttlebutt/blob/master/util.js#L29-L36
[scuttlebutt]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[npm.im/scuttlebutt]: http://npmjs.org/scuttlebutt
[simple-scuttle]: https://github.com/awinterman/simple-scuttle 
[conflict-resolution]: ./conflict.html
[vector clock]: http://research.microsoft.com/en-us/um/people/lamport/pubs/time-clocks.pdf
[system time]: http://ieeexplore.ieee.org/xpl/login.jsp?tp=&arnumber=1091674&url=http%3A%2F%2Fieeexplore.ieee.org%2Fxpls%2Fabs_all.jsp%3Farnumber%3D1091674
[node streams]: http://nodejs.org/api/stream.html
[browserify]: http://browserify.org/
[partial-ordering]: http://en.wikipedia.org/wiki/Partially_ordered_set

