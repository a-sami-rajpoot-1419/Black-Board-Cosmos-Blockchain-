const fs = require('fs');
const path = require('path');

// Some published packages (e.g. @keplr-wallet/provider-extension) ship a tsconfig
// that `extends: "../../tsconfig.json"` for their monorepo.
// If you open those files in VS Code, TypeScript can show an error because
// `node_modules/tsconfig.json` doesn't exist in consumer projects.
//
// This tiny shim prevents noisy editor diagnostics without patching dependencies.

const frontendRoot = path.resolve(__dirname, '..');
const shimPath = path.join(frontendRoot, 'node_modules', 'tsconfig.json');

try {
  if (!fs.existsSync(shimPath)) {
    fs.writeFileSync(
      shimPath,
      JSON.stringify(
        {
          compilerOptions: {
            skipLibCheck: true
          }
        },
        null,
        2
      ) + '\n',
      'utf8'
    );
    // eslint-disable-next-line no-console
    console.log(`[postinstall] wrote ${shimPath}`);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[postinstall] failed to write node_modules/tsconfig.json shim:', e?.message ?? e);
}
