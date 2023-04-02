const WorldCamera = {
  x: 0,
  y: 0
}

class Vector2D {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    return new Vector2D(this.x + vector.x, this.y + vector.y);
  }

  minus(vector) {
    return new Vector2D(this.x - vector.x, this.y - vector.y);
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

class Vector3D {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  plus(vector) {
    return new Vector3D(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  minus(vector) {
    return new Vector3D(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}

class Line {

  color = "red";

  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  draw(context) {
    context.strokeStyle = this.color;
    // make line width 2 pixels
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(this.start.x + WorldCamera.x, this.start.y + WorldCamera.y);
    context.lineTo(this.end.x + WorldCamera.x, this.end.y + WorldCamera.y);
    context.stroke();
  }

}

class World {
  constructor() {
    this.sprites = [];
  }

  add(sprite) {
    this.sprites.push(sprite);
  }

  update() {
    for (let sprite of this.sprites) {
      sprite.update();
    }
  }

  draw(context) {
    for (let sprite of this.sprites) {
      sprite.update()
      sprite.draw(context);
    }
  }

  lineintersect(line1, line2) {

    let info = {
      hit: false,
      hitPoint: null,
    }

    let x1 = line1.start.x;
    let y1 = line1.start.y;
    let x2 = line1.end.x;
    let y2 = line1.end.y;

    let x3 = line2.start.x;
    let y3 = line2.start.y;
    let x4 = line2.end.x;
    let y4 = line2.end.y;

    let denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));

    if (denominator == 0) {
      return info;
    }

    let ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
    let ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      info.hit = true;
      info.hitPoint = new Vector2D(x1 + (ua * (x2 - x1)), y1 + (ua * (y2 - y1)));
    }

    return info;

  }

}

function DegToRad(deg) {
  return deg * Math.PI / 180;
}

class BasicSprite {

  points = [];
  DefaultPoints = [];
  lines = [];

  solid = false;

  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.angle = 0;

    this.DefaultPoints.push(new Vector2D(-this.width / 2, -this.height / 2));
    this.DefaultPoints.push(new Vector2D(this.width / 2, -this.height / 2));
    this.DefaultPoints.push(new Vector2D(this.width / 2, this.height / 2));
    this.DefaultPoints.push(new Vector2D(-this.width / 2, this.height / 2));

    for (let i = 0; i < this.DefaultPoints.length; i++) {
      this.points.push(new Vector2D(this.DefaultPoints[i].x, this.DefaultPoints[i].y));
    }

    this.lines.push(new Line(this.points[0], this.points[1]));
    this.lines.push(new Line(this.points[1], this.points[2]));
    this.lines.push(new Line(this.points[2], this.points[3]));
    this.lines.push(new Line(this.points[3], this.points[0]));

  }

  update() {

    for (let i = 0; i < this.DefaultPoints.length; i++) {
      let point = this.DefaultPoints[i];

      let Angle = Math.atan2(point.y, point.x);
      let Distance = Math.sqrt(point.x * point.x + point.y * point.y);

      this.points[i].x = this.x + Math.cos(Angle + this.angle) * Distance;
      this.points[i].y = this.y + Math.sin(Angle + this.angle) * Distance;

    }

    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i].start = this.points[i];
      this.lines[i].end = this.points[(i + 1) % this.points.length];
    }

  }

  draw(context) {

    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(this.points[0].x + WorldCamera.x, this.points[0].y + WorldCamera.y);
    for (let i = 1; i < this.points.length; i++) {
      context.lineTo(this.points[i].x + WorldCamera.x, this.points[i].y + WorldCamera.y);
    }
    context.closePath();
    context.fill();

  }
}

class Car extends BasicSprite {

  id = "car"

  constructor(x, y, width, height, color, speed) {
    super(x, y, width, height, color);
    this.speed = speed;
    this.angle = 0;
    this.velocity = 0
    this.turnSpeed = 0.1;
  }

  carUpdate(world) {

    let collutl = new CollisionDetection();

    this.x += Math.cos(this.angle) * this.velocity;
    this.y += Math.sin(this.angle) * this.velocity;

    this.velocity *= 0.99;
  }

  accelerate() {
    this.velocity += this.speed
  }

  decelerate() {
    this.velocity -= this.speed
  }

  turnLeft() {
    this.angle -= this.turnSpeed;
  }

  turnRight() {
    this.angle += this.turnSpeed;
  }

}

class Button extends BasicSprite {

  id = "button"

  constructor(x, y, width, height, color, text, callback, hoverColor, textColor) {
    super(x, y, width, height, color);
    this.text = text;
    this.callback = callback;
    this.normalColor = color;
    this.hoverColor = hoverColor;
    this.textColor = textColor;

    this.hover = false;
    this.click = false;
    this.enabled = true;
    this.screenSpace = true;

  }

  update() {
    super.update();

    if (this.hover) {
      this.color = this.hoverColor;
    } else {
      this.color = this.normalColor;
    }

    // mouse position = MousePos

    let mousePos = new Vector2D(MousePos.x, MousePos.y);

    if (this.enabled == false) {
      this.hover = false;
      this.click = false;
      return;
    }
    if (mousePos.x > this.points[0].x && mousePos.x < this.points[1].x && mousePos.y > this.points[0].y && mousePos.y < this.points[3].y) {

      this.hover = true;

      if (MouseButtons.x == 0) {
        this.click = false;
      }

      if (MouseButtons.x == 1 && this.click == false) {
        this.mouseDown();
        this.click = true;
        MouseButtons.x = 2;
      }

    } else {
      this.hover = false;
    }

  }

  draw(context) {

    if (this.enabled == false) return

    // draw rect and make sure its centerd vertically and horizontally
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      context.lineTo(this.points[i].x, this.points[i].y);
    }
    context.closePath();
    context.fill();


    // draw the text and make sure its centerd vertically and horizontally
    context.fillStyle = this.textColor;
    context.font = "20px Arial";
    context.textAlign = "center";

    let textWidth = context.measureText(this.text).width;
    let textHeight = context.measureText("M").width;

    context.fillText(this.text, this.x, this.y + textHeight / 2);

  }

  mouseDown() {
    this.callback();
  }
}


class CollisionDetection {

  constructor() { }

  rayCast(world, start, end) {

    let ray = {
      hit: false,
      start: start,
      end: end,
      hitPoint: null,
      hitSprite: null
    }

    let intersectionPoints = [];

    let line = new Line(start, end);
    for (let sprite of world.sprites) {
      for (let line2 of sprite.lines) {
        let Intersect = world.lineintersect(line, line2);
        if (Intersect.hit) {
          intersectionPoints.push({ point: Intersect.hitPoint, sprite: sprite });
        }
      }
    }

    intersectionPoints.sort((a, b) => {
      let distA = Math.sqrt(Math.pow(a.point.x - start.x, 2) + Math.pow(a.point.y - start.y, 2));
      let distB = Math.sqrt(Math.pow(b.point.x - start.x, 2) + Math.pow(b.point.y - start.y, 2));
      return distA - distB;
    });

    if (intersectionPoints.length > 0) {
      ray.hit = true;
      ray.hitPoint = intersectionPoints[0].point;
      ray.hitSprite = intersectionPoints[0].sprite;
    }

    return ray;
  }

}

let StartingPosition = new Vector2D(500, 500);
let StartingAngle = 0;

class CompeativeNeuralNetwork {

  score = 0;
  disqualifyed = false;
  fitness = 0;

  checkPoint = 0;

  car = new Car(CarStartingX, CarStartingY, 100, 50, "blue", 0.1);

  constructor(nn) {
    this.nn = nn;
    this.car.x = StartingPosition.x;
    this.car.y = StartingPosition.y;
  }

  update() {
    this.car.carUpdate(GameWorld);
    this.car.update();
    this.car.draw(ctx);
  }

  act(ctx) {

    if (this.disqualifyed) return

    let input = []

    for (let i = 0; i < 10; i++) {
      let start = new Vector2D(this.car.x + Math.cos(this.car.angle) * 50, this.car.y + Math.sin(this.car.angle) * 50);
      let AngleDiff = 180 / 10
      let RayAngle = this.car.angle + DegToRad((AngleDiff * 5) - AngleDiff * i);
      let end = new Vector2D(this.car.x + Math.cos(RayAngle) * 500, this.car.y + Math.sin(RayAngle) * 500);
      let CarRay = CollisionUtils.rayCast(GameWorld, start, end);

      let DebugLine = new Line(start, end);
      DebugLine.color = "green";
      if (DebugVision){
        if (CarRay.hit) {
          DebugLine.end = CarRay.hitPoint;
          DebugLine.color = "red";
        }
        DebugLine.draw(ctx);
      }

      if (CarRay.hitPoint == null) {
        CarRay.hitPoint = new Vector2D(end.x, end.y);
      }
      let Distance = Math.sqrt((CarRay.hitPoint.x - start.x) * (CarRay.hitPoint.x - start.x) + (CarRay.hitPoint.y - start.y) * (CarRay.hitPoint.y - start.y));
      input[i] = Distance / 500;
    }

    let output = this.nn.predict(input);

    if (output[0] > 0.5) {
      this.car.accelerate();
    }
    if (output[1] > 0.5) {
      //this.car.decelerate();
    }
    if (output[2] > 0.5) {
      this.car.turnLeft();
    }
    if (output[3] > 0.5) {
      this.car.turnRight();
    }

  }

}

class LevelEditorPoint {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = DegToRad(angle);
    this.width = 300;

    this.innerPoint = new Vector2D(0, 0);
    this.outerPoint = new Vector2D(0, 0);
  }
}