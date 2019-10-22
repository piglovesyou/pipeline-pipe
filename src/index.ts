import fromIter from "./fromIter";
import split from "./split";
import pipeline from "./pipeline";
import ParallelTransform from "./ParallelTransform";
import pipe from "./pipe";

export default pipe;
export {default as ParallelTransform} from './ParallelTransform';
export {default as pipeline} from './pipeline';
export {default as split} from './split';
export {default as fromIter} from './fromIter';

module.exports = pipe;
module.exports.ParallelTransform = ParallelTransform;
module.exports.pipeline = pipeline;
module.exports.split = split;
module.exports.fromIter = fromIter;
