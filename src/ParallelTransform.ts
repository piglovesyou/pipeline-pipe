/* eslint-disable no-underscore-dangle, no-param-reassign, no-plusplus, no-continue */

import { Transform, TransformOptions } from "readable-stream";
import cyclist, { Cyclist } from "cyclist";

export type ParallelTransformOpitons = TransformOptions & {
  maxParallel?: number,
  ordered?: boolean,
};

export type OnTransformFn = (data: any, callback: (error?: Error, data?: any) => void) => void;

export default class ParallelTransform extends Transform {
  private _destroyed: boolean;

  private readonly _maxParallel: number;

  private readonly _ontransform: OnTransformFn;

  private _finishing: boolean;

  private readonly _ordered: boolean;

  private readonly _buffer: Cyclist<any> | Array<any>;

  private _top: number;

  private _bottom: number;

  private ondrain: null | Function;

  constructor(
      ontransform: OnTransformFn,
      opts: ParallelTransformOpitons,
  ) {
    if (opts.objectMode !== false) {
      opts.objectMode = true;
      opts.objectMode = true;
    }

    const maxParallel = opts.maxParallel || 10;
    if (!opts.highWaterMark) opts.highWaterMark = Math.max(maxParallel, 16);

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
  }

  destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    if (this._destroyed) return this;
    this._destroyed = true;
    this.emit('close');
    return this;
  };

  _transform(chunk: any, encoding: string, callback: (error?: Error, data?: any) => void): void {
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
        this._buffer.put(pos, (data === undefined || data === null) ? null : data);
      }
      this._drain();
    });

    if (this._top - this._bottom < this._maxParallel) {
      callback();
      return;
    }
    this.ondrain = callback;
  }

  _final(callback: Function) {
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

    const {ondrain} = this;
    this.ondrain = null;
    ondrain();
  };

  _drained() {
    const diff = this._top - this._bottom;
    return this._finishing ? !diff : diff < this._maxParallel;
  }
}
