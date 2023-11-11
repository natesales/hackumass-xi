const average = (array) => array.reduce((a, b) => a + b) / array.length;
Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
};

const IN = 100;
const SIZE = [11 * IN, 8.5 * IN];
const PROJECTED = true;

let mouseDown = false;
let lastPos = null;

const KEYS = {};
let CONTROLLERS = [];

var skins = [];

let debounceTime = 150;
let BUTTONDEBOUNCE = {};

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
  w: IN / 2,
  h: IN / 2,
  vx: 0,
  vy: 0,
  ax: 0,
  ay: 0,
  skinIndex: 0,
  grounded: false,
  update: function (dt) {
    this.ay = 0;
    this.ax = 0;

    const points = this.getPOI();

    const down = points.map((p) => {
      const cast = raycast([...p], [0, 1], 255);
      stroke("red");
      strokeWeight(5);
      point(...cast[0]);
      return cast[1];
    });

    const up = points.map((p) => {
      const cast = raycast([...p], [0, -1], 255);
      stroke("magenta");
      strokeWeight(5);
      point(...cast[0]);
      return cast[1];
    });

    const xMovement = this.vx < 0 ? -1 : this.vx > 0 ? 1 : 0;

    if (xMovement != 0) {
      const xDir = points.map((p) => {
        const cast = raycast([...p], [xMovement, 0], 255);
        stroke("blue");
        strokeWeight(5);
        point(...cast[0]);
        return cast[1];
      });

      const minDir = min(...xDir);

      if (minDir == 0) {
        // this.vx *= 1 - (0.95 * dt)
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
    const AX = 96 * IN * dt;
    let dAX = KEYS[39] ? 1 : KEYS[37] ? -1 : 0;

    var gamepads = navigator.getGamepads();
    for (let i in CONTROLLERS) {
      let controller = gamepads[i];

      prevTime += dt;

      if (controller.buttons) {
        for (let btn = 0; btn < controller.buttons.length; btn++) {

          if (controller.buttons[btn].pressed && btn == 6 && millis() - (BUTTONDEBOUNCE[6]||0) > debounceTime) {
            this.skinIndex--;
            if (this.skinIndex < 0) {
              this.skinIndex = skins.length - 1;
            }
            this.skinIndex %= skins.length;
            BUTTONDEBOUNCE[6] = millis();
          }
          if (controller.buttons[btn].pressed && btn == 7 && millis() - (BUTTONDEBOUNCE[7]||0) > debounceTime) {
            this.skinIndex++;
            this.skinIndex %= skins.length;
            BUTTONDEBOUNCE[7] = millis();
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
  getPOI: function () {
    const points = [
      [this.x, this.y + this.h], // bottom left
      [this.x + this.w / 2, this.y + this.h], // bottom middle
      [this.x + this.w, this.y + this.h], // bottom right
      [this.x, this.y + this.h / 2],
      [this.x + this.w / 2, this.y + this.h / 2],
      [this.x + this.w, this.y + this.h / 2],
    ];

    for (const p of points) {
      for (const i in p) {
        p[i] = Math.floor(p[i]);
      }
    }

    return points;
  },
  render: function () {
    // fill(this.grounded ? "green" : "red");
    // noStroke();
    // rect(this.x, this.y, this.w, this.h);
    //instead of rect use image
    image(skins[this.skinIndex], this.x, this.y, this.w, this.h);
  },
};

function preload() {
  skins = [
    loadImage("./skins/fish.png"),
    loadImage("./skins/frog.png"),
    loadImage("./skins/ghost.png"),
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
  createCanvas(...SIZE);
  background(255);
  frameRate(60);
}

function mousePressed() {
  lastPos = null;
  mouseDown = true;
}

function mouseReleased() {
  lastPos = null;
  mouseDown = false;
}

function keyPressed() {
  KEYS[keyCode] = true;
}
function keyReleased() {
  KEYS[keyCode] = false;
}

const mouseSpots = [];

function draw() {
  background(255);
  noSmooth();

  stroke(0);
  strokeWeight(IN / 4);

  line(0.5 * IN, 2.5 * IN, 2 * IN, 2.5 * IN);

  line(2.0 * IN, 2.5 * IN, 4 * IN, 4.5 * IN);

  line(4 * IN, 4.5 * IN, 8 * IN, 3 * IN);

  for (const p of mouseSpots) {
    fill(0);
    stroke(0);
    strokeWeight(IN / 4);
    point(...p);
  }

  //
  loadPixels();

  // if (mouseDown) {
  //   mouseSpots.push([mouseX, mouseY]);
  // }

  player.update(deltaTime / 1000);

  if (PROJECTED) {
    background(255);
  }

  player.render();
}
