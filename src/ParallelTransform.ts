/* eslint-disable no-underscore-dangle, no-param-reassign, no-plusplus, no-continue */

import { Transform, TransformOptions } from 'readable-stream';
import cyclist, { Cyclist } from 'cyclist';

export type ParallelTransformOptions = TransformOptions & {
  maxParallel?: number;
  ordered?: boolean;
};

type Callback = (error?: Error, data?: any) => void;

export type OnTransformFn = (data: any, callback: Callback) => void;

const DEFAULT_MAX_PARALLEL = 10;
const DEFAULT_HIGH_WATERMARK = 16; // The issues seems to be here
// https://stackoverflow.com/questions/50302881/buffering-data-in-memory-writable-final-hook-never-called
// https://github.com/mafintosh/parallel-transform/issues/1

export default class ParallelTransform extends Transform {
  private _destroyed: boolean;

  private readonly _maxParallel: number;

  private readonly _ontransform: OnTransformFn;

  private _finishing: boolean;

  private readonly _ordered: boolean;

  private readonly _buffer: Cyclist<any> | Array<any>;

  private _top: number;

  private _bottom: number;

  private ondrain: null | Callback;

  constructor(ontransform: OnTransformFn, opts: ParallelTransformOptions) {
    if (opts.objectMode !== false) {
      opts.objectMode = true;
      opts.objectMode = true;
    }

    const maxParallel = opts.maxParallel || DEFAULT_MAX_PARALLEL;
    if (!opts.highWaterMark) {
      opts.highWaterMark = Math.max(maxParallel, DEFAULT_HIGH_WATERMARK);
    }

    super(opts);

    this._destroyed = false;
    this._maxParallel = maxParallel;
    this._ontransform = ontransform;
    this._finishing = false;
    this._ordered = opts.ordered !== false;
    this._buffer = this._ordered ? cyclist(maxParallel) : [];
    this._top = 0;
    this._bottom = 0;
    this.ondrain = null;

    // this.on('data', () => {}); // This fixes the issue for some reason.... :sad-panda:
  }

  destroy(): this {
    if (this._destroyed) return this;
    this._destroyed = true;
    this.emit('close');
    return this;
  }

  _transform(chunk: any, encoding: string, callback: Callback): void {
    const pos = this._top++;

    this._ontransform(chunk, (err, data) => {
      if (this._destroyed) return;
      if (err) {
        this.emit('error', err);
        this.push(null);
        this.destroy();
        return;
      }
      if (Array.isArray(this._buffer)) {
        this._buffer.push(data);
      } else {
        this._buffer.put(
          pos,
          data === undefined || data === null ? null : data,
        );
      }
      this._drain();
    });

    if (this._top - this._bottom < this._maxParallel) {
      callback();
      return;
    }
    this.ondrain = callback;
  }

  _final(callback: Callback) {
    this._finishing = true;
    this.ondrain = callback;
    this._drain();
  }

  _drain() {
    if (Array.isArray(this._buffer)) {
      while (this._buffer.length > 0) {
        const popped = this._buffer.pop();
        this._bottom++;
        if (popped === null) continue;
        this.push(popped);
      }
    } else {
      while (this._buffer.get(this._bottom) !== undefined) {
        const deleted = this._buffer.del(this._bottom++);
        if (deleted === null) continue;
        this.push(deleted);
      }
    }

    if (!this._drained() || !this.ondrain) return;

    const { ondrain } = this;
    this.ondrain = null;
    ondrain();
  }

  _drained() {
    const diff = this._top - this._bottom;
    return this._finishing ? !diff : diff < this._maxParallel;
  }
}
