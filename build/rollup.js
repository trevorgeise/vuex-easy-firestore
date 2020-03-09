/* eslint-disable */

// npm install rollup-plugin-typescript2 typescript --save-dev
import typescript from 'rollup-plugin-typescript2'
// import { terser } from 'rollup-plugin-terser'
// import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs';
// ------------------------------------------------------------------------------------------
// formats
// ------------------------------------------------------------------------------------------
// amd – Asynchronous Module Definition, used with module loaders like RequireJS
// cjs – CommonJS, suitable for Node and Browserify/Webpack
// esm – Keep the bundle as an ES module file
// iife – A self-executing function, suitable for inclusion as a <script> tag. (If you want to create a bundle for your application, you probably want to use this, because it leads to smaller file sizes.)
// umd – Universal Module Definition, works as amd, cjs and iife all in one
// system – Native format of the SystemJS loader

// ------------------------------------------------------------------------------------------
// setup
// ------------------------------------------------------------------------------------------
const pkg = require('../package.json')
const name = pkg.name
// prettier-ignore
const className = name.replace(/(^\w|-\w)/g, c => c.replace('-', '').toUpperCase())
const external = Object.keys(pkg.dependencies || [])
const plugins = [
  commonjs({
    namedExports: {
        'node_modules/lodash/index.js': [
            'get',
        ]
    }
}),
  // resolve({only: [
  //   'compare-anything',
  //   'copy-anything',
  //   'filter-anything',
  //   'find-and-replace-anything',
  //   'flatten-anything',
  //   'is-what',
  //   'merge-anything',
  //   'vuex-easy-access',
  // ]}),
  typescript({ useTsconfigDeclarationDir: true })
]

// ------------------------------------------------------------------------------------------
// Builds
// ------------------------------------------------------------------------------------------
function defaults (config) {
  // defaults
  const defaults = {
    plugins,
    external
  }
  // defaults.output
  config.output = config.output.map(output => {
    return Object.assign(
      {
        sourcemap: false,
        name: className
      },
      output
    )
  })
  return Object.assign({}, defaults, config)
}

export default [
  defaults({
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.cjs.js', format: 'cjs' },
      { file: 'dist/index.esm.js', format: 'esm' }
    ]
  }),
  defaults({
    input: 'test/helpers/index.ts',
    output: [{ file: 'test/helpers/index.cjs.js', format: 'cjs' }]
  }),
  defaults({
    input: 'src/utils/setDefaultValues.ts',
    output: [{ file: 'test/helpers/utils/setDefaultValues.js', format: 'cjs' }]
  })
]
