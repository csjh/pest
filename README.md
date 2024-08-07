# pest de/serializer

## Overview

Pest is a fast de/serialization format meant for the web. It has a very small footprint (4.2kb uncompressed/1.7kb brotli) for both encoding and decoding, and is designed to be easy to use and understand. It works seamlessly with modern web technologies, requiring only a vite plugin to use.

Depending on the type and environment, serialization can be up to 3x faster than JSON, and deserialization can be up to 2x faster. It also takes significantly less space than JSON, depending on the shape of the data (almost 3x on uncompresssed payloads in one example).

Pest also makes sure your data is always in the shape you expect, and is easy to use with TypeScript. It also allows for using only a view over your data, which can be useful for reading large payloads with 0 parsing overhead. To access this functionality, replace `materialize` with `deserialize` in the examples below.

## Installation

```bash
# npm
npm install pestjs
```
```bash
# bun
bun add pestjs
```

Now simply add the vite plugin to your `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import { pest } from 'pestjs/vite';

export default defineConfig({
    plugins: [pest()]
});
```

For now, there's only a vite plugin, but this isn't a hard limitation - support for different bundler will be added in the future.

## Usage

```typescript
// definitions.pest
interface User {
    id: number;
    name: string;
}
```

```typescript
// server.ts
import { User, serialize } from './definitions.pest';

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
import { User, materialize } from './definitions.pest';

const response = await fetch('/user');

const user = materialize(await response.arrayBuffer(), User);
//      ^? User, a.k.a. { id: number, name: string }
```

Any file ending in `.pest` can be imported from. The file is expected to contain a series of type definitions. Type definitions are very similar to TypeScript interfaces, but no generics are allowed, and the available primitives are `i8`, `i16`, `i32`, `i64`, `u8`, `u16`, `u32`, `u64`, `f32`, `f64`, `bool`, `Date`, `string`, and `RegExp`. Types can also be marked as nullable by appending a `?` to the type name, or arrays by appending a `[]` to the type name, like so:

```typescript
// definitions.pest
interface UserWithFriends {
    id: u32;
    name: string;
    // email is optional
    email: string?;
    // elements of the array of friends can be null
    friends: User?[];
    // either this property is missing altogether, or its elements can be null
    enemies: User?[]?;
}
```

Type aliases are also allowed, which are useful if you want to have a nullable array that isn't in an interface:

```typescript
// definitions.pest
type MissingUserList = UserWithFriends?[];
```

Or, if it isn't a nullable type, you can bypass the typedef and use the `array` utility type for arrays:

```typescript
// main.ts
import { User, serialize } from './definitions.pest';
import { array } from "pestjs";

serialize([{ id: 1, name: 'Alice' }], array(User));
```
