const average = array => array.reduce((a, b) => a + b) / array.length;
const IN = 100
const SIZE = [11 * IN, 8.5 * IN]
const PROJECTED = false;

let mouseDown = false;
let lastPos = null;

const KEYS = {}
let CONTROLLERS = []

function raycast(p, dir){
  let currentColor = get(p[0], p[1])[0];
  let count = 0;
  for (; currentColor == 255; currentColor = get(p[0], p[1])[0]) {
    count++;
    p[0] += dir[0];
    p[1] += dir[1];
    if (p[1] >= SIZE[1]){
      break;
    }
  }
  
  return [p, count];
}

const player = {
  x: 1 * IN,
  y: 1 * IN,
  w: IN/4,
  h: IN/2,
  vx: 0,
  vy: 0,
  ax: 0,
  ay: 0,
  grounded: false,
  update: function(dt){
    this.ay = 0;
    this.ax = 0;
    
    
    const points = this.getPOI();
    
    const distances = points.map(p => {
      const cast = raycast([...p], [0, 1]);
      stroke("red");
      strokeWeight(5)
      point(...cast[0]);
      return cast[1];
    });
    
    const up = points.map(p => {
      const cast = raycast([...p], [0, -1]);
      stroke("blue");
      strokeWeight(5)
      point(...cast[0]);
      return cast[1];
    });
    
    const middleDist = min(...distances)
    
    if (middleDist > 1) {
    } else {
      this.vy = 0;
    }
    
    if (middleDist == 1) {
      if (this.vy > 0){
        this.vy = 0;
      }
      this.grounded = true;
    } else if (middleDist > 1) {
      this.grounded = false;
      this.ay += 128 * IN * dt;
    } else if (middleDist == 0) {
      this.grounded = true;
      const correction = min(...up);
      
      if (correction < IN){
        this.y -= correction;
      }
    }
    
    // Keyboard input
    const AX = 96 * IN * dt;
    if (KEYS[39]){
      this.ax += AX;
    }    
    if (KEYS[37]){
      this.ax -= AX;
    }
    
    var gamepads = navigator.getGamepads()
    for (let i in CONTROLLERS) { 
      let controller=gamepads[i]

      if (controller.buttons) {
        for (let btn=0;btn<controller.buttons.length;btn++) {

          // //button operations/checking HERE:
          // if(controller.buttons[btn].pressed) {
          //   print ("pushed button value " + btn)
          // }
        }
      }
      if (controller.axes) {
        for (let axis=0;axis<controller.axes.length;axis++) {

          if(axis%2 == 0) {
            this.ax += controller.axes[axis] * AX;
          } else {
            // this.ay += controller.axes[axis] * 64 * IN;
          }
        }
      }
    }
    
    
    if (this.grounded) {
      this.vx *= 1 - (0.94 * dt);
    }
    
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
  },
  getPOI: function() {
    const points = [
      [this.x, this.y + this.h],
      [this.x + this.w/2, this.y + this.h],
      [this.x + this.w, this.y + this.h]
    ]
    
    for (const p of points){
      for (const i in p){
        p[i] = Math.floor(p[i])
      }
    }
    
    return points;
  },
  render: function() {
    fill(this.grounded ? "green" : "red");
    noStroke()
    rect(this.x, this.y, this.w, this.h)
    
    const points = this.getPOI();

    for (const p of points){
      stroke(0);
      strokeWeight(5)
      point(...p)
    }
  }
}

function setup() {
  window.addEventListener("gamepadconnected", function(e) {
    CONTROLLERS[e.gamepad.index] = e.gamepad
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
    e.gamepad.index, e.gamepad.id,
    e.gamepad.buttons.length, e.gamepad.axes.length);      
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

const mouseSpots = []

function draw() {
  background(255);
  
  stroke(0);
  strokeWeight(IN/4);
  
  line(0.5 * IN, 2.5 * IN, 2 * IN, 2.5 * IN);
  
  line(2.0 * IN, 2.5 * IN, 4 * IN, 4.5 * IN);
  
  for (const p of mouseSpots){
    fill(0)
    stroke(0);
    strokeWeight(IN/4)
    point(...p)
  }
  
  //
  loadPixels();
  
  if (mouseDown) {
    mouseSpots.push([mouseX, mouseY])
  }
  
  player.update(deltaTime/1000);
  
  if (PROJECTED) background(255);
  
  player.render();
}