import React, { useState, useRef, useCallback, useEffect } from 'react';

/* 3 chefs, 3 sala; só imagens chef* e sala* (sem equipe). Cada um: img + imgHover (pode ser .avif). */
const TEAM = [
  { name: 'Kenji Tanaka', role: 'Executive Chef', phrase: 'A tradição japonesa encontra a precisão em cada corte.', img: './imgs/chef1.jpg', imgHover: './imgs/chef1-1.jpg' },
  { name: 'Maria Santos', role: 'Sous-chef', phrase: 'Cada prato conta uma história de equilíbrio e frescura.', img: './imgs/chef-2.avif', imgHover: './imgs/chef2-1.jpg' },
  { name: 'André Costa', role: 'Head Sushi Chef', phrase: 'O sushi é arte que se prova.', img: './imgs/chef3.jpg', imgHover: './imgs/chef3-1.avif' },
  { name: 'Ricardo Alves', role: 'Sommelier', phrase: 'O sake e o sushi elevam-se mutuamente.', img: './imgs/sala2.jpg', imgHover: './imgs/sala2-1.jpg' },
  { name: 'Tomás Ferreira', role: 'Gestor de Sala', phrase: 'Cada detalhe do serviço reflete o nosso padrão.', img: './imgs/sala3.jpg', imgHover: './imgs/sala3-1.avif' },
];

const SEGMENT = {
  SOBRE: 0.12,
  EQUIPE_TITLE: 0.18,
  REVEAL_AT_CENTER: 0.125, /* frase aparece logo quando o bloco entra ao centro (antes da área dos pros) */
  TRANSITION: 0.26,
  IMAGES: 1,
};

const WHEEL_SPEED = 0.00042;
const WHEEL_SPEED_TITLE_PHASE = 0.00042 * 0.28; /* pausa suave no título, mas scroll rolável */
const LERP = 0.32;
const ENTER_THRESHOLD_PX = 380;
const EXIT_DURATION_MS = 1200;
const EXIT_SCROLL_THRESHOLD = 140;

export default function App() {
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const hasFocusedRef = useRef(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const maxSteps = isMobile ? Math.max(0, TEAM.length - 1) : Math.max(0, TEAM.length - 3);
  progressRef.current = progress;
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const exitScrollAccumRef = useRef(0);
  exitingRef.current = exiting;
  const titlePhase = progress >= SEGMENT.SOBRE && progress < SEGMENT.TRANSITION;
  const [titleSlideUp, setTitleSlideUp] = useState(24);
  const titleRevealedRef = useRef(false);
  useEffect(() => {
    if (titlePhase && titleSlideUp > 0) {
      const raf = requestAnimationFrame(() => setTitleSlideUp(0));
      return () => cancelAnimationFrame(raf);
    }
    if (!titlePhase) setTitleSlideUp(24);
  }, [titlePhase, titleSlideUp]);
  const [titleRevealed, setTitleRevealed] = useState(false);
  useEffect(() => {
    if (progress >= SEGMENT.REVEAL_AT_CENTER && !titleRevealedRef.current) {
      titleRevealedRef.current = true;
      setTitleRevealed(true);
    }
  }, [progress]);

  // Ao entrar na área, focar a secção no topo do viewport para o scroll/wheel funcionar logo
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const section = el.closest('#sobre');
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        const top = entry.boundingClientRect.top;
        if (top < 0 || top > ENTER_THRESHOLD_PX || progressRef.current >= 1) return;
        if (hasFocusedRef.current) return;
        hasFocusedRef.current = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (progress >= 1) hasFocusedRef.current = false;
  }, [progress]);

  useEffect(() => {
    if (!exiting) return;
    const section = containerRef.current?.closest('#sobre');
    const nextSection = section?.nextElementSibling;
    const t = setTimeout(() => {
      nextSection?.classList.add('secção-entrada-visible');
      nextSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      exitingRef.current = false;
      setExiting(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  // Wheel: carrossel só ao scroll para baixo; no início (progress 0) scroll para cima = sair da secção
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const section = el.closest('#sobre');
    if (!section) return;
    const onWheel = (e) => {
      if (exitingRef.current) return;
      const rect = section.getBoundingClientRect();
      if (rect.top > 100) return;

      const progress = progressRef.current;
      const atStart = progress <= 0;
      const atEnd = progress >= 1;
      const scrollingDown = e.deltaY > 0;
      const scrollingUp = e.deltaY < 0;

      if (atStart && scrollingUp) return;
      if (atEnd && scrollingDown) {
        e.preventDefault();
        e.stopPropagation();
        exitScrollAccumRef.current += e.deltaY;
        if (exitScrollAccumRef.current >= EXIT_SCROLL_THRESHOLD) {
          exitScrollAccumRef.current = 0;
          exitingRef.current = true;
          setExiting(true);
        }
        return;
      }
      if (atEnd) {
        if (scrollingUp) exitScrollAccumRef.current = 0;
        return;
      }
      exitScrollAccumRef.current = 0;

      e.preventDefault();
      e.stopPropagation();
      const t = targetProgressRef.current;
      const inTitlePhase = t >= SEGMENT.SOBRE && t < SEGMENT.TRANSITION;
      const speed = inTitlePhase ? WHEEL_SPEED_TITLE_PHASE : WHEEL_SPEED;
      targetProgressRef.current = Math.min(1, Math.max(0, targetProgressRef.current + e.deltaY * speed));
    };
    section.addEventListener('wheel', onWheel, { passive: false });
    return () => section.removeEventListener('wheel', onWheel);
  }, []);

  // Loop rAF: interpolar progress → target para movimento fluido (deslize, sem engasgos)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const target = targetProgressRef.current;
      const current = progressRef.current;
      const next = current + (target - current) * LERP;
      const clamped = Math.min(1, Math.max(0, next));
      const done = Math.abs(clamped - target) < 1e-5;
      progressRef.current = done ? target : clamped;
      setProgress(progressRef.current);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const getStepSize = () => {
    if (typeof window === 'undefined') return 544;
    const w = window.innerWidth;
    if (w <= 768) {
      const gap = 20;
      const cardW = Math.min(320, w - 40);
      return cardW + gap;
    }
    const gap = 32;
    const marginX = 64;
    const inner = w - 2 * marginX;
    const cardW = Math.min(420, (inner - 2 * gap) / 3);
    return cardW + gap;
  };
  const [stepSize, setStepSize] = useState(getStepSize);

  useEffect(() => {
    const onResize = () => setStepSize(getStepSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const carouselTx = Math.min(1, progress / SEGMENT.SOBRE) * vw;
  const heroOpacity = 1 - Math.min(1, progress / SEGMENT.SOBRE);
  const transitionProgress = progress < SEGMENT.EQUIPE_TITLE ? 0 : progress >= SEGMENT.TRANSITION ? 1 : (progress - SEGMENT.EQUIPE_TITLE) / (SEGMENT.TRANSITION - SEGMENT.EQUIPE_TITLE);
  /* Frase sempre visível: ao passar para os cards fica fixa ao centro (titleX=0) */
  const titleX = progress >= SEGMENT.TRANSITION ? 0 : -transitionProgress * vw;
  const bodyX = (1 - transitionProgress) * vw;
  const imagesProgress = progress < SEGMENT.TRANSITION ? 0 : Math.min(1, (progress - SEGMENT.TRANSITION) / (SEGMENT.IMAGES - SEGMENT.TRANSITION));
  const position = imagesProgress * maxSteps;
  const L = Math.floor(position);
  const frac = position - L;

  const trackTx = position * stepSize;

  return (
    <div ref={containerRef} className={`sobre-carousel-root${exiting ? ' sobre-carousel-root--exiting' : ''}`}>
      <div className="scroll-area">
        <div className="viewport">
          <div
            className="carousel"
            style={{ transform: `translate3d(-${carouselTx}px, 0, 0)` }}
          >
            <div className="slide slide--hero" style={{ opacity: heroOpacity }}>
              <div className="hero-content">
                <div className="hero-visual" role="img" aria-label="Equipa SushiFashion" style={{ backgroundImage: 'url(./imgs/equipe1.jpg)' }} />
                <div className="hero-text">
                  <p className="section-subtitle">A nossa história</p>
                  <h2 className="section-title">Sobre o SushiFashion</h2>
                  <p>O SushiFashion nasceu da paixão pela alta gastronomia japonesa e pelo desejo de criar um espaço onde cada visita seja memorável. O nosso chef combina anos de formação no Japão com uma visão moderna e o uso exclusivo de peixe e marisco da mais alta qualidade.</p>
                  <p>Ingredientes premium, sazonalidade e apresentação impecável definem cada prato. Aqui, o sushi é tratado como moda de autor: único, refinado e inesquecível.</p>
                </div>
              </div>
            </div>

            <div className="slide slide--equipe">
              <div className="equipe-content">
                <div
                  className={`equipe-header equipe-header--animate${titleRevealed ? ' equipe-header--reveal' : ''}`}
                  style={{
                    opacity: progress >= SEGMENT.SOBRE ? (isMobile && progress >= SEGMENT.TRANSITION ? 0 : 1) : 0,
                    transform: `translate(-50%, -50%) translateX(${titleX}px) translateY(${progress >= SEGMENT.SOBRE ? titleSlideUp : 24}px)`,
                  }}
                >
                  <p className="equipe-sub">Quem faz acontecer</p>
                  <h2 className="equipe-title">Nossa equipe</h2>
                </div>
                <div
                  className="equipe-body"
                  style={{ transform: `translateY(-50%) translateX(${bodyX}px)` }}
                >
                  <div className="equipe-viewport">
                    <div
                      className="equipe-track"
                      style={{ transform: `translate3d(-${trackTx}px, 0, 0)` }}
                    >
                      {TEAM.map((member, i) => {
                        let op = 0;
                        if (i === L || i === L + 1) op = 1;
                        else if (i === L + 2) op = 1 - frac;
                        else if (i === L + 3) op = frac;
                        /* Mobile: cinza até ao centro; 1º card fica colorido ao chegar ao centro (frac ~0.35), não ao sair */
                        const isCentered = isMobile && i === L && (L > 0 || frac >= 0.35);
                        return (
                          <div
                            key={i}
                            className={`equipe-card${isCentered ? ' equipe-card--centered' : ''}`}
                            style={{ opacity: op }}
                          >
                            <div className="equipe-card__imgs">
                              <div
                                className="equipe-card__img equipe-card__img--bw"
                                style={{ backgroundImage: `url(${member.img})` }}
                                aria-hidden="true"
                              />
                              <div
                                className="equipe-card__img equipe-card__img--color"
                                style={{ backgroundImage: `url(${member.imgHover || member.img})` }}
                                aria-hidden="true"
                              />
                            </div>
                            <div className="equipe-card__text">
                              <p className="equipe-card__name">{member.name}</p>
                              <p className="equipe-card__role">{member.role}</p>
                              <p className="equipe-card__phrase">{member.phrase}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
