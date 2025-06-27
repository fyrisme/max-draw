// todo use an actual cli builder library

import * as fs from 'fs';
import { Patcher } from './patcher';
import { drawPatch } from './draw';

const patchPath = process.argv[2];
if (!patchPath) {
  console.error('Must provide a patch path');
  process.exit(1);
}

const patchText = fs.readFileSync(patchPath, 'utf-8');
const patchJson = JSON.parse(patchText);
const patch = Patcher.parse(patchJson);
patch.crop();

const svg = drawPatch(patch, false);
console.log(svg);
