
<article>
#  Scuttlebutt # 

*A [Scuttlebutt Gossip Protocols][scuttlebutt] with [d3 force directed layouts](https://github.com/mbostock/d3/wiki/Force-Layout) and node.js*

Clicking on a star causes it to change its own
state-- the length of each point of the star represents how many times it has
been clicked. Each star propagates its state across the network via a
[JavaScript implementation][simple-scuttle] of the [scuttlebutt gossip
protocol][scuttlebutt]. 

Every 30 milliseconds, a randomly chosen node gossips with the nodes connected
to it by an edge. All edges are bidirectional.

## History and Compaction [&sect;](#history-and-compaction) ##

In [the paper][scuttlebutt], where nodes need not abide by practical limitations such as
browser performance, the authors assume that each node can hold on to a
complete history of all the updates that have ever been applied to it. 
Updates are simply snapshots of a piece of the state, so it should be 
safe to throw out old updates once the node receives a new one for the same part of
state. [Simple-scuttle][simple-scuttle] allows the user to bound the number of
updates to hold on to. Once the bound is reached, each
time a new update is written to the history, an old on is thrown out. 

There is a hook whereby the client can implement her own compaction of history.
The scuttlebutt instance has a `.history` attribute which emits `update` events whenever
a new update is applied, and `compaction` events whenever writing the new
update will cause it to throw out an old one.

## Conflicts [&sect;](#conflicts)##

This particular example is set up to avoid conflicts between updates, but in
general conflicts can arise. 

In the scuttlebutt protocol, each peer maintains a vector clock, with the
logical time of each other peer's last update. When one peer `A` has updates to
share with peer `B`, it shares the key, the value, and the current version number of
the update. However, if both `A` and `B` have updates at the same version for a
key `k`, it is not always clear what should be done. How can this arise?  Well
see below:

Peers A, B exchange updates.

In the beginning, they each maintain a vector clock that looks like this:

```
A : [1, 1] -> A[k] = null
B : [1, 1] -> B[k] = null
```

Now A receives a local update, so it updates its own entry in its clock.

```
A : [2, 1] -> A[k] = a
B : [1, 1] -> B[k] = null
```

When A gossips with B, they simply compare version numbers.

```
A : [2, 1] -> A[k] = a
B : [2, 1] -> A[k] = a
```

Now B receives an update:

```
A: [2, 1] -> A[k] = a
B: [2, 2] -> B[k] = b
```

And gossips with A:

```
A: [2, 2] -> A[k] = b
B: [2, 2] -> B[k] = b
```

But what happens if A and B both receive updates before they have a chance to
gossip?

```
A: [3, 2] -> A[k] = alpha
B: [2, 3] -> B[k] = beta
```

Now they gossip:

```
A: [3, 3] -> (A: [3, 2] -> A[k] = alpha) + (B: [3, 2] -> B[k] = beta)
B: [3, 3] -> (A: [3, 2] -> A[k] = alpha) + (B: [3, 2] -> B[k] = beta)
```

Where `+` means resolve. But what is the value of this sum?

```
(A: [3, 2] -> A[k] = alpha) + ( B: [3, 2] -> B[k] = beta)
```

This turns out to be a frustrating question. For example [cassandra][], which
uses scuttlebutt to propagate updates across its network, gives primacy to
`DELETE` operations, which is to say if `alpha` said `DELETE k`, then no matter
what the value of `beta`, `k` is deleted from the node's store. If both `alpha`
and `beta` are updates, Cassandra saves the update which **is lexically
larger**!  Cassandra's implementation is unsatisfying, but it has the virtue of
being reproducible, reversible, and easy to reason about.

There aren't really many better options. For example, in the [model
subclass](https://github.com/dominictarr/scuttlebutt/blob/master/model.js) of
[npm.im/scuttlebutt][], [\@dominictarr][dominic] [lexically compares][dominic-resolve]
node names to resolve conflicts between nodes, essentially attributing
credibility based on alphabetically sorting node names.

Like the [npm.im/scuttlebutt][] base class, [simple-scuttle][] leaves the
definition of  the resolution function to the user, via a parameter to the
constructor function called
[`should_apply`](https://github.com/AWinterman/simple-scuttle#constructor). 

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
</article>

[cassandra]: https://wiki.apache.org/cassandra/FAQ#clocktie
[dominic]: https://github.com/dominictarr
[dominic-resolve]: https://github.com/dominictarr/scuttlebutt/blob/master/util.js#L29-L36
[scuttlebutt]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[npm.im/scuttlebutt]: http://npmjs.org/scuttlebutt
[simple-scuttle]: https://github.com/awinterman/simple-scuttle 
[conflict-resolution]: ./conflict.html

