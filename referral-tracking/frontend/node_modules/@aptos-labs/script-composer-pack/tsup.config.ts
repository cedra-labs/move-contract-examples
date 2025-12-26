import { defineConfig } from 'tsup'
import { Plugin } from 'esbuild'
import fs from 'fs'
import path from 'path'

export function wasmLoader():Plugin {
  return {
    name: 'wasm-loader',
    setup(build) {
      build.onLoad({ filter: /\.wasm$/ }, async (args) => {
        const wasmPath = path.resolve(args.path);
        const wasmBuffer = await fs.promises.readFile(wasmPath);
        const contents = `
          const wasm = [${new Uint8Array(wasmBuffer).toString()}];
          export default wasm;
        `;
        return {
          contents,
          loader: 'js',
        };
      });
    },
  };
}
export function removeURLCodePlugin():Plugin {
  return {
    name: 'remove-specific-code',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {

        const source = await fs.promises.readFile(args.path, 'utf8');

        const regex = /if \(typeof module_or_path === 'undefined'\) {\s*module_or_path = new URL\('aptos_dynamic_transaction_composer_bg\.wasm', import\.meta\.url\);\s*}/g;

        const newSource = source.replace(regex, '');

        return {
          contents: newSource,
          loader: 'js',
        };
      });
    },
  };
}

export default defineConfig({
  entry: ['main.mts'],
  splitting: false,
  clean: true,
  dts: {
    entry: 'main.mts',
    resolve: true,
  },
  format: ['cjs', 'esm'],
  esbuildPlugins: [wasmLoader(), removeURLCodePlugin()],
  esbuildOptions(options, context) {
    if (context.format === 'cjs') {
      options.outdir = 'dist/cjs'
    } else if (context.format === 'esm') {
      options.outdir = 'dist/esm'
    }
  }
})