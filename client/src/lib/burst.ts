import { prefersReducedMotion } from './motion';

const PARTICLES = 12;
const BURST_MS = 600;
/** Vàng · đỏ máu · ngà — demo 07 (.wish --burst) */
const COLORS = ['#e2c48f', '#8e2b2b', '#efe8dc'];

/** Pháo hoa nhỏ 12 hạt bung ra từ tâm phần tử (demo 07: BS.toggleWish khi thả tim) */
export function burst(el: Element) {
  if (prefersReducedMotion()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < PARTICLES; i++) {
    const p = document.createElement('span');
    Object.assign(p.style, {
      position: 'fixed',
      zIndex: '9999',
      pointerEvents: 'none',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: COLORS[i % COLORS.length],
      left: `${r.left + r.width / 2 - 4}px`,
      top: `${r.top + r.height / 2 - 4}px`,
    });
    document.body.append(p);
    const angle = (i / PARTICLES) * Math.PI * 2;
    const dist = 26 + Math.random() * 18;
    p.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist}px) scale(0)`,
          opacity: 0,
        },
      ],
      { duration: BURST_MS, easing: 'cubic-bezier(.2,.8,.3,1)' },
    ).onfinish = () => p.remove();
  }
}
