import { error } from 'console';
import { drawPatch } from '../src/draw';
import { Patcher } from '../src/patcher';

const fileBtn = document.getElementById('open-file');
const clipboardBtn = document.getElementById('open-clipboard');
const downloadBtn = document.getElementById('download');
const errorText = document.querySelector('.error');

let toDelete: HTMLElement[] = [];

let svg = '';

function download() {
  if (!svg) return;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patch.svg';
  a.click();
  URL.revokeObjectURL(url);
}

downloadBtn?.addEventListener('click', download);

function load(data: any) {
  downloadBtn?.classList.add('hide');

  for (const d of toDelete) {
    d.remove();
  }
  toDelete = [];

  const patch = Patcher.parse(data);
  patch.crop();

  svg = drawPatch(patch, false);

  const container = document.createElement('div');
  container.innerHTML = svg;
  document.body.appendChild(container);
  toDelete.push(container);

  downloadBtn?.classList.remove('hide');
}

fileBtn?.addEventListener('click', () => {
  const input = document.createElement('input');

  input.type = 'file';
  input.onchange = async (event) => {
    errorText?.classList.add('hide');
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      load(data);
    } catch (e) {
      errorText?.classList.remove('hide');
      throw e;
    }
  };
  input.click();
});

clipboardBtn?.addEventListener('click', async () => {
  try {
    errorText?.classList.add('hide');
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    load(data);
  } catch (e) {
    errorText?.classList.remove('hide');
    throw e;
  }
});
