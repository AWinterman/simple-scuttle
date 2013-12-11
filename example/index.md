% Scuttlebutt
% **[Scuttlebutt Gossip Protocols][scuttlebutt]**
% with [d3 force directed layouts](https://github.com/mbostock/d3/wiki/Force-Layout) and node.js

For best viewing, use chrome, opera or safari.

## A Basic Example ##

Clicking on a star causes it to change its own
state-- the length of each point of the star represents how many times it has
been clicked. Each star propagates its state across the network via a
[JavaScript implementation][simple-scuttle] of the [scuttlebutt gossip
protocol][scuttlebutt]. 

Every 30 milliseconds, a randomly chosen node gossips with the nodes connected
to it by an edge. All edges are bidirectional.

## The Protocol ##

In *Efﬁcient Reconciliation and Flow Control
for Anti-Entropy Protocols*, van Rennesse et al. model state as a key value
store. So each node maintains a hash from keys to values and version numbers.
Whenever they apply a new update, locally they give it a larger version number
than any seen before.

Each node also maintains a history of the updates it has seen, both locally and
from other nodes. When one node gossips with another, they first exchange a
digest-- this is a list of tuples of every peer they've seen an update from,
and the version number for that update. Upon receiving the digest each node
selects from it's history updates from the specified peers newer than the
version number in the digest. It orders these updates with lowest version
number first, and then sends them off until it has used up it's allotted
bandwidth. It then waits until another session of gossip to write any
additional information.

Scuttlebutt is cpu and network efficient, and **eventually** consistent.

## History and Compaction [&sect;](#history-and-compaction) ##
In [the paper][scuttlebutt], where nodes need not abide by practical
limitations such as browser performance, the authors assume that each node can
hold on to a complete history of all the updates that have ever been applied to
it.  Updates are simply snapshots of a piece of the state, so it should be safe
to throw out old updates once the node receives a new one for the same part of
state. [Simple-scuttle][simple-scuttle] allows the user to bound the number of
updates to hold on to. Once the bound is reached, each time a new update is
written to the history, an old one is thrown out. 

There is a hook whereby the client can implement her own compaction of history.
The scuttlebutt instance has a `.history` attribute which emits `update` events
whenever a new update is applied, and `compaction` events whenever writing the
new update will cause it to throw out an old one.

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
al.][system time], but the paper remains behind a tall paywall[^1], so I haven't
been able to read it.

[^1]: If anyone has contact information for the author, or is able to grant legitimate
free access to the paper, please [contact
me](https://twitter.com/andywinterman)

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

[cassandra]: https://wiki.apache.org/cassandra/FAQ#clocktie
[dominic]: https://github.com/dominictarr
[dominic-resolve]: https://github.com/dominictarr/scuttlebutt/blob/master/util.js#L29-L36
[scuttlebutt]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[npm.im/scuttlebutt]: http://npmjs.org/scuttlebutt
[simple-scuttle]: https://github.com/awinterman/simple-scuttle 
[conflict-resolution]: ./conflict.html
[vector clock]: http://research.microsoft.com/en-us/um/people/lamport/pubs/time-clocks.pdf
[system time]: http://ieeexplore.ieee.org/xpl/login.jsp?tp=&arnumber=1091674&url=http%3A%2F%2Fieeexplore.ieee.org%2Fxpls%2Fabs_all.jsp%3Farnumber%3D1091674

