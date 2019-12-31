import ParallelTransform from './ParallelTransform';
import pipe from './pipe';
import pipeline from './pipeline';
import split from './split';
import concat from './concat';

export { default as ParallelTransform } from './ParallelTransform';
export default pipe;
export { default as pipe } from './pipe';
export { default as pipeline } from './pipeline';
export { default as split } from './split';
export { default as concat } from './concat';

module.exports = pipe;
module.exports.pipe = pipe;
module.exports.ParallelTransform = ParallelTransform;
module.exports.pipeline = pipeline;
module.exports.split = split;
module.exports.concat = concat;
