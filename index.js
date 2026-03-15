import fs from 'fs';
import { parseArgs } from 'node:util';

const options = {
  input: { type: 'string', short: 'i' },
  host: { type: 'string', short: 'h' },
  port: { type: 'string', short: 'p' },
  output: { type: 'string', short: 'o', default: 'output.xml' },
};

let values;

try {
  // If parseArgs fails here, values remains undefined
  ({ values } = parseArgs({ options }));
} catch (error) {
  // This catches syntax errors like passing an undefined flag (e.g., --foo)
  console.error('Error parsing arguments:', error.message);
  process.exit(1);
}

// Now check if the required values actually exist
const required = ['input', 'host', 'port'];
const missing = required.filter((arg) => !values[arg]);

if (missing.length > 0) {
  console.error(
    `Missing required arguments: ${missing.map((m) => `--${m}`).join(', ')}`,
  );
  process.exit(1);
}
if (!values.input) {
  console.error('Please, specify input file');
  process.exit(1);
}

function readFile(file) {
  let content = 'if you see this, something went wrong';
  try {
    content = fs.readFileSync(file, 'utf-8').split('\n');
  } catch (error) {
    console.error(`Cannot find input file`);
    process.exit(1);
  }
  return content;
}

function writeFile(file, content) {
  fs.writeFileSync(file, content.join('\n').replace(/"/g, ' '), 'utf-8');
}

// readFile returns an array of lines, each line is a JSON string representing a house object
const data = readFile(values.input);
// Example line:
// {"price":"13300000","area":"7420","bedrooms":"4","bathrooms":"2","stories":"3","mainroad":"yes","guestroom":"no","basement":"no","hotwaterheating":"no","airconditioning":"yes","parking":"2","prefarea":"yes","furnishingstatus":"furnished"}
const filteredData = [];
for (const line of data) {
  if (!line.trim()) continue;
  const obj = JSON.parse(line);

  const withinPrice = values.price
    ? parseFloat(obj.price) <= parseFloat(values.price)
    : true;
  const furnishedOk = values.furnished
    ? obj.furnishingstatus === 'furnished'
    : true;

  if (withinPrice && furnishedOk) {
    const pushedObj = JSON.stringify(obj)
      .replace(/[{}"]/g, '')
      .replace(/,/g, ', ');
    values.display && console.log(`Hose: ${data.indexOf(line) + 1}`);
    filteredData.push(pushedObj);
    values.display && console.log(pushedObj);
  }
}

writeFile(
  values.output,
  filteredData.map((obj) => JSON.stringify(obj)),
);
