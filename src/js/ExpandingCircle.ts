import p5 from 'p5';

// Expanding circle class
export class ExpandingCircle {
  constructor(
    private p: p5,
    private x: number,
    private y: number,
    private r: number,
    private maxR: number,
    private hexColor: string,
  ) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.maxR = maxR;
    this.hexColor = hexColor;
  }

  radius() {
    return this.r;
  }

  maxRadius() {
    return this.maxR;
  }

  increaseRadius() {
    this.r += 20;
  }

  update() {
    this.increaseRadius();
    let c = this.p.color(this.hexColor);
    c.setAlpha(Math.max(0, (this.maxR - this.r) / this.maxR) * 255);
    this.p.fill(c);
    this.p.noStroke();
    this.p.circle(this.x, this.y, this.r);
  }
}