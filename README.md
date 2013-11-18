#Simple-Scuttle#

Replicate state across a network with the scuttlebutt protocol.

**SIMPLE-SCUTTLE IS STILL IN ALPHA**

See [the To Do section](#todo) for outstanding tasks.

I recommend you at least skim the [paper][] which describes the
protocol before continuing too much further.

## Overview ##

Simple-Scuttle exports a class - soit `Gossip` - whose instances are
transform streams in objectMode. This stream maintains several data structures
with which it manages state (see [`Gossip.state`](#gossipstate)) and the
propagation of state changes (implemented with [`Gossip.digest`](#gossipdigest) and
[`Gossip.history`](#gossiphistory)).

Rather than implementing several parallel streams, `Gossip` instances choose
logical branches based on the semantics of the objects written to them--  the
shape of inputs to the stream determine the resulting action.  These are
documented in the [Expected Objects](#expected-objects) section.

# API #

## Constructor ##

```js
Gossip(
    String id
  , Integer mtu | false
  , Integer max_history | false
  , Function sort(Update A, Update B) -> Bool | false
) -> gossip
```
 
- `id`: The unique identifier for each `Gossip` instance.  
- `mtu`: How many messages the network can handle at once-- this is used to set
[opts.highWaterMark](http://nodejs.org/api/stream.html#stream_new_stream_readable_options). Defaults to 10 if falsey.
- `max_history`: How many deltas to store before we begin to forget old ones. Such concerns are absent from the paper, but they seem important to me. Defaults to 10 if falsey.
- `sort`: A function which describes how to resolve
  versioning ties between when two deltas disagree on a key-value pair. It's
  return value indicates whether its first argument should take primacy.
  Defaults to sort by version and breaking ties with lexical ordering of IDs.

## Expected Objects ##

Gossip instances expect objects written to them (with `gossip.write`) to either be `digest`s or `delta`s.

Digests look like: 

```js
var digest = {
    digest: true
  , source_id: source_id
  , version: last_seen_version_for_source_id
}

if(no_more_digests) {
  digest.done = true
}
```

The assumption is that a digest object is sent from one node  to another, and
specifies what information the receiver should send back to the sender (all
deltas the receiver has seen for the specified source node, with version
number greater than `digest.version`). Upon receiving a digest, the
receiver queues all such deltas into its Readable buffer.

If `!!digest.done` is true, then the receiver will also send back delta on any
peers it knows about that the sender did not mention since the last time an
object  satisfying `obj.done && obj.digest` was written to the stream. This
permits the number of keys in the state to dynamically grow over time. Note
that once a new key is added, there is currently no way to delete it appart
from calling `delete Gossip.state[key]` at every node, and then handling
`digest` objects asking for `key` appropriately. This is unsafe-- I'd
avoid designing a system in which the number of keys can grow without bound.
Implementing a safe delete method remains a [To Do](#todo)

The other kind of object, the delta, is an object that appears like the
following:

```js

var delta = {
    key: any_obj_which_can_be_a_key
  , value: some_serializable_value 
  , source_id: source_id
  , version: version_number_for_this_update
}
```

This says: "source `source_id` thought `key` mapped to `value` at `version`."
There is still some ambiguity here about when to apply this update to the local
state, and indeed, [npm.im/scuttlebutt][] leaves this specification to the
client. At current, the update is always applied, so long as `version` is
greater than the current version for the key.

## Methods ##

`Gossip` instances are [Transform
Streams](http://nodejs.org/api/stream.html#stream_class_stream_transform_1), so
they implement all of the methods and events as described in the node core
documentation.

###`Gossip.set(key, value) -> null`###

This method applies a local delta, simply setting the given key to the given
value in the local instance, giving it the appropriate `version` number and
`source_id`.

###`Gossip.get(key) -> {version: <version>, value: <obj>} `###

A method  which provides convenient lookup for arbitrary keys. If
`Gossip.state` has no entry for a given key, this method returns 
`{version:  -Infinity, value: null}`.

###`Gossip.gossip() -> undefined`###

Causes `Gossip` to queue a randomly sorted set of `digest` objects into its
Readable buffer. If another `Gossip` stream reads these, it will respond
with a series of `delta` objects. See [Expected Object](#expected-objects) for
information on the shape of the objects.

## Attributes ##

###`Gossip.state`###
As specified in the [paper][], state is a
key-value map (modeled as a native javascript object), available in the
`.state` attribute of a `Gossip` instance. Each key maps to a value and a
version number, so `state[key]` -> `{version: version, value: value}`

###`Gossip.version`###

The highest version number the `Gossip` instance has seen. This is proportional
to the number of updates made to this instance.

###`Gossip.history`###

An object for keeping track of updates, and replaying updates from a given peer
on demand. Updates are transmitted individually via the `Gossip`'s streaming
methods.

####`Gossip.history.write(key, value, source_id, version)`####

Write a new delta to the history. The delta is recorded into
`Gossip.history.memory`, an array of deltas, which is then sorted via `sort`
argument to the `Gossip` constructor. Next An `update` event is emitted with
the delta as its argument, which allows the client to take action prior to
pruning the `memory` array to `max_history`'s length.

####`Gossip.history.news(id, version)` -> [Array Deltas](#%CE%B4)####

Returns an array of `delta`s which came from a source with unique identifier
matching `id`, and which occurred after `version`.

###`Gossip.digest`###

A [vector clock][vector-clocks-hard] which keeps track of the maximum version
number this `Gossip` instance has seen from each of its peers. `Gossip.digest`
also provides a for constructing a `digest` objects as specified in [Expected
Objects](#expected-objects)

For a paper defining vector clocks, see [here][vector-clock-paper]


####`Gossip.digest.clock`####

The vector clock itself-- a map from `source_ids` to version numbers, keeping
track of the last update this `Gossip` instance has seen from any of its peers.

####`Gossip.digest.get(id)` -> `Integer version'####

Returns the version number for the specified `id`, or `-Infinity` if it cannot be
found.

####`Gossip.digest.set(source, version)`####

Sets the specified `source` to the specified `version` number in the
`Gossip.digest.clock` object.

####`Gossip.digest.create()`####

Return a randomly ordered array of `digest` stream objects for each `source` in th clock. See [Expected Objects][#expected-objects].

# Relation to [npm.im/scuttlebutt][] #

This was inspired by [Dominic Tarr's scuttlebut
module][npm.im/scuttlebutt], which, though totally awesome,
I found a little hard to parse. So in order to understand [the
paper][paper] , I wrote my
own module to implement the protocol. As such this module bears great fidelity
to the paper-- many decision that [npm.im/scuttlebutt][] leave to the client
are in fact specified in the paper that describes the protocol. Others, such as
resolution of delta conflicts, are left to the user through to specify through
function argument rather than subclassing. I intended to replicate terminology
from the paper faithfully, subject of course to the restrictions imposed by the
format and language (javascript rather than maths).

# TODO: #
- Make sure Gossip.version is updated if need be by applicaiton of external deltas.
- A parent constructor to ensure uniquenes of id, uniformity of mtu, etc.
- Investigate whether history's memory attribute should be an array that is
`.sort(fn)`-ed, or a custom implementation, such as [this
one][cross-filter-sort].
- Find a way to do safe deletes.
- Make sure updates are applied only when they should be.

[npm.im/scuttlebutt]: https://npmjs.org/package/scuttlebutt
[paper]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[vector-clocks-hard]: http://basho.com/why-vector-clocks-are-hard/
[cross-filter-sort]: https://github.com/square/crossfilter/blob/master/src/quicksort.js
[vector-clock-paper]: http://research.microsoft.com/en-us/um/people/lamport/pubs/time-clocks.pdf

