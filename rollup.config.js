import nodeResolve from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript'
import commonjs from 'rollup-plugin-commonjs'
import {terser} from 'rollup-plugin-terser'

export default {
  input: 'src/_kraken-api-browser.ts',
  output: { file: 'kraken-api-browser.js', format: 'iife', name: 'Kraken' },
  plugins: [nodeResolve(), typescript(), commonjs(), terser()]
}