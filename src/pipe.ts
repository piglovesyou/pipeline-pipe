import ParallelTransform, { OnTransformFn, ParallelTransformOpitons } from "./ParallelTransform";

export type AsyncTransformFn = (data: any) => Promise<any> | any;

export default function pipe(
    asyncTransformFn: AsyncTransformFn,
    opts: number | ParallelTransformOpitons = {},
) {
  const onTransformFn: OnTransformFn = function (this: ParallelTransform, data, callback) {
    try {
      const returned = asyncTransformFn.call(this, data);
      Promise.resolve(returned).then(resolved => callback(undefined, resolved));
    } catch (e) {
      callback(e);
    }
  };

  const options = typeof opts === 'number'
      ? { maxParallel: opts } as ParallelTransformOpitons
      : opts;

  return new ParallelTransform(onTransformFn, options);
}
