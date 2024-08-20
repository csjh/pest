# pest de/serializer

## Overview

Pest is a fast de/serialization format meant for the web. It has a very small footprint (4.2kb uncompressed/1.7kb brotli) for both encoding and decoding, and is designed to be easy to use and understand. It works seamlessly with modern web technologies, requiring only a vite plugin to use.

Depending on the type and environment, serialization can be up to 3x faster than JSON, and deserialization can be up to 2x faster. It also takes significantly less space than JSON, depending on the shape of the data (almost 3x on uncompresssed payloads in one example).

Pest also makes sure your data is always in the shape you expect, and is easy to use with TypeScript. It also allows for using only a view over your data, which can be useful for reading large payloads with 0 parsing overhead. To access this functionality, replace `deserialize` with `view` in the examples below.

## Installation

```bash
# npm
npm install pestjs
```
```bash
# bun
bun install pestjs
```

## Usage

Types are defined using imported primitives, combined with the `struct` function.

```typescript
// server.ts
import { serialize, struct, i32, string } from 'pestjs';

const User = struct({
    id: i32,
    name: string
});

app.get('/user', (req, res) => {
    const user = {
        id: 1,
        name: 'Alice'
    };

    const encoded = serialize(user, User);
    res.send(encoded);
});
```

```typescript
// client.ts
import { deserialize, struct, i32, string } from 'pestjs';

const User = struct({
    id: i32,
    name: string
});

const response = await fetch('/user');

const user = deserialize(await response.arrayBuffer(), User);
//      ^? User, a.k.a. { id: number, name: string }
```

The available primitives are `i8`, `i16`, `i32`, `i64`, `u8`, `u16`, `u32`, `u64`, `f32`, `f64`, `boolean`, `date`, `string`, and `regexp`. Types can also be marked as nullable by wrapping them in the `nullable` import, or arrays by wrapping in the `array` import, like so:

```typescript
import { struct, u32, string, nullable, array } from 'pestjs';

const UserWithFriends = struct({
    id: u32,
    name: string,
    // email is optional
    email: nullable(string),
    // elements of the array of friends can be null
    friends: array(nullable(User)),
    // either this property is missing altogether, or its elements can be null
    missingFriends: nullable(array(nullable(User)))
});
```
