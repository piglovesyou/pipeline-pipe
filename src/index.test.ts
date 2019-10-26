import assert from 'assert';
import { pipeline, Readable } from 'readable-stream';
import pipe from './index';

describe('transform', () => {
  it('should emit pipeline callback after synchronous transform', async () => {
    const expected = [ 2, 3, 4, 5, 6 ];
    const actual: number[] = [];

    await new Promise((resolve, reject) => {
      pipeline(
          Readable.from(expected),
          pipe(function (n) {
            actual.push(n);
          }),
          (err) => {
            if (err) return reject(err);
            resolve();
          }
      );
    });

    assert.deepStrictEqual(actual, expected);
  }, 10 * 1000);

  it('should emit pipeline callback after asynchronous transform', async () => {
    const expected = [ 2, 3, 4, 5, 6 ];
    const actual: number[] = [];

    await new Promise((resolve, reject) => {
      pipeline(
          Readable.from(expected),
          pipe(function (n) {
            return new Promise(resolve => {
              setTimeout(() => {
                actual.push(n);
                resolve();
              }, n);
            });
          }, 10),
          (err) => {
            if (err) return reject(err);
            resolve();
          }
      );
    });

    assert.deepStrictEqual(actual, expected);
  }, 10 * 1000);

  it('should fix mafintosh/parallel-transform##4, emit "finish" after all buffer is consumed', async () => {
    const expectedArray = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ];
    const actualArray: number[] = [];
    let finished = false;

    await new Promise(resolve => {
      const stream = pipe(function (data) {
        return new Promise(resolve => {
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

  it('should run in parallel', async () => {
    const acceptableOffset = 200;
    const tookExpected = 1000 + acceptableOffset;
    const expectedArray = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ];
    const actualArray: number[] = [];
    let tookActual: number;

    await new Promise(resolve => {
      const start = Date.now();
      const stream = pipe(function (data) { // 10 is the parallism level
        return new Promise(
            (resolve) => setTimeout(
                () => resolve(data),
                1000
            )
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
  }, 10 * 1000);

  it('should chain pipes', async () => {
    const expected = [ '0', '20', '40', '60', '80' ];
    const actual: string[] = [];
    await new Promise(resolve => {
      const r = Readable.from([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
      r.pipe(pipe((n: number) => {
        if (n % 2 === 0) {
          return new Promise(
              resolve => setTimeout(
                  () => resolve(n),
                  n
              )
          );
        }
      })).pipe(pipe((n: number) => {
        return String(n * 10);
      })).pipe(pipe((s: string) => {
        actual.push(s);
      })).on('finish', resolve);
    });
    assert.deepStrictEqual(actual, expected);
  });

  it('should hanlde huge numbe of stream', async () => {
    const expected = 10 * 1000;
    let actual = 0;
    await new Promise(resolve => {
      let i = 0;
      new Readable({
        objectMode: true,
        read(size: number): void {
          for (; ;) {
            const pushed = this.push('a');
            if (++i >= expected) this.push(null);
            if (pushed === false) return;
          }
        }
      })
          .pipe(pipe(async (data: string) => {
                await timeout(Math.random() * 4);
                return `${ data }b`;
              }, 10)
          )
          .pipe(pipe(async (data: string) => {
                await timeout(Math.random() * 4);
                assert.deepStrictEqual(data, 'ab');
                actual++;
              }, 10)
          ).on('finish', resolve);
    });
    assert.deepStrictEqual(actual, expected);
  }, 60 * 1000);
});

function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
