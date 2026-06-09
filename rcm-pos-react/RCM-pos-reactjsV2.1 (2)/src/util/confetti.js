import confetti from "canvas-confetti";
import { randomInRange } from "../config/util";

function realistic() {
  const count = 200;
  const defaults = {
    origin: {
      //x: Math.random(),
      // since they fall down, start a bit higher than random
      //y: Math.max(0, Math.random() - 0.2)
      //x: 0.5,
      //y: 0.7
      x: randomInRange(0.6, 0.8),
      y: randomInRange(0.7, 0.8),
    },
  };

  function fire(particleRatio, opts) {
    confetti(
      Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio),
      }),
    );
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    zIndex: 1000,
  });
  fire(0.2, {
    spread: 60,
    zIndex: 1000,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    zIndex: 1000,
  });

  //commented below to reduce the spread & quantity
  /*fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    zIndex: 1000
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    zIndex: 1000
  });*/
}

function fireworks() {
  const duration = 1.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
  const particleCount = 170; // * (timeLeft / duration);

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    // since particles fall down, start a bit higher than random
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      }),
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      }),
    );
  }, 400);
}

export { realistic, fireworks };
