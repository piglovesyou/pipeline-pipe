import assert from 'assert';
import { pipeline, Readable, Transform } from 'readable-stream';
// @ts-ignore
import transform from './index';
import requireActual = jest.requireActual;

describe('transform', () => {
  it('should emit pipeline callback with synchronous stream ', async () => {
    const expected = [ 2, 3, 4, 5, 6 ];
    const actual: number[] = [];

    await new Promise((resolve, reject) => {
      const readable = new Readable({
        objectMode: true,
        read(size: number): void {
          for (let n of expected) this.push(n);
          this.push(null);
        }
      });
      pipeline(
          readable,
          transform(10, function (n, callback) {
            actual.push(n);
            callback();
          }),
          (err) => {
            if (err) return reject(err);
            resolve();
          }
      );
    });

    assert.deepStrictEqual(actual, expected);
  }, 10 * 1000);

  it('should emit pipeline callback with asynchronous stream', async () => {
    const expected = [ 2, 3, 4, 5, 6 ];
    const actual: number[] = [];

    await new Promise((resolve, reject) => {
      const readable = new Readable({
        objectMode: true,
        read(size: number): void {
          for (let n of expected) this.push(n);
          this.push(null);
        }
      });
      pipeline(
          readable,
          transform(10, function (n, callback) {
            setTimeout(() => {
              actual.push(n);
              callback();
            }, n);
          }),
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
      const stream = transform(10, function (data, callback) {
        setTimeout(function () {
          actualArray.push(data);
          callback(undefined, data);
        }, data);
      });

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
      const stream = transform(10, function (data, callback) { // 10 is the parallism level
        setTimeout(function () {
          callback(undefined, data);
        }, 1000);
      });

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
    let wasInParallel = tookActual < tookExpected;
    assert(wasInParallel);
    assert.deepStrictEqual(actualArray, expectedArray);
  }, 10 * 1000);

  it('should chain pipes as expected', async () => {
    const expected = [ '0', '20', '40', '60', '80' ];
    const actual: string[] = [];
    await new Promise(resolve => {
      new Readable({
        objectMode: true,
        read(size: number): void {
          for (let n of [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]) {
            this.push(n);
          }
          this.push(null);
        }
      }).pipe(transform(10, (n: number, callback) => {
        if (n % 2 === 0) {
          setTimeout(() => {
            callback(undefined, n);
          }, n);
          return;
        }
        callback();
      })).pipe(transform(10, (n: number, callback) => {
        callback(undefined, String(n * 10));
      })).pipe(transform(10, (s: string, callback) => {
        actual.push(s);
        callback();
      })).on('finish', resolve);
    });
    assert.deepStrictEqual(actual, expected);
  });

  it('should hanlde huge numbe of stream', async () => {
    const expected = 10 * 1000;
    let actual = 0;
    await new Promise(resolve => {
      let i = 0;
      const r = new Readable({
        objectMode: true,
        read(size: number): void {
          for (; ;) {
            const pushed = this.push('a');
            if (++i >= expected) this.push(null);
            if (pushed === false) return;
          }
        }
      });
      r.pipe(transform(10, (data: string, callback) => {
        setTimeout(() => {
          callback(undefined, data + 'b');
        }, Math.random() * 4);
      })).pipe(transform(10, (data: string, callback) => {
        setTimeout(() => {
          assert.deepStrictEqual(data.length, 2);
          actual++;
          callback();
        }, Math.random() * 4);
      })).on('finish', resolve);
    });
    assert.deepStrictEqual(actual, expected);
  }, 60 * 1000);
});
