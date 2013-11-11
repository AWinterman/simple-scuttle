# Plan of attack

## Digest Stream
1. A stream that takes a digest and updates its internal state on write.
2. On read, it simply emits its state.

## Exchanger
1. A function that connects two digest streams together.
2. It will handle the exchange of digests between the two.

## StateStream
1. On write, update any intenral keys with the new information.
2. On read, call Exchanger, and then do whatever scuttlebut needs

