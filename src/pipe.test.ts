import assert from 'assert';
import { Readable } from 'stream';
import asyncPipeline from './pipeline';
import { pipeline } from 'readable-stream';
import pipe from './index';
import { promisify } from 'util';

describe('pipe(fn, opts)', () => {
  it(
    'emits callback in pipeline() after synchronous transform',
    async () => {
      const expected = [2, 3, 4, 5, 6];
      const actual: number[] = [];

      await new Promise<void>((resolve, reject) => {
        pipeline(
          Readable.from(expected),
          pipe(function (n) {
            actual.push(n);
          }),
          (err) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      assert.deepStrictEqual(actual, expected);
    },
    10 * 1000,
  );

  it(
    'emits callback in pipeline() after asynchronous transform',
    async () => {
      const expected = [2, 3, 4, 5, 6];
      const actual: number[] = [];

      await new Promise<void>((resolve, reject) => {
        pipeline(
          Readable.from(expected),
          pipe(function (n) {
            return new Promise<void>((resolve) => {
              setTimeout(() => {
                actual.push(n);
                resolve();
              }, n);
            });
          }, 10),
          (err) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      assert.deepStrictEqual(actual, expected);
    },
    10 * 1000,
  );

  it('fixes mafintosh/parallel-transform##4, emit "finish" after all buffer is consumed', async () => {
    const expectedArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const actualArray: number[] = [];
    let finished = false;

    await new Promise<void>((resolve) => {
      const stream = pipe(function (data) {
        return new Promise((resolve) => {
          setTimeout(() => {
            actualArray.push(data);
            resolve(data);
          }, data);
        });
      }, 10);

      for (let i = 0; i < 10; i++) {
        stream.write(i);
      }
      stream.end();

      stream.on('finish', function () {
        assert.deepStrictEqual(actualArray, expectedArray);
        finished = true;
        resolve();
      });
    });

    assert(finished);
  });

  it(
    'runs in parallel',
    async () => {
      const acceptableOffset = 200;
      const tookExpected = 1000 + acceptableOffset;
      const expectedArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const actualArray: number[] = [];
      let tookActual: number;

      await new Promise<void>((resolve) => {
        const start = Date.now();
        const stream = pipe(function (data) {
          // 10 is the parallism level
          return new Promise((resolve) =>
            setTimeout(() => resolve(data), 1000),
          );
        }, 10);

        for (let i = 0; i < 10; i++) {
          stream.write(i);
        }
        stream.end();

        stream.on('data', function (data: number) {
          actualArray.push(data);
        });
        stream.on('end', function () {
          tookActual = Date.now() - start;
          resolve();
        });
      });

      // @ts-ignore
      const wasInParallel = tookActual < tookExpected;
      assert(wasInParallel);
      assert.deepStrictEqual(actualArray, expectedArray);
    },
    10 * 1000,
  );

  it('chains pipes', async () => {
    const expected = ['0', '20', '40', '60', '80'];
    const actual: string[] = [];
    await new Promise((resolve) => {
      const r = Readable.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      r.pipe(
        pipe((n: number) => {
          if (n % 2 === 0) {
            return new Promise((resolve) => setTimeout(() => resolve(n), n));
          }
        }),
      )
        .pipe(
          pipe((n: number) => {
            return String(n * 10);
          }),
        )
        .pipe(
          pipe((s: string) => {
            actual.push(s);
          }),
        )
        .on('finish', resolve);
    });
    assert.deepStrictEqual(actual, expected);
  });

  it(
    'handles huge number of stream',
    async () => {
      const expected = 10 * 1000;
      let actual = 0;
      await new Promise((resolve) => {
        let i = 0;
        new Readable({
          objectMode: true,
          read(_size: number): void {
            for (;;) {
              const pushed = this.push('a');
              if (++i >= expected) this.push(null);
              if (pushed === false) return;
            }
          },
        })
          .pipe(
            pipe(async (data: string) => {
              await timeout(Math.random() * 4);
              return `${data}b`;
            }, 10),
          )
          .pipe(
            pipe(async (data: string) => {
              await timeout(Math.random() * 4);
              assert.deepStrictEqual(data, 'ab');
              actual++;
            }, 10),
          )
          .on('finish', resolve);
      });
      assert.deepStrictEqual(actual, expected);
    },
    60 * 1000,
  );

  it('resolves on bottlenecked concurrency with multiple "pipes" in the chain', async () => {
    /**
     * I was absolutely pulling my hair out trying to figure out what was going
     * wrong as I was trying to implement something and I was digging through my code.
     *
     * Then I noticed something when I started fooling with the `maxParallel` param and
     * the promise would resolve or not resolve depending on the value of the last item
     * in the pipe chain.
     *
     * { ordered: true/false } does not seem to affect the outcome
     *
     * The behavior is not affected by not using the promisified `pipeline` function from 'stream'
     *
     * Stream Size 100
     *  Last pipe maxParallel
     *    49 passes
     *    48 fails
     *
     * Stream Size 200
     *  Last pipe maxParallel
     *    99 passes
     *    98 fails
     *
     * Stream Size 500
     *  Last pipe maxParallel
     *    249 passes
     *    248 fails
     *
     * Conclusion
     * maxParallel >= streamSize / 2 - 1 Passes
     * maxParallel < streamSize / 2 - 1 Fails
     */
    const actual: string[] = [];

    const r = Readable.from(getNumericalArray(100)); // set this to 100 with the below parallel on 48 and it will pass

    async function first(n: number) {
      if (n % 2 === 0) {
        await timeout(1);
        return n;
      }
    }

    async function second(n: number) {
      return String(n * 10);
    }

    async function third(s: string) {
      actual.push(s);
      return s;
    }

    await asyncPipeline(
      r,
      pipe(first),
      pipe(second),
      pipe(third, 48), // set this maxParallel to 48 or below, it fails on timeout, set it to 49 or above and it passes
    );
  });

  it('resolves on bottlenecked concurrency with only "first" function pipe in the chain', async () => {
    /**
     *
     * Stream Size 100
     *  Last pipe maxParallel
     *    34 passes
     *    33 fails
     *
     * Stream Size 200
     *  Last pipe maxParallel
     *    68 passes
     *    67 fails
     *
     * Stream Size 500
     *  Last pipe maxParallel
     *    168 passes
     *    167 fails
     *
     */

    const r = Readable.from(getNumericalArray(100));

    async function first(n: number) {
      if (n % 2 === 0) {
        await timeout(1);
        return n;
      }
    }

    await asyncPipeline(r, pipe(first, 33));
  });

  it('resolves on bottlenecked concurrency with only "second" function pipe in the chain', async () => {
    /**
     *
     * Stream Size 100
     *  Last pipe maxParallel
     *    100 passes
     *    99 fails
     *
     * Stream Size 200
     *  Last pipe maxParallel
     *    200 passes
     *    199 fails
     *
     * Stream Size 500
     *  Last pipe maxParallel
     *    500 passes
     *    499 fails
     *
     */

    const r = Readable.from(getNumericalArray(100));

    async function second(n: number) {
      return String(n * 10);
    }

    await asyncPipeline(r, pipe(second, 99));
  });

  it('resolves on bottlenecked concurrency with only "third" function pipe in the chain', async () => {
    /**
     *
     * Stream Size 100
     *  Last pipe maxParallel
     *    100 passes
     *    99 fails
     *
     * Stream Size 200
     *  Last pipe maxParallel
     *    200 passes
     *    199 fails
     *
     * Stream Size 500
     *  Last pipe maxParallel
     *    500 passes
     *    499 fails
     *
     * Max Parallel set to 1
     *  Stream size 17 fails
     *  Stream size 16 passes
     */

    const r = Readable.from(getNumericalArray(100));

    const actual: string[] = [];
    async function third(s: string) {
      actual.push(s);
      return s;
    }

    await asyncPipeline(r, pipe(third, 99));
  });

  it('resolves on bottlenecked concurrency with one function that returns nothing', async () => {
    /**
     *
     * Always passes
     *
     */

    const r = Readable.from(getNumericalArray(100000));

    const actual: string[] = [];
    async function noReturn(s: string) {
      actual.push(s);
    }

    await asyncPipeline(r, pipe(noReturn, 1));
  });
});

const timeout = promisify(setTimeout);

function getNumericalArray(number: number): number[] {
  const arr: number[] = [];

  for (let i = 0; i < number; i++) arr.push(i);

  return arr;
}
