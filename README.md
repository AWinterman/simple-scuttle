#Simple-Scuttle#

Replicate state across a network with the scuttlebutt protocol.

[![Build
Status](https://travis-ci.org/AWinterman/simple-scuttle.png?branch=master)](https://travis-ci.org/AWinterman/simple-scuttle)

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
Gossip(String id, Object config) -> gossip
```
 
- `id`: The unique identifier for each `Gossip` instance.  
- `config`: an Object which must have the following properties:
  - `config.mtu`: Stands for Maximum Transmission Unit. Determines how many
    messages the network can handle at once-- this is used to set
    [opts.highWaterMark](http://nodejs.org/api/stream.html#stream_new_stream_readable_options). 
  - `config.max_history`: How many updates to store before we begin to forget
    old ones. Such concerns are absent from the paper, but they seem important
    to me. Defaults to 10 if falsey.
  - `config.resolve` `(gossip, update)` -> `Boolean`: A function which
    determines whether or not a given update should be applied.
  - `config.sort`: A function which describes how to order updates. Has the
    same signature as javascripts
    [Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort),
    and will be called by Array.sort under the hood. This function is used to
    order updates when another Gossip instance requests updates more recent
    than a given version number.

# Admonition #

The `config.resolve` function is one of the most consequential decisions you will
make when constructing your distributed system. Please make an informed
decision. In 2.0.0 it will no longer take a default argument-- investigate:
http://aphyr.com/posts/299-the-trouble-with-timestamps,
http://aphyr.com/posts/286-call-me-maybe-final-thoughts, or
http://pagesperso-systeme.lip6.fr/Marc.Shapiro/papers/RR-6956.pdf. You will
encounter concurrent updates across your system, and how you manage them will
determine the reliability and persistence of your data.

## Expected Objects ##

Gossip instances expect objects written to them (with `gossip.write`) to either
be `digest`s or `updates`s.

####digests####

```js
var digest

if(more_digest) {
   digest = {
        digest: true
      , source_id: source_id
      , version: last_seen_version_for_source_id
   }
 } else {
  digest = { 
      digest: true 
    , done: true
  }
}
```

The assumption is that a digest object is sent from one node  to another, and
specifies what information the receiver should send back to the sender (all
updates the receiver has seen for the specified source node, with version
number greater than `digest.version`). Upon receiving a digest, the
receiver queues all such updates into its Readable buffer.

If `!!digest.done` is true, then the receiver will also send back updates on any
peers it knows about that have version number greater than the version in the
digest. They will be ordered according to `config.sort`, (updated each time
history is updated).

####updates####
The other kind of object, the update, is an object that appears like the
following:

```js

var update = {
    key: 'age'
  , value: 100
  , source_id: '#A'
  , version: 10
}
```

This says: "source `update.source_id` thought `update.key` mapped to
`update.value` at version `update.version`." The `config.resolve` is a function
that takes an update and the gossip instance and determines whether the gossip
instance should include the update.

## Methods ##

`Gossip` instances are [Transform
Streams](http://nodejs.org/api/stream.html#stream_class_stream_transform_1), so
they implement all of the methods and events as described in the node core
documentation. In addition, there are a few methods specific to this purpose:

###`Gossip.set(key, value) -> Boolean`###

This method applies a local update, simply setting the given key to the given
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
with a series of `update` objects. See [Expected Object](#expected-objects) for
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

An object for keeping track of updates, and replaying updates from a given peer
on demand. `update` objects are transmitted individually via the `Gossip`'s
streaming methods. 

#### Events ####
`Gossip.history` is an event emitter, which emits two events:

- `"update"`: Any time an update is applied, the `"update"` event is emitted,
with the [`update`](#update) to be applied.

- `"compaction"`: If the number of updates recorded in the history exceeds the `max_history` parameter, the `"compaction"` event is emitted prior to removing old updates from the history. This way the client can implement more dramatic compaction, making their own tradeoffs between performance, replayability, and speed.

####`Gossip.history.write(key, value, source_id, version)`####

Write a new update to the history. The update is recorded into
`Gossip.history.memory`, an array of updates, which is then sorted via `sort`
argument to the `Gossip` constructor. Next `Gossip.history` emits an `"update"`
event is emitted with the update as its argument. This event is emitted to allow
the client to take action prior to pruning the `memory` array to
`max_history`'s length.

####`Gossip.history.news(id, version)` -> [`Array updates`](#updates)####

Returns an array of `update`s which came from a source with unique identifier
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

