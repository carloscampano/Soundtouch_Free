import { build } from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin to replace import.meta.url with CJS equivalent
const importMetaPlugin = {
  name: 'import-meta-url',
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const fs = await import('fs');
      let contents = fs.readFileSync(args.path, 'utf8');

      // Replace import.meta.url with CJS equivalent
      contents = contents.replace(
        /import\.meta\.url/g,
        'require("url").pathToFileURL(__filename).href'
      );

      return { contents, loader: 'js' };
    });
  }
};

await build({
  entryPoints: [join(__dirname, '..', '..', 'web', 'server.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: join(__dirname, '..', 'dist', 'server.bundle.js'),
  format: 'cjs',
  plugins: [importMetaPlugin],
  // Mark built-in modules as external
  external: ['fs', 'path', 'http', 'https', 'net', 'os', 'url', 'crypto', 'stream', 'util', 'events', 'buffer', 'querystring', 'zlib'],
  minify: false,
  sourcemap: false,
});

console.log('Server bundled successfully!');
