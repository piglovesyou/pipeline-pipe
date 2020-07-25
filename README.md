# pipeline-pipe [![npm version](https://badge.fury.io/js/pipeline-pipe.svg)](https://badge.fury.io/js/pipeline-pipe) [![Build Status](https://travis-ci.org/piglovesyou/pipeline-pipe.svg?branch=master)](https://travis-ci.org/piglovesyou/pipeline-pipe)

This turns an async function into a parallel transform for [require('stream').pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback) in Node. 

## Why

* Accepts async functions
* Fixes [mafintosh/parallel-transform/issues/4](https://github.com/mafintosh/parallel-transform/issues/4) to work with `require('stream').pipeline`
* TypeScript Definition (with the pure TypeScript reimplementation)
* Add tests
* A few utility functions
* [The blog post](https://dev.to/piglovesyou/pipeline-pipe-fun-way-to-get-batching-done-with-node-stream-42cb)

## Install

```bash
npm install pipeline-pipe
```

## pipe(fn, opts)

Example usage:
 
```js
// Example to scrape HTML and store titles of them in DB:

const {pipeline, Readable} = require('stream');
const pipe = require('pipeline-pipe');

pipeline(
    Readable.from([1, 2, 3]),
    
    // Request HTML asynchronously in 16 parallel
    pipe(async postId => {                
      const json = await getPost(postId);
      return json;
    }, 16),
    
    // Synchronous transformation as Array.prototype.map
    pipe(json => parseHTML(json.postBody).document.title),
    
    // Synchronous transformation as Array.prototype.filter
    pipe(title => title.includes('important') ? title : null),
    
    // Asynchronous in 4 parallel
    pipe(async title => {
      const result = await storeInDB(title), 4);
      console.info(result);
    }, 4)
    
    (err) => console.info('All done!')
);
```

Types:

```typescript
import { Transform, TransformOptions } from 'stream';

type ParallelTransformOpitons =
  | number
  | TransformOptions & { maxParallel?: number, ordered?: boolean };

export default function pipe(
    fn: (data: any) => Promise<any> | any,
    opts?: ParallelTransformOptions,
): Transform;
 ```

| Option property | Default value | description |
| --- | --- | --- |
| **`maxParallel`**  | `10` | Number of maximum parallel executions. |
| **`ordered`**      | `true` | Preserving order of streaming chunks. |

A number can be passed to `opts`. `pipe(fn, 20)` is same as `pipe(fn, {maxParallel: 20})`.

## Some utility functions

### pipeline(stream, stream, ...)
 
Just a promisified version of `require('stream').pipeline`. It requires Node v10+. Equivalent to:

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
console.log('All done!');
``` 

### concat(size)

It concatenates sequential data to be specified size of array. This is useful when you post array data at once in the way that [Elasticsearch Bulk API does](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/docs-bulk.html).

Example:
```javascript
const {pipeline} = require('stream');
const {concat, pipe} = require('pipeline-pipe');

pipeline(
    Readable.from([1, 2, 3, 4, 5]),
    concat(2),
    pipe(console.log),  // [ 1, 2 ]
                        // [ 3, 4 ]
                        // [ 5 ]
    (err) => console.info('All done!'),
);
```

### split()

Creates a `Transform` to split incoming `Array` chunk into pieces to subsequent streams.

```js
const {pipeline} = require('stream');
const {split, pipe} = require('pipeline-pipe');

pipeline(
    Readable.from([1, 2, 3]),
    pipe(page => getPostsByPage(page)),
    pipe(json => json.posts),             // Returns an array of posts
    pipe(split()),                        // Splits the array into each posts
    pipe(post => storeInDB(post.title)),  // Now the argument is a post
    (err) => console.info('All done!')
);
```

## License

MIT
