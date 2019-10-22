# pipeline-pipe

Creates a parallel transform from async function.

This is a wrapped version of [parallel-transform](https://github.com/mafintosh/parallel-transform) with:

* Fix mafintosh/parallel-transform#4 ; works well in `require('stream').pipeline`
* Accepts a promise as returned value, instead of calling `callback()`
* TypeScript Definition (with pure TypeScript implementation)
* Some utility functions

Example usage:
 
```js
// Example to scrape HTML and store titles of them in DB:

const {pipeline, Readable} = require('stream');
const pipe = require('pipeline-pipe');

pipeline(
    Readable.from([1, 2, 3]),
    pipe(postId => getPost(postId), 16),  // Request HTML asynchronously in 16 parallel
    pipe(json => {                        // Synchronous transformation as Array.prototype.map
      const dom = parseHTML(json.postBody);
      return dom.document.title;
    }),
    pipe(title => {                       // Synchronous transformation as Array.prototype.filter
      return title.includes('important') ? title : null
    }),  
    pipe(title => storeInDB(title), 4),   // Asynchronous in 4 parallel
    (err) => console.info('All done!')
);
```

Types of `pipe()` is:

```typescript
import { Transform, TransformOptions } from 'stream';

export default function pipe(
    fn: (data: any) => Promise<any> | any,
    opts?:
        | number
        | TransformOptions & { maxParallel?: number, ordered?: boolean }
): Transform;
 ```

| Option property | Default value | description |
| --- | --- | --- |
| **`maxParallel`**  | `10` | Number of maximum parallel executions. |
| **`ordered`**      | `true` | Preserving order of streaming chunks. |

If number is passed as `opts`, it'll be detected as `maxParallel`.

## Utility functions

### pipeline(stream, stream, ...)
 
Promisified version of `require('stream').pipeline` of Node Stream. It is equivalent to:

```js
const {promisify} = require('util');
const {pipeline: _pipeline} = require('stream');
const pipeline = promisify(_pipeline);
```

Example:

```js
const {pipeline, pipe} = require('pipeline-pipe');

await pipeline(
    readable,
    pipe(chunk => chunk.replace('a', 'z')),
    pipe(chunk => storeInDB(chunk)),
);
console.log('Done!');
``` 

### fromIter(iter)

A copy of [`Readable.from`](https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options) introduced in Node v12.3.

```js
const {fromIter} = require('pipeline-pipe');

const readable = fromIter([2, 3, 4]);
```

is equivalent to

```js
// Node v12.3+
const {Readable} = require('stream');

const readable = Readable.from([2, 3, 4]);
```

### split()

Creates a `Transform` to split incoming `Array` chunk into pieces to subsequent streams.

```js
const {pipeline} = require('stream');
const {split} = require('pipeline-pipe');

pipeline(
    Readable.from([1, 2, 3]),
    pipe(page => getPostsByPage(page)),
    pipe(json => json.posts),           // Returns an array of posts
    pipe(split()),                      // Splits the array into each posts
    pipe(post => post.title),           // Now the argument is a post
    pipe(title => storeInDB(title)),
    (err) => console.info('All done!')
);
```

## License

MIT
