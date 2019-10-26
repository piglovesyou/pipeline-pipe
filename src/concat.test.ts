import assert from 'assert';
import { Readable } from 'stream';
import { pipeline } from 'readable-stream';
import { pipe, concat } from "./index";

describe('concat(size)', () => {
  it('concats incoming stream and build array of given size', async function () {
    const expect1: number[][] = [
      [ 0, 10, 20, 30, 40 ],
      [ 50, 60, 70, 80, 90 ],
      [ 100, 110, 120, 130, 140 ],
      [ 150, 160, 170, 180, 190 ],
      [ 200, 210, 220 ],
    ];
    const expect2: number[] = [ 100, 200 ];
    const actual1: number[][] = [];
    const actual2: number[] = [];

    await new Promise((resolve, reject) => {
      pipeline(
          Readable.from(Array.from(Array(23)).map((_, i) => i)),
          pipe((n) => n * 10),
          concat(5),
          pipe((packed) => {
            actual1.push(packed);
            return packed;
          }),
          pipe((packed) => packed[0]),
          concat(3),
          pipe((packed) => packed[packed.length - 1]),
          pipe((packed) => actual2.push(packed)),
          (err) => err ? reject(err) : resolve(),
      );
    });
    assert.deepStrictEqual(actual1, expect1);
    assert.deepStrictEqual(actual2, expect2);
  });
});
