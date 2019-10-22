# pipeline-pipe

Creates a parallel transform from async function.

This is a wrapped version of [parallel-transform](https://github.com/mafintosh/parallel-transform) with additional features:

* Fix mafintosh/parallel-transform#4 ; works well in `require('stream').pipeline`
* Accepts a promise as returned value, instead of calling `callback()`
* TypeScript Definition (with pure TypeScript implementation)
* Some utility functions

Example:
 
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

Types of `pipe()`:

```typescript
import { Transform, TransformOptions } from 'stream';

export default function pipe(
    fn: (data: any) => Promise<any> | any,
    opts?:
        | number
        | TransformOptions & { maxParallel?: number, ordered?: boolean }
): Transform;
```

| *`maxParallel`*  | 10 by default. Number of parallel executions are never more than that. |
| *`ordered`*  | True by default, preserving order of streaming chunks. False would be faster depending on cases. |

If number is passed as `opts`, it's recognized as `maxParallel`.

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

Same as `Readable.from` introduced in Node v12.3, creating a readable stream from `Iterable`. 

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

Returning a `Transform` to split incoming `Array` chunk into pieces to following stream.

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
