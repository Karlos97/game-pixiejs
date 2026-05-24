import { Container, Graphics } from "pixi.js";
import gsap from "gsap";

export interface ParticleBurstOptions {
  x: number;
  y: number;
  count?: number;
  colors?: number[];
  spread?: number;
  duration?: number;
}

const DEFAULT_COLORS = [0xffd700, 0xffec99, 0xf39c12, 0xffffff];

export function burstParticles(parent: Container, opts: ParticleBurstOptions): void {
  const {
    x,
    y,
    count = 30,
    colors = DEFAULT_COLORS,
    spread = 300,
    duration = 1.4,
  } = opts;

  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;
    const radius = 3 + Math.random() * 3;
    const particle = new Graphics();
    particle.circle(0, 0, radius);
    particle.fill({ color });

    particle.position.set(x, y);
    particle.alpha = 1;
    particle.scale.set(0);
    parent.addChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const distance = spread * (0.45 + Math.random() * 0.55);
    const tx = x + Math.cos(angle) * distance;
    const ty = y + Math.sin(angle) * distance;
    const rotation = (Math.random() - 0.5) * Math.PI * 4;

    gsap.fromTo(
      particle.scale,
      { x: 0, y: 0 },
      {
        x: 1,
        y: 1,
        duration: 0.12,
        ease: "back.out(2)",
        onComplete: () => {
          gsap.to(particle.scale, {
            x: 0,
            y: 0,
            duration: duration - 0.12,
            ease: "power2.in",
          });
        },
      },
    );

    gsap.to(particle, {
      x: tx,
      y: ty,
      rotation,
      alpha: 0,
      duration,
      ease: "power2.out",
      onComplete: () => {
        if (particle.parent) {
          particle.parent.removeChild(particle);
        }
        particle.destroy();
      },
    });
  }
}
