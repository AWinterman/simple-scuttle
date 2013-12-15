% Scuttlebutt
% **[A Scuttlebutt Demo][scuttlebutt]**
% with [d3 force directed layouts](https://github.com/mbostock/d3/wiki/Force-Layout) and node.js

<aside>For best viewing, use chrome, opera or safari.</aside>

## What is it? [&sect;](#history-and-compaction)##

The [Scuttlebutt Gossip protocol][scuttlebutt] is a method for propagating
state, which we take to be a mapping from keys to values, across a network. In
general, the network could be any distributed system-- computers distributed in
space, processes in a single computer, or as is the case here, svg polygons
(![inline-ten](./assets/ten.svg)) in the DOM.

The examples here rely on a [Javascript implementation][simple-scuttle], called
*Simple-Scuttle*, of the gossip protocol. *Simple-Scuttle* defines a prototype
which inherits from node.js streams[^stream]. The brightly colored force directed graphs are visualizations of the protocol in action.

## Visualization Details ##

The accompanying visualization of the protocol uses polygons, 
![pair](./assets/pair.svg), ![ten](./assets/ten.svg), or ![twenty](./assets/twenty.svg),
to for nodes in the network. The network propagates the number of times each
node has been clicked. The mapping from node id to click count is
the state in this instance.

Each polygon keeps track of the number of times *it* has been clicked, but must
learn about the number of times *every other* polygon has been clicked through
gossip. The polygon has a representation as an object in the DOM with a
*Simple-Scuttle* class instance attribute, which has been set through the DOM's
javascript api.

**Click on a node to update its state!**

The state at each node is represented by the polygon's shape- there is one
point per node in the network, so ![pair](./assets/pair.svg) describes a network
with two nodes in it, and ![ten](./assets/ten.svg) a network with ten. When the
user clicks on a node, its corresponding point distends, 

####so after a few clicks, ![full](./assets/pair.svg) might turn into
![full](./assets/distended-pair.svg).

Edges between ![ten](./assets/ten.svg) indicate the *Simple-Scuttle* attatched to
the dom element can share information about their state with one another. There
is no other way one node can learn the state of another.

## The Protocol [&sect;](#history-and-compaction) ##

*I recommend reading the [paper][scuttlebutt] for the full story, including a
discussion of it's performance characteristics.*

There are essentially three data structures to Scuttlebutt-- some sort of store
for the state, a [vector clock](http://npm.im/vector-clock-class) which helps
determine what updates to ask for, and a structure for replaying, compacting,
and holding on to
[history](https://github.com/AWinterman/simple-scuttle/blob/master/lib/history.js).
Additionally, there is an ettiquette for how gossip should happen.

The vector clock ensures that updates received by a node can be at least
partially ordered by a `precedes` relation, which allows quick exchange about
the most recent information you have seen. The history structure ensures
that you can tell your peer the news when you have heard something they have
not.

Gossip between two peers begins by exchanging vector clocks-- each peer sends
the other a list of highest version numbered update they've seen from everybody
in the network (including themselves). 

Suppose ![pair](./assets/pair.svg) sends its vector clock to
![red-pair](./assets/red-pair.svg). In that list there's the pair
(![red-pair](./assets/red-pair.svg), 10). ![red-pair](./assets/red-pair.svg) responds with
all the updates it has seen locally which are greater than 10, ordering them in
chronological order. If there are more updates than fit in bandwidth, then are
simply omitted until the next round of communication, when the two nodes will
begin where they left off.

Scuttlebutt is cpu and network efficient, and **eventually** consistent.

## Versioning [&sect;](#conflicts)##

How do peers decided when to apply updates? How do they know an update occuring
elsewhere happened before their own update? Scuttlebutt applies a partial
ordering on updates by means of a [a vector clock][vector clock], described in
full in [Lamport 1978][vector clock]. It works, more or less as follows:

Suppose peers `A`, `B` must exhange updates. They will each maintain a vector
of logical times for each peer. Logical time refers to the number of events the
peer has seen.  This vector is called the `clock`, and is updated  according to
the following two rules (IR1 and IR2 from [the paper][vector clock]):

1. Each peer must update it's own entry in the list between any two updates
2. If A sends an update to B, it must also send along the logical time, `t`, at which the update occured.
   Upon receive the update, B updates A's entry in its own clock to `t`, and then ensures its own
   entry in its clock is greater than `t`.


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

When A gossips with B, it sends an update along with the version number at
which the update occured, in this case `1`. B applies the
update since it has a version number since `1` is higher than the most recent
time it has seen. It also increments its own version number to be one higher
than A's. Note that no event is marked with time 2.

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

## Conflict ##

What happens if B encounters another local update?

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
[Cassandra][], which uses scuttlebutt to propagate updates across its
network, orders updates by their value. It gives primacy to `DELETE`
operations, which is to say if `A` sent `DELETE key` to `B`, then no matter what the
value of concurrent (as far as the vector clock is concerned) updates, `key` is deleted from the `B`'s store. If non-delete updates occur simultaneously, Cassandra saves the update which **is lexically larger**!  

In the
[scuttlebutt/model](https://github.com/dominictarr/scuttlebutt/blob/master/model.js)
of [npm.im/scuttlebutt][], [\@dominictarr][dominic] [lexically
compares][dominic-resolve] node names to resolve conflicts between nodes,
essentially attributing credibility based on alphabetically sorting node
names.

Like the [npm.im/scuttlebutt][] base class, [simple-scuttle][] leaves the
definition of  the resolution function to the user, via a parameter to the
constructor function called
[`should_apply`](https://github.com/AWinterman/simple-scuttle#constructor).
Conceivably, you could implement your own clock synchronization algorithm, and
plug in its results here.

## Relation to [npm.im/scuttlebutt][] and _[van Renesse et al.][scuttlebutt]_ [&sect;](#relation-to-npm.imscuttlebutt-and-van-renesse-et-al.scuttlebutt) ##

My implementation, and consequently this module,  was inspired by [Dominic
Tarr's scuttlebut module][npm.im/scuttlebutt], which, though totally awesome, I
found the source hard to parse, which was problematic for me since it was designed to be subclassed. I also found it difficult to draw parallels between [the paper][scuttlebutt] and this implementation. So I wrote my own.

These two implementations should cover roughly the same ground, presenting two
different APIs and implementations of the same concept.

My goal in writing it was to gain a deeper understanding of the gossip
protocol, as it pertains to concepts such as node.js's buffering streams. As
such this module bears some fidelity to the paper--
I intended to replicate terminology from the paper faithfully, subject of
course to the restrictions imposed by the format and language (javascript
rather than maths), although once I had internalized the concepts this ceased
to be a conscious effort.


[^stream]: [Node Streams][node streams] abstractions built into the node core
library for handling data over time. They present a unix-like api which allows
one to write to sinks, read from sources, and pipe sources to sinks. They are
available in the browser via [browserify][].&nbsp;

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

