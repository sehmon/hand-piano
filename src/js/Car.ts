import p5 from 'p5';

// Expanding circle class
export class Car {
  constructor(
    private p: p5,
    private x: number,
    private y: number,
    private width: number,
    private hexColor: string,
    private speed: number,
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.hexColor = hexColor;
    this.speed = speed;
  }

  getWidth() {
    return this.width;
  }

  move() {
    this.x += this.speed;
  }

  getX() {
    return this.x;
  }

  update() {
    this.move();
    let c = this.p.color(this.hexColor);
    c.setAlpha((this.p.width-this.x/this.p.width) * 255);
    this.p.fill(c);
    this.p.noStroke();
    this.p.rectMode(this.p.CENTER);
    this.p.rect(this.x, this.y, this.width, 600);
  }
}