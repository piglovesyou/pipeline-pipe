import { Readable } from 'readable-stream';

// Waiting for readable-stream implementing it. Ref. https://github.com/nodejs/readable-stream/issues/411
// Copy with minor change of https://github.com/nodejs/node/blob/f8f6a21580544146d5a8527333e1130b336dc094/lib/_stream_readable.js#L1211-L1248
const fromIter: typeof Readable.from = Readable.from || function (iterable, opts?) {
  let iterator: Iterator<any>;
  // @ts-ignore
  if (iterable && iterable[Symbol.asyncIterator])
    // @ts-ignore
    iterator = iterable[Symbol.asyncIterator]();
  // @ts-ignore
  else if (iterable && iterable[Symbol.iterator])
    // @ts-ignore
    iterator = iterable[Symbol.iterator]();
  else
    throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "iterable" argument must be of type Iterable. Received type ${typeof iterable}`);

  const readable = new Readable({
    objectMode: true,
    ...opts
  });
  // Reading boolean to protect against _read
  // being called before last iteration completion.
  let reading = false;
  readable._read = function () {
    if (!reading) {
      reading = true;
      next();
    }
  };

  async function next() {
    try {
      const { value, done } = await iterator.next();
      if (done) {
        readable.push(null);
      } else if (readable.push(await value)) {
        next();
      } else {
        reading = false;
      }
    } catch (err) {
      readable.destroy(err);
    }
  }

  return readable;
};

export default fromIter;
