import { promisify } from "util";
import { pipeline as _pipeline } from "stream";

const pipeline = promisify(_pipeline);

export default pipeline;
