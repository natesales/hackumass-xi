const average = (array) => array.reduce((a, b) => a + b) / array.length;
Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
};
const IN = 100;
const SIZE = [9 * IN, 6.5 * IN];
const PROJECTED = true;
const EDGES = [];

const KEYS = {};
let CONTROLLERS = [];

var skins = [];

let debounceTime = 150;
let BUTTONTIMERS = {};

function raycast(p, dir, base) {
  let currentColor = get(p[0], p[1])[0];
  let count = 0;
  for (; currentColor == base; currentColor = get(p[0], p[1])[0]) {
    count++;
    p[0] += dir[0];
    p[1] += dir[1];
    if (p[1] >= SIZE[1]) {
      break;
    }
  }

  return [p, count];
}

const player = {
  x: 1 * IN,
  y: 1 * IN,
  w: 2 * IN / 3,
  h: 2 * IN / 3,
  vx: 0,
  vy: 0,
  ax: 0,
  ay: 0,
  skinIndex: 0,
  grounded: false,
  update: function (dt) {
    this.ay = 0;
    this.ax = 0;

    const down = floorPoints([
      [this.x, this.y + this.h],
      [this.x + this.w/2, this.y + this.h],
      [this.x + this.w, this.y + this.h],
    ]).map((p) => {
      const cast = raycast([...p], [0, 1], 255);
      stroke("red");
      strokeWeight(5);
      point(...cast[0]);
      return cast[1];
    });

    const up = floorPoints([
      [this.x, this.y],
      [this.x + this.w/2, this.y],
      [this.x + this.w, this.y],
    ]).map((p) => {
      const cast = raycast([...p], [0, -1], 255);
      stroke("magenta");
      strokeWeight(5);
      point(...cast[0]);
      return cast[1];
    });

    const xMovement = this.vx < 0 ? -1 : this.vx > 0 ? 1 : 0;

    if (xMovement != 0) {
      const xDir = floorPoints([
        [this.x + ((xMovement + 1) * this.w), this.y],
        [this.x + ((xMovement + 1) * this.w), this.y + this.h/3],
        [this.x + ((xMovement + 1) * this.w), this.y + this.h/2],
        [this.x + ((xMovement + 1) * this.w), this.y + (2 * this.h)/3],
        [this.x + ((xMovement + 1) * this.w), this.y + this.h],
      ]).map((p) => {
        const cast = raycast([...p], [xMovement, 0], 255);
        stroke("blue");
        strokeWeight(5);
        point(...cast[0]);
        return cast[1];
      });

      const minDir = min(...xDir);

      if (minDir == 0) {
        // this.vx *= 1 - (0.95 * dt)
        this.vx = 0
      }
    }

    const minDown = min(...down);

    if (minDown > 1) {
    } else {
      this.vy = 0;
    }

    if (minDown == 1) {
      if (this.vy > 0) {
        this.vy = 0;
      }
      this.grounded = true;
    } else if (minDown > 1) {
      this.grounded = false;
      this.ay += 128 * IN * dt;
    } else if (minDown == 0) {
      this.grounded = true;
      const correction = min(...up);

      if (correction < IN) {
        this.y -= correction;

        this.vx *= 1 / (1 + dt * (correction * 2));
      }
    }

    // Keyboard input

    if (KEYS[38] && this.grounded) {
      this.vy -= 2 * IN;
    }

    const AX = 156 * IN * dt;
    let dAX = KEYS[39] ? 1 : KEYS[37] ? -1 : 0;

    var gamepads = navigator.getGamepads();
    for (let i in CONTROLLERS) {
      let controller = gamepads[i];

      if (controller.buttons) {
        for (let btn = 0; btn < controller.buttons.length; btn++) {

          if (controller.buttons[btn].pressed && btn == 6 && millis() - (BUTTONTIMERS[6]||0) > debounceTime) {
            this.skinIndex--;
            if (this.skinIndex < 0) {
              this.skinIndex = skins.length - 1;
            }
            this.skinIndex %= skins.length;
            BUTTONTIMERS[6] = millis();
          }
          if (controller.buttons[btn].pressed && btn == 7 && millis() - (BUTTONTIMERS[7]||0) > debounceTime) {
            this.skinIndex++;
            this.skinIndex %= skins.length;
            BUTTONTIMERS[7] = millis();
          }
        }
      }
      if (controller.axes) {
        for (let axis = 0; axis < controller.axes.length; axis++) {
          if (axis % 2 == 0) {
            if (dAX == 0) {
              dAX = controller.axes[axis];
            }
          }
        }
      }
    }

    if (dAX != 0) {
      if (this.vx * dAX >= 0) {
        this.ax += dAX * AX;
      } else {
        this.vx = 0;
        this.ax = 2 * dAX * AX;
      }
    }

    if (this.grounded) {
      this.vx *= 1 / (1 + dt * 1.7);
    } else {
      this.vx *= 1 / (1 + dt * 1.4);
    }

    this.vx = this.vx.clamp(-IN * 2, 2 * IN);

    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  },
  render: function () {
    image(skins[this.skinIndex], this.x, this.y, this.w, this.h);
  },
};

const floorPoints = (points) => {
  for (const p of points) {
    for (const i in p) {
      p[i] = Math.floor(p[i]);
    }
  }

  return points;
}

function preload() {
  skins = [
    loadImage("./skins/alien.png"),
    loadImage("./skins/fish.png"),
    loadImage("./skins/flower.png"),
    loadImage("./skins/frog.png"),
    loadImage("./skins/ladybug.png"),
    loadImage("./skins/penguin.png"),
    loadImage("./skins/purple_guy.png"),
    loadImage("./skins/snake.png"),
    loadImage("./skins/tiger.png"),
  ];
}

function setup() {
  window.addEventListener("gamepadconnected", function (e) {
    CONTROLLERS[e.gamepad.index] = e.gamepad;
    console.log(
      "Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index,
      e.gamepad.id,
      e.gamepad.buttons.length,
      e.gamepad.axes.length
    );
  });
  createCanvas(windowWidth, windowHeight);
  background(255);
  frameRate(60);


  if (!PROJECTED) {
    EDGES.push([0, 0]);
    EDGES.push([SIZE[0], 0]);
    EDGES.push([SIZE[0], SIZE[1]]);
    EDGES.push([0, SIZE[1]]);
  }
}

function mousePressed() {
  if (EDGES.length === 4) {
    return;
  }
  EDGES.push([mouseX, mouseY]);
}

function keyPressed() {
  KEYS[keyCode] = true;
}
function keyReleased() {
  KEYS[keyCode] = false;
}

const mouseSpots = [];

renderLevel = () => {
  stroke(0);
  strokeWeight(IN / 4);
  line(0.8 * IN, 2.5 * IN, 3.1 * IN, 2.5 * IN);
  line(3.8 * IN, 3.5 * IN, 5.4 *  IN, 3.5 * IN)
  line(6.9 * IN, 2.3 * IN, 9 * IN, 2.3 * IN)
  line(9.8 * IN, 3.5 * IN, 13 * IN, 6.8 * IN)
};


function draw() {
  background(255);
  noSmooth();

  renderLevel();

  for (const p of mouseSpots) {
    fill(0);
    stroke(0);
    strokeWeight(IN / 4);
    point(...p);
  }

  //

  // if (mouseDown) {
  //   mouseSpots.push([mouseX, mouseY]);
  // }

  player.update(deltaTime / 1000);

  if (EDGES.length == 4){
    background(0);
    stroke(0);
    strokeWeight(4);
    fill(255);
  
    beginShape();
    for (const [x, y] of EDGES) {
      vertex(x, y);
    }
    endShape(CLOSE);

    const [tl, tr, br, bl] = EDGES;

    const w = dist(tl[0], tl[1], tr[0], tr[1]);
    const h = dist(tl[0], tl[1], bl[0], bl[1]);

    const dx = tl[0];
    const dy = tl[1];

    const sx = w / width;
    const sy = h / height;

    translate(dx, dy);
    scale(sx, sy);
  }

  // renderLevel();

  player.render();
  resetMatrix();
}
