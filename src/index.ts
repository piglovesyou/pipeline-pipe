import ParallelTransform, { OnTransformFn, ParallelTransformOpitons } from "./ParallelTransform";

export type AsyncTransformFn = (data: any) => Promise<any> | any | void;

export default function pipe(
    asyncTransformFn: AsyncTransformFn,
    opts: number | ParallelTransformOpitons = {},
) {
  const onTransformFn: OnTransformFn = function(this: ParallelTransform, data, callback) {
    try {
      let returned = asyncTransformFn.call(this, data);
      Promise.resolve(returned).then(resolved => callback(undefined, resolved));
    } catch (e) {
      callback(e);
    }
  };

  if (typeof opts === 'number') {
    opts = {
      maxParallel: opts,
    };
  }

  return new ParallelTransform(onTransformFn, opts as ParallelTransformOpitons);
}

module.exports = pipe;
module.exports.ParallelTransform = ParallelTransform;
