# Merging Vector Clocks #

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
A: [3, 3] -> ( A: [3, 2] -> A[k] = alpha ) + ( B: [3, 2] -> B[k] = beta)
B: [3, 3] -> ( A: [3, 2] -> A[k] = alpha ) + ( B: [3, 2] -> B[k] = beta)
```

But what is the value of 
`( A: [3, 2] -> A[k] = alpha ) + ( B: [3, 2] -> B[k] = beta)`?

Solutions:

https://wiki.apache.org/cassandra/FAQ#clocktie
https://github.com/dominictarr/scuttlebutt/blob/master/util.js#L29-L36
