import { Transform } from "readable-stream";

export default function split() {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform (chunks, enc, callback) {
      if (!Array.isArray(chunks)) {
        throw new Error('split() must receive an array from a previous function.');
      }
      for (const c of chunks) this.push(c);
      callback();
    },
  });
}
