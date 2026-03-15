const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function toBase64SingleLine(pem) {
  return pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\r?\n/g, '')
    .trim();
}

async function main() {
  let forge;
  try {
    forge = require('node-forge');
  } catch (e) {
    console.error('\nnode-forge is required. Install it first:\n');
    console.error('  npm install node-forge\n');
    console.error('Then re-run:  node convert-pfx.js\n');
    process.exit(1);
  }

  const pfxInput = await question('PFX file path (e.g. star_orange_bf_2025.pfx): ');
  const password = await question('PFX password (leave blank if none): ');
  rl.close();

  const resolvedPath = path.resolve(pfxInput.trim());

  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nFile not found: ${resolvedPath}\n`);
    process.exit(1);
  }

  const pfxBuffer = fs.readFileSync(resolvedPath);
  const pfxDer = forge.util.createBuffer(pfxBuffer.toString('binary'));
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);

  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password.trim() || '');
  } catch (e) {
    console.error('\nFailed to parse PFX. Wrong password or corrupted file.');
    console.error(e.message);
    process.exit(1);
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

  const certBag = certBags[forge.pki.oids.certBag];
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

  if (!certBag || certBag.length === 0) {
    console.error('\nNo certificate found in PFX.\n');
    process.exit(1);
  }

  if (!keyBag || keyBag.length === 0) {
    console.error('\nNo private key found in PFX.\n');
    process.exit(1);
  }

  const cert = certBag[0].cert;
  const privateKey = keyBag[0].key;

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(privateKey);

  fs.writeFileSync('cert.pem', certPem);
  fs.writeFileSync('key.pem', keyPem);

  const certB64 = toBase64SingleLine(certPem);
  const keyB64 = toBase64SingleLine(keyPem);

  fs.writeFileSync('cert_b64.txt', certB64);
  fs.writeFileSync('key_b64.txt', keyB64);

  console.log('\n--- Output files written ---');
  console.log('  cert.pem      : Certificate in PEM format');
  console.log('  key.pem       : Private key in PEM format');
  console.log('  cert_b64.txt  : Certificate as single-line base64');
  console.log('  key_b64.txt   : Private key as single-line base64\n');

  console.log('--- Base64 values (copy these into your .env / Supabase secrets) ---\n');
  console.log('ORANGE_MONEY_CERT_B64:');
  console.log(certB64.substring(0, 80) + '...\n');
  console.log('ORANGE_MONEY_KEY_B64:');
  console.log(keyB64.substring(0, 80) + '...\n');

  console.log('Full values saved in cert_b64.txt and key_b64.txt\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
