import { drawBody } from './pose.js';

// collision groups
export const
    OTHER = Math.pow(2,1),
    BODY_PARTS = Math.pow(2,2);

export class World {
  constructor() {
    this.world = new p2.World({
      // supply some slight downwards gravity
      gravity: [0, -1],
    });

    // This is the ratio of p2 units to canvas pixels & controls how big the
    // world shapes appear on the canvas.
    this.zoom = 50;
  }

  animate(canvas) {
    // To animate the bodies, we must step the world forward in time, using a
    // fixed time step size. The World will run substeps and interpolate
    // automatically for us, to get smooth animation.
    const fixedTimeStep = 1 / 60;  // seconds
    const maxSubSteps = 10;  // Max sub steps to catch up with the wall clock
    let lastTime;

    // Animation loop
    const animatePuppet = async (time) => {
      window.requestAnimationFrame(animatePuppet);

      // Compute elapsed time since last render frame
      let deltaTime = lastTime ? (time - lastTime) / 1000 : 0;

      // Move bodies forward in time
      this.world.step(fixedTimeStep, deltaTime, maxSubSteps);

      // Render
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      const ctx = canvas.getContext("2d");
      const [w, h] = [canvas.width, canvas.height];
      ctx.clearRect(0, 0, w, h);

      // Use the p2 coordinate system
      ctx.save();
      ctx.translate(w / 2, h / 2);  // Translate to the center
      ctx.scale(this.zoom, -this.zoom);   // Zoom in and flip y axis

      // Sort bodies by z-index to ensure they're drawn correctly.
      const bodies = this.world.bodies.sort((a, b) => a.zIndex - b.zIndex);

      // And draw!
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        drawBody(body, ctx);
      }

      lastTime = time;
      ctx.restore();
    };

    window.requestAnimationFrame(animatePuppet);
  }
}