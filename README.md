#Simple-Scuttle#

Replicate state across a network with the scuttlebutt protocol.

[![Build
Status](https://travis-ci.org/AWinterman/simple-scuttle.png?branch=master)](https://travis-ci.org/AWinterman/simple-scuttle)

See [the To Do section](#todo) for outstanding tasks.

Check out the [demo](http://awinterman.github.io/simple-scuttle/) for some
higher level discussions of this implementation.

I recommend you at least skim the [paper][] which describes the
protocol before continuing too much further.

## Overview ##

Simple-Scuttle exports a class - soit `Gossip` - whose instances are transform
streams in objectMode. `Gossip` instances maintain several data structures with
which they manages state (see [`Gossip.state`](#gossipstate)) and the
propagation of state changes (see [`Gossip.history`](#gossiphistory)).

Rather than implementing several parallel streams, `Gossip` instances choose
logical branches based on the semantics of the objects written to them--  the
shape of inputs to the stream determine the resulting action.  These are
documented in the [Expected Objects](#expected-objects) section.

# API #

## Constructor ##

```js
Gossip(
    String id
  , Integer mtu | null
  , Integer max_history | null
  , Function should_apply | null
  , Function sort | null
) -> gossip
```
 
- `id`: The unique identifier for each `Gossip` instance.  
- `mtu`: Stands for Maximum Transmission Unit. Determines how many messages the
network can handle at once-- this is used to set
[opts.highWaterMark](http://nodejs.org/api/stream.html#stream_new_stream_readable_options). 
- `max_history`: How many updates to store before we begin to forget old ones. Such concerns are absent from the paper, but they seem important to me. Defaults to 10 if falsey.
- `should_apply` `(gossip, update)` -> `Boolean`: A function which determines
whether or not a given update should be applied.
- `sort`: A function which describes how to order updates. Has the same
signature as javascripts
[Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort), and will be called by Array.sort under the hood.

# Admonition #

The `should_apply` function is one of the most consequential decisions you will
make when constructing your distributed system. Please make an informed
decision two. In 2.0.0 it will no longer take a default argument-- investigate:
http://aphyr.com/posts/299-the-trouble-with-timestamps,
http://aphyr.com/posts/286-call-me-maybe-final-thoughts, or
http://pagesperso-systeme.lip6.fr/Marc.Shapiro/papers/RR-6956.pdf. You will
encounter concurrent updates across your system, and how you manage them will
determine the reliability and persistence of your data.

## Expected Objects ##

Gossip instances expect objects written to them (with `gossip.write`) to either be `digest`s or `delta`s. Note that `delta`s are also referred to as `updates`.

####digests####

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

####deltas####
The other kind of object, the delta, is an object that appears like the
following:

```js

var delta = {
    key: 'age'
  , value: 100
  , source_id: '#A'
  , version: 10
}
```

This says: "source `source_id` thought `key` mapped to `value` at `version`."
The `should_apply` argument allows the user to specify whether or not this
update should be applied.

## Methods ##

`Gossip` instances are [Transform
Streams](http://nodejs.org/api/stream.html#stream_class_stream_transform_1), so
they implement all of the methods and events as described in the node core
documentation. In addition, there are a few methods specific to this purpose:

###`Gossip.set(key, value) -> Boolean`###

This method applies a local delta, simply setting the given key to the given
value in the local instance, and tacking on the appropriate `version` number and
`source_id`. It's return value indicates whether the underlying stream has hit
its high water mark. If the return value is `false`, do not write until
`Gossip` has emitted a `"drain"` event. 

###`Gossip.get(key) -> {version: <version>, value: <obj>} `###

A method  which provides convenient lookup for arbitrary keys. If
`Gossip.state` has no entry for a given key, this method returns 
`{version:  -Infinity, value: null}`. Otherwise it returns `{version: version,
  value: value}`

###`Gossip.gossip() -> null`###

Causes `Gossip` to queue a randomly sorted set of `digest` objects into its
Readable buffer. If another `Gossip` stream reads these, it will respond
with a series of `delta` objects. See [Expected Object](#expected-objects) for
information on the shape of the objects. 

`.gossip` will not write to the underlying stream past the highWaterMark, i.e.
after
[gossip.push](http://nodejs.org/api/stream.html#stream_readable_push_chunk_encoding)
returns false. 

## Attributes ##

###`Gossip.state`###
As specified in the [paper][], state is a
key-value map (modeled as a native javascript object), available in the
`.state` attribute of a `Gossip` instance. Each key maps to a value and a
version number, so `state[key]` -> `{version: version, value: value}`

###`Gossip.version`###

The highest version number the `Gossip` instance has seen (both locally and
from other instances)

###`Gossip.history`###

An object for keeping track of deltas, and replaying deltas from a given peer
on demand. `delta` objects are transmitted individually via the `Gossip`'s
streaming methods. 

#### Events ####
`Gossip.history` is an event emitter, which emits two events:

- `"update"`: Any time an update is applied, the `"update"` event is emitted,
with the [`update`](#delta) to be applied.

- `"compaction"`: If the number of deltas recorded in the history exceeds the `max_history` parameter, the `"compaction"` event is emitted prior to removing old deltas from the history. This way the client can implement more dramatic compaction, making their own tradeoffs between performance, replayability, and speed.

####`Gossip.history.write(key, value, source_id, version)`####

Write a new delta to the history. The delta is recorded into
`Gossip.history.memory`, an array of deltas, which is then sorted via `sort`
argument to the `Gossip` constructor. Next `Gossip.history` emits an `"update"`
event is emitted with the delta as its argument. This event is emitted to allow
the client to take action prior to pruning the `memory` array to
`max_history`'s length.

####`Gossip.history.news(id, version)` -> [`Array Deltas`](#deltas)####

Returns an array of `delta`s which came from a source with unique identifier
matching `id`, and which occurred after `version`.

# TODO: #

- Investigate whether history's memory attribute should be an array that is
`.sort(fn)`-ed, or a custom implementation, such as [this
one][cross-filter-sort].
- Find a way to safely delete keys from the state.

[npm.im/scuttlebutt]: https://npmjs.org/package/scuttlebutt
[paper]: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf
[vector-clocks-hard]: http://basho.com/why-vector-clocks-are-hard/
[cross-filter-sort]: https://github.com/square/crossfilter/blob/master/src/quicksort.js

