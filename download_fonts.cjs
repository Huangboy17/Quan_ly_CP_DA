const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'src', 'utils', 'export');
fs.mkdirSync(dir, { recursive: true });

function dl(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        return dl(r.headers.location).then(res).catch(rej);
      }
      const ch = [];
      r.on('data', c => ch.push(c));
      r.on('end', () => res(Buffer.concat(ch)));
      r.on('error', rej);
    }).on('error', rej);
  });
}

async function main() {
  console.log('Downloading Roboto-Regular.ttf...');
  const reg = await dl('https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf');
  console.log('Regular size:', reg.length, 'bytes');

  console.log('Downloading Roboto-Bold.ttf...');
  const bold = await dl('https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf');
  console.log('Bold size:', bold.length, 'bytes');

  const regB64 = reg.toString('base64');
  const boldB64 = bold.toString('base64');

  const content = [
    '// Roboto font (Apache 2.0 License) - Auto-generated Base64',
    '// Source: https://github.com/google/fonts/tree/main/apache/roboto',
    '// Do NOT edit manually.',
    '',
    'export const RobotoRegularBase64 = "' + regB64 + '";',
    '',
    'export const RobotoBoldBase64 = "' + boldB64 + '";',
    '',
  ].join('\n');

  const outPath = path.join(dir, 'fonts.js');
  fs.writeFileSync(outPath, content);
  console.log('Written to:', outPath);
  console.log('File size:', fs.statSync(outPath).size, 'bytes');
}

main().catch(e => { console.error(e); process.exit(1); });
