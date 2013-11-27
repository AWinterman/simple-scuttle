# [Scuttlebutt Gossip Protocols][scuttlebutt] # 

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
implementation][simple-scuttle] of the scuttlebutt gossip protocol. To keep
things simple, each node simply keeps track of how many time it has been
clicked, so the more you click it, the longer it gets.

Every 30 miliseconds, a randomly chosen node gossips with the nodes connected
to it by an edge. 

## Conflicts ##

This particular example is set up to avoid conflicts between updates, but in
general conflicts can arrise. 

In the scuttlebutt protocol, each peer maintains a vector clock, with the
logical time of each other peer's last update. When one peer `A` has updates to
share with peer `B`, it shares the key, the value, and the current version number of
the update. However, if both `A` and `B` have updates at the same version for a
key `k`, it is not always clear what should be done. How can this arrise?  Well
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

But what happens if A and B both recieve updates before they have a chance to
gossip?

```
A: [3, 2] -> A[k] = alpha
B: [2, 3] -> B[k] = beta
```

Now they gossip:

```
A: [3, 3] -> (A: [3, 2] -> A[k] = alpha) + ( B: [3, 2] -> B[k] = beta)
B: [3, 3] -> (A: [3, 2] -> A[k] = alpha) + ( B: [3, 2] -> B[k] = beta)
```

Where `+` means resolve. But what is the value of this sum?

```
(A: [3, 2] -> A[k] = alpha) + ( B: [3, 2] -> B[k] = beta)
```

This turns out to be a frustrating question. For example [cassandra][], which
uses scuttlebutt to propagate updates across its network, gives primacy to
`DELETE` operations, which is to say if `alpha` said `DELETE k`, then no matter
what the value of `beta`, `k` would be deleted from the store. If both `alpha`
and `beta` are updates, Cassandra picks the update which **is lexically
larger**!  Cassandra's implementation is unsatisfying, but it has the virtue of
being reproducible, reversible, and easy to reason about.

There aren't really many better options. For example, in the [model
sublcass](https://github.com/dominictarr/scuttlebutt/blob/master/model.js) of
[npm.im/scuttlebutt][], @dominictarr uses [lexically compares][dominic-resolve]
node names to resolve conflicts between nodes, essentially attributing
credibility based on the position in the alphabet.

Like the [npm.im/scuttlebutt][] base class, [simple-scuttle][] leaves the
definition of  the resolution function to the user, [a parameter called `should_apply`](https://github.com/AWinterman/simple-scuttle#constructor). 


[cassandra]: https://wiki.apache.org/cassandra/FAQ#clocktie
[dominic-resolve]: https://github.com/dominictarr/scuttlebutt/blob/master/util.js#L29-L36
[scuttlebutt]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[npm.im/scuttlebutt]: http://npmjs.org/scuttlebutt
[simple-scuttle]: https://github.com/awinterman/simple-scuttle 
[conflict-resolution]: ./conflict.html
