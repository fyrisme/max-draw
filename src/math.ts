export class Color {
  constructor(public r = 0, public g = 0, public b = 0, public a = 1) {}

  toString() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}

export class Point {
  constructor(public x: number, public y: number) {}

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  get norm() {
    const len = this.length;

    if (len === 0) return new Point(0, 0);
    return new Point(this.x / len, this.y / len);
  }

  sub(other: Point) {
    return new Point(this.x - other.x, this.y - other.y);
  }

  towards(other: Point, dist: number) {
    const dir = other.sub(this).norm;
    return new Point(this.x + dir.x * dist, this.y + dir.y * dist);
  }
}

export function numbersToPoints(values: number[]) {
  const clone = [...values];
  const points: Point[] = [];
  while (clone.length) {
    const x = clone.shift()!;
    const y = clone.shift()!;
    points.push(new Point(x, y));
  }
  return points;
}

export class Rect {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0
  ) {}
}

export class Bounds {
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;

  includePoint(x: number, y: number) {
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
  }

  includeRect(rect: Rect) {
    this.includePoint(rect.x, rect.y);
    this.includePoint(rect.x + rect.width, rect.y + rect.height);
  }

  toRect() {
    return new Rect(
      this.minX,
      this.minY,
      this.maxX - this.minX,
      this.maxY - this.minY
    );
  }
}
