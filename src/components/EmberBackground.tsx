import { useEffect, useRef } from "react";
import styled from "styled-components";

const Canvas = styled.canvas`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
  pointer-events: none;
`;

const Vignette = styled.div`
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(232, 100, 42, 0.1), transparent 60%),
    radial-gradient(60% 50% at 50% 100%, rgba(123, 92, 255, 0.08), transparent 60%),
    radial-gradient(120% 120% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.7) 100%);
`;

interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function EmberBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const particles: Particle[] = [];
    const COUNT = Math.min(90, Math.floor(window.innerWidth / 16));

    const spawn = (initial = false): Particle => {
      const maxLife = 200 + Math.random() * 260;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 10,
        vy: -(0.2 + Math.random() * 0.7),
        vx: (Math.random() - 0.5) * 0.4,
        size: 0.6 + Math.random() * 2.4,
        life: 0,
        maxLife,
        hue: 20 + Math.random() * 30,
      };
    };

    for (let i = 0; i < COUNT; i++) particles.push(spawn(true));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx + Math.sin(p.life * 0.02) * 0.3;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const alpha = Math.sin(t * Math.PI) * 0.7;
        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = spawn();
          continue;
        }
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 65%, ${alpha})`);
        grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <Canvas ref={ref} />
      <Vignette />
    </>
  );
}
