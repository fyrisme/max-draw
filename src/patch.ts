import { Bounds, Color, numbersToPoints, Point, Rect } from './math';

export type PatchObjType = 'box' | 'message' | 'number' | 'button' | 'toggle' | 'flonum' | 'inlet' | 'outlet';

export interface PatchObj {
  type: PatchObjType;
  text: string;
  rect: Rect;
  id: string;
  inletCount: number;
  outletCount: number;
  outletTypes: string[];
}

export interface PatchLine {
  fromId: string;
  toId: string;
  type?: string;
  midpoints: Point[];
  color?: Color;
}

export class Patch {
  objects: PatchObj[] = [];
  lines: PatchLine[] = [];
  padding = 10;

  calculateBounds() {
    const bounds = new Bounds();
    for (const obj of this.objects) bounds.includeRect(obj.rect);
    for (const line of this.lines) {
      for (const point of line.midpoints) bounds.includePoint(point.x, point.y);
    }
    return bounds;
  }

  crop() {
    const bounds = this.calculateBounds();
    const rect = bounds.toRect();
    for (const obj of this.objects) {
      obj.rect.x -= rect.x - this.padding;
      obj.rect.y -= rect.y - this.padding;
    }
    for (const line of this.lines) {
      for (const point of line.midpoints) {
        point.x -= rect.x - this.padding;
        point.y -= rect.y - this.padding;
      }
    }
  }

  static parse(data: any): Patch {
    const patch = new Patch();

    // handle objects
    for (const { box } of data.boxes) {
      const [x, y, width, height] = box.patching_rect;
      const rect = new Rect(x, y, width, height);
      let type = box.maxclass;
      if (type === 'newobj') type = 'box';
      const obj: PatchObj = {
        type,
        text: box.text || '',
        id: box.id,
        inletCount: box.numinlets || 0,
        outletCount: box.numoutlets || 0,
        outletTypes: box.outlettype || [],
        rect,
      };
      patch.objects.push(obj);
    }

    // handle connections
    for (const rawline of data.lines || []) {
      const patchLine = rawline.patchline;
      if (patchLine) {
        const { source, destination, midpoints: rawMidpoints } = patchLine;
        const fromId = `${source[0]}-o${source[1]}`;
        const toId = `${destination[0]}-i${destination[1]}`;

        const sourceObj = patch.objects.find((obj) => obj.id === source[0]);
        const type = sourceObj?.outletTypes[source[1]] || '';

        const midpoints = rawMidpoints ? numbersToPoints(rawMidpoints) : [];

        let color: Color | undefined;
        if (patchLine.color) {
          const [r, g, b, a] = patchLine.color;
          color = new Color(r * 256, g * 256, b * 256, a);
        }

        const line: PatchLine = { fromId, toId, color, midpoints, type };
        patch.lines.push(line);
      }
    }
    return patch;
  }
}
