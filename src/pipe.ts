import ParallelTransform, {
  OnTransformFn,
  ParallelTransformOptions,
} from './ParallelTransform';

export type AsyncTransformFn = (data: any) => Promise<any> | any;

export default function pipe(
  asyncTransformFn: AsyncTransformFn,
  opts: number | ParallelTransformOptions = {},
) {
  const onTransformFn: OnTransformFn = function (
    this: ParallelTransform,
    data,
    callback,
  ) {
    try {
      const returned = asyncTransformFn.call(this, data);
      Promise.resolve(returned).then((resolved) =>
        callback(undefined, resolved),
      );
    } catch (e) {
      callback(e);
    }
  };

  const options =
    typeof opts === 'number'
      ? ({ maxParallel: opts } as ParallelTransformOptions)
      : opts;

  return new ParallelTransform(onTransformFn, options);
}
