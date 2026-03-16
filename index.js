import fs from 'node:fs/promises';
import http from 'node:http';
import { parseArgs } from 'node:util';
import { XMLBuilder } from 'fast-xml-parser';
const options = {
  input: { type: 'string', short: 'i' },
  host: { type: 'string', short: 'h' },
  port: { type: 'string', short: 'p' },
  output: { type: 'string', short: 'o', default: 'output.xml' },
};
let values;
try {
  ({ values } = parseArgs({ options, strict: false }));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const required = ['input', 'host', 'port'];
const missing = required.filter((arg) => !values[arg]);

if (missing.length > 0) {
  console.error(
    `Missing required arguments: ${missing.map((m) => `--${m}`).join(', ')}`,
  );
  process.exit(1);
}
async function processToXml() {
  try {
    const rawData = await fs.readFile(values.input, 'utf-8');
    const lines = rawData.split('\n').filter((line) => line.trim());
    const builder = new XMLBuilder({
      format: true,
      arrayMap: { houses: 'house' },
    });
    const houses = lines.map((line) => JSON.parse(line));
    const xmlContent = builder.build({ houses: { house: houses } });
    await fs.writeFile(values.output, xmlContent);
    console.log(`XML generated at ${values.output}`);
  } catch (err) {
    console.error(`Cannot find input file`);
    process.exit(1);
  }
}
function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${values.host}:${values.port}`);
    if (url.pathname === '/houses') {
      try {
        const xmlData = await fs.readFile(values.output, 'utf-8');

        const jsonObj = parser.parse(xmlData);
        let houseList = jsonObj.houses?.house || [];
        if (!Array.isArray(houseList)) {
          houseList = [houseList];
        }
        const maxPrice = parseFloat(url.searchParams.get('max_price'));
        const isFurnished = url.searchParams.get('furnished') === 'true';

        const filteredHouses = houseList.filter((h) => {
          const priceMatch = isNaN(maxPrice) || parseFloat(h.price) <= maxPrice;
          const furnishedMatch =
            !isFurnished || h.furnishingstatus === 'furnished';
          return priceMatch && furnishedMatch;
        });

        const filteredXml = builder.build({
          houses: { house: filteredHouses },
        });
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(filteredXml);
      } catch (err) {
        res.writeHead(500);
        res.end('Error reading data');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  server.listen(values.port, values.host, () => {
    console.log(
      `Server running at http://${values.host}:${values.port}/houses`,
    );
  });
}
await processToXml();
startServer();
