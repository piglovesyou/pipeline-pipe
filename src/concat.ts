import { Transform } from 'readable-stream';

export default function concat(size: number) {
  let buffered: any[] = [];

  return new Transform({
    objectMode: true,
    transform(chunk, enc, callback) {
      buffered.push(chunk);
      if (buffered.length >= size) {
        this.push(buffered);
        buffered = [];
      }
      callback();
    },
    flush(callback: (er: any, data: any) => void): void {
      if (buffered.length > 0) {
        const b = buffered;
        buffered = [];
        callback(undefined, b);
        return;
      }
      callback(undefined, null);
    }
  });
}
