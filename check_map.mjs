import fs from 'fs';
import { SourceMapConsumer } from 'source-map';

const mapPath = process.argv[2];
const line = parseInt(process.argv[3], 10);
const column = parseInt(process.argv[4], 10);

const rawSourceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line,
    column
  });
  console.log(pos);
});
