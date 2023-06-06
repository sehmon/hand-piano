import p5 from 'p5';

// Expanding circle class
export class ExpandingLines {
  constructor(
    private p: p5,
    private x: number,
    private y: number,
    private width: number,
    private maxR: number,
    private hexColor: string,
    private life: number,
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.maxR = maxR;
    this.hexColor = hexColor;
    this.life = life;
  }

  getWidth() {
    return this.width;
  }

  maxRadius() {
    return this.maxR;
  }

  decreaseLife() {
    this.life -= 2;
  }

  getLife() {
    return this.life;
  }

  update() {
    this.decreaseLife();
    let c = this.p.color(this.hexColor);
    c.setAlpha((this.life/200)*255);
    this.p.fill(c);
    this.p.noStroke();
    this.p.rectMode(this.p.CENTER);
    this.p.rect(this.x, this.y, this.width, this.p.windowHeight);
  }
}