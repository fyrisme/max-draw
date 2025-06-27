import { Point } from './math';
import { Patcher, PatchObj } from './patcher';

// todo theme support

const themeCss = `
.object .bg { fill : #444; }
.message .bg { fill: url(#messageBg); rx: 4px; }
.fg-stroke { fill: none; stroke: #888; stroke-width: 2; }
.fg-fill { fill: #888; }
.port { fill: #333; stroke: #777; stroke-width: 1; }
.cable { stroke-linecap: round; }
.label {
  font-size: 12px;
  font-family: arial, sans-serif;
  height: 100%;
  display: flex;
  padding: 0 4px;
  flex-direction: column;
  justify-content: center;
  color: #ccc;
  line-height: 1.1;
}
`;

function cablePath(points: Point[]): string {
  const pathItems: (string | number)[] = [];
  let from = points.shift()!;
  pathItems.push('M', from.x, from.y);
  if (points.length > 1) {
    let through: Point | null = null;
    for (const to of points) {
      if (!through) {
        through = to;
        continue;
      }
      const a = through.towards(from, 10);
      const b = through.towards(to, 10);
      pathItems.push('L', a.x, a.y);
      pathItems.push('Q', through.x, through.y, b.x, b.y);
      from = through;
      through = to;
    }
    if (through) {
      pathItems.push('L', through.x, through.y);
    }
  } else {
    let xDist = Math.abs(from.x - points[0].x);
    if (xDist < 5) {
      pathItems.push('L', points[0].x, points[0].y);
      return pathItems.join(' ');
    }

    const to = points.shift()!;
    const y = (from.y + to.y) / 2;
    pathItems.push('C', from.x, y + 20, to.x, y - 20, to.x, to.y);
  }

  return pathItems
    .map((i) => {
      if (typeof i === 'number') return i.toFixed(1);
      return i;
    })
    .join(' ');
}

// useRandomIds will append randomness to IDs to prevent conflicts if rendering multiple patches inline into the same web page!
export function drawPatch(patch: Patcher, useRandomIds = true) {
  // make sure ids are unique if multiple patches are drawn on the same page
  const drawId = Math.random().toString(36).substring(2, 15);

  let getClipId = (obj: PatchObj) => `clip-${obj.id}`;
  if(useRandomIds) getClipId = (obj: PatchObj) => `clip-${obj.id}-${drawId}`;

  const bounds = patch.calculateBounds().toRect();
  const width = bounds.w + patch.padding * 2;
  const height = bounds.h + patch.padding * 2;

  const body: string[] = [];
  const defs: string[] = [];

  defs.push(
    `<linearGradient id="messageBg" x1="0%" y1="0%" x2="0%" y2="100%">`,
    `<stop offset="0%" style="stop-color:#555; stop-opacity:1" />`,
    `<stop offset="100%" style="stop-color:#333; stop-opacity:1" />`,
    `</linearGradient>`
  );

  for (const obj of patch.objects) {
    const { w: width, h: height } = obj.rect;
    defs.push(
      `<mask id="${getClipId(obj)}">`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"></rect>`,
      `</mask>`
    );
  }

  const portLocations = new Map<string, Point>();

  for (const obj of patch.objects) {
    const { x, y, w, h } = obj.rect;
    const clipId = getClipId(obj);

    // todo make a table of callbacks and infer this or something?
    const known = [
      'box',
      'message',
      'number',
      'button',
      'toggle',
      'flonum',
      'inlet',
      'outlet',
      'comment',
    ];

    let attrs = `transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})"`;

    if (!known.includes(obj.type)) attrs += ` opacity="0.5"`;

    body.push(`<g class="object ${obj.type}" ${attrs}>`);

    // all objects except comments have a background rect
    // fill is determined by class in the styles
    if (obj.type != 'comment') {
      body.push(
        `<rect x="0" y="0" width="${w}" height="${h}" class="bg"></rect>`
      );
    }

    if (obj.type === 'box') {
      // top and bottom accent lines
      const size = 3;
      const common = `x="0" width="${w}" height="${size}" fill="#fff3"`;
      body.push(`<rect y="0" ${common}></rect>`);
      body.push(`<rect y="${h - size}" ${common}></rect>`);
    }

    let label = '';

    const usesText = ['box', 'message', 'comment'];
    if (usesText.includes(obj.type)) label = obj.text;
    if (obj.type == 'number') label = '▶︎ 0';
    if (obj.type == 'flonum') label = '▶︎ 0.';
    if (!known.includes(obj.type)) label = obj.type;

    if (label) {
      body.push(
        `<foreignObject x="0" y="0" width="${w}" height="${h}">`,
        `<div class="label" xmlns="http://www.w3.org/1999/xhtml"><span>${label}</span></div>`,
        `</foreignObject>`
      );
    }

    if (obj.type === 'button') {
      const cx = (w / 2).toFixed(1);
      const cy = (h / 2).toFixed(1);
      body.push(
        `<circle cx="${cx}" cy="${cy}" r="6" class="fg-stroke"></circle>`
      );
    }

    if (obj.type === 'toggle') {
      const x1 = (w / 4).toFixed(1);
      const y1 = (h / 4).toFixed(1);
      const x2 = (w * (3 / 4)).toFixed(1);
      const y2 = (h * (3 / 4)).toFixed(1);
      body.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fg-stroke"></line>`,
        `<line x1="${x2}" y1="${y1}" x2="${x1}" y2="${y2}" class="fg-stroke"></line>`
      );
    }

    if (obj.type === 'inlet' || obj.type === 'outlet') {
      const cx = w / 2;
      const cy = h / 2;
      const s = 6;
      const points = [
        `${cx - s},${cy - s}`,
        `${cx + s},${cy - s}`,
        `${cx},${cy + s}`,
      ]
        .map((p) => p.replace(/\.0\b/, ''))
        .join(' ');
      body.push(`<polygon points="${points}" class="fg-fill"></polygon>`);
    }

    const portPadding = 10;
    const portArea = w - portPadding * 2;

    for (let i = 0; i < obj.inletCount; i++) {
      const portX = portPadding + (portArea / (obj.inletCount - 1 || 1)) * i;
      const portY = 0;
      const portId = `${obj.id}-i${i}`;
      const port = new Point(portX + x, portY + y);
      portLocations.set(portId, port);
      body.push(
        `<circle cx="${portX}" cy="${portY}" r="3" class="port inlet" id="${portId}" mask="url(#${clipId})"></circle>`
      );
    }

    for (let i = 0; i < obj.outletCount; i++) {
      const portX = portPadding + (portArea / (obj.outletCount - 1 || 1)) * i;
      const portY = h;
      const portId = `${obj.id}-o${i}`;
      const port = new Point(portX + x, portY + y);
      portLocations.set(portId, port);
      body.push(
        `<circle cx="${portX}" cy="${portY}" r="3" class="port outlet" id="${portId}" mask="url(#${clipId})"></circle>`
      );
    }

    body.push(`</g>`);
  }

  for (const line of patch.lines) {
    const fromId = line.fromId;
    const toId = line.toId;
    const fromPos = portLocations.get(fromId)!;
    const toPos = portLocations.get(toId)!;

    if (fromPos && toPos) {
      const linePoints: Point[] = [];

      linePoints.push(fromPos);
      if (line.midpoints.length > 0) {
        for (const point of line.midpoints) linePoints.push(point);
      }
      linePoints.push(toPos);

      const pathString = cablePath(linePoints);

      if (line.type == 'signal') {
        let color = line.color ? line.color.toString() : '#a0f3aB';
        body.push(
          `<path d="${pathString}" fill="none" stroke="${color}"  stroke-width="2" class="cable"></path>`,
          `<path d="${pathString}" fill="none" stroke="#000a"  stroke-dasharray="4" stroke-width="2" ></path>`
        );
      } else {
        let color = line.color ? line.color.toString() : '#aaa';
        body.push(
          `<path d="${pathString}" fill="none" stroke="${color}" stroke-width="2" class="cable"></path>`
        );
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<defs>${defs.join('')}</defs>`,
    `<style>${themeCss}</style>`,
    ...body,
    '</svg>',
  ].join('');
}
