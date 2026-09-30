'use client';

import { Button, cn } from '@nexus/ui';
import { ArrowRight, Play } from 'lucide-react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GlobeInstance } from 'globe.gl';
import { IMG } from '@/lib/photos';
import { Spark } from './bits';

const KIGALI = { lat: -1.9441, lng: 30.0619 };

const CITIES = [
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { name: 'Kampala', lat: 0.3476, lng: 32.5825 },
  { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Accra', lat: 5.6037, lng: -0.187 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { name: 'Addis Ababa', lat: 8.9806, lng: 38.7578 },
  { name: 'Kinshasa', lat: -4.4419, lng: 15.2663 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'London', lat: 51.5072, lng: -0.1276 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
];

const ARCS = CITIES.map((city, index) => ({
  startLat: KIGALI.lat,
  startLng: KIGALI.lng,
  endLat: city.lat,
  endLng: city.lng,
  color: index % 3 === 0 ? ['rgba(245,165,36,0.05)', '#F5A524'] : ['rgba(96,165,250,0.05)', '#60A5FA'],
  delay: index * 380,
}));

const START = { lat: -4, lng: 24, altitude: 2.15 };

function baseOffset(width: number) {
  return width >= 768 ? Math.round(width * 0.2) : 0;
}

type Country = { properties: { CONTINENT?: string; ISO_A3?: string; ADMIN?: string } };

export function GlobeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const textOpacity = useTransform(scrollYProgress, [0, 0.28], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.28], [0, -80]);
  const cityRef = useRef<HTMLDivElement>(null);
  const cityTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let observer: IntersectionObserver | null = null;
    let onResize: (() => void) | null = null;

    async function boot() {
      const [{ default: Globe }, THREE, countries] = await Promise.all([
        import('globe.gl'),
        import('three'),
        fetch('/geo/countries.geojson').then((response) => response.json() as Promise<{ features: Country[] }>),
      ]);
      if (disposed || !mountRef.current) return;

      const element = mountRef.current;
      const globe = new Globe(element, { rendererConfig: { antialias: true, alpha: true } });
      globeRef.current = globe;

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color('#081226'),
        emissive: new THREE.Color('#06142e'),
        emissiveIntensity: 0.6,
        shininess: 12,
        transparent: true,
        opacity: 0.96,
      });

      globe
        .width(element.clientWidth)
        .height(element.clientHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .globeMaterial(material)
        .showAtmosphere(true)
        .atmosphereColor('#3B82F6')
        .atmosphereAltitude(0.24)
        .hexPolygonsData(countries.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.42)
        .hexPolygonUseDots(true)
        .hexPolygonColor((feature) => {
          const props = (feature as Country).properties;
          if (props.ISO_A3 === 'RWA' || props.ADMIN === 'Rwanda') return '#F5A524';
          return props.CONTINENT === 'Africa' ? 'rgba(125,180,255,0.95)' : 'rgba(96,165,250,0.42)';
        })
        .arcsData(ARCS)
        .arcColor('color')
        .arcStroke(0.55)
        .arcAltitudeAutoScale(0.42)
        .arcDashLength(0.45)
        .arcDashGap(1.4)
        .arcDashInitialGap((arc) => (arc as { delay: number }).delay / 1000)
        .arcDashAnimateTime(reduce ? 0 : 2600)
        .pointsData(CITIES)
        .pointColor(() => '#93C5FD')
        .pointAltitude(0.01)
        .pointRadius(0.32)
        .ringsData([KIGALI])
        .ringColor(() => (t: number) => `rgba(245,165,36,${1 - t})`)
        .ringMaxRadius(5.5)
        .ringPropagationSpeed(2.6)
        .ringRepeatPeriod(reduce ? 0 : 900)
        .htmlElementsData([KIGALI])
        .htmlElement(() => {
          const chip = document.createElement('div');
          chip.className = 'nexus-kigali-chip';
          chip.innerHTML = '<span></span>Kigali';
          return chip;
        })
        .globeOffset([baseOffset(element.clientWidth), 0])
        .pointOfView(START, 0);

      const controls = globe.controls();
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.45;
      controls.rotateSpeed = 0.6;

      globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      onResize = () => {
        if (!mountRef.current) return;
        globe
          .width(mountRef.current.clientWidth)
          .height(mountRef.current.clientHeight)
          .globeOffset([baseOffset(mountRef.current.clientWidth), 0]);
      };
      window.addEventListener('resize', onResize);

      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) globe.resumeAnimation();
        else globe.pauseAnimation();
      });
      observer.observe(element);

      setReady(true);
    }

    void boot();

    return () => {
      disposed = true;
      observer?.disconnect();
      if (onResize) window.removeEventListener('resize', onResize);
      globeRef.current?._destructor();
      globeRef.current = null;
    };
  }, [reduce]);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const ramp = (from: number, to: number) => Math.max(0, Math.min(1, (value - from) / (to - from)));
    if (cityRef.current) {
      const shown = ramp(0.5, 0.74);
      cityRef.current.style.opacity = String(shown);
      cityRef.current.style.transform = `scale(${1.18 - 0.18 * ramp(0.5, 1)})`;
    }
    if (cityTextRef.current) {
      const shown = ramp(0.66, 0.82);
      cityTextRef.current.style.opacity = String(shown);
      cityTextRef.current.style.transform = `translateY(${40 * (1 - shown)}px)`;
    }

    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.autoRotate = !reduce && value < 0.04;

    const width = mountRef.current?.clientWidth ?? 0;
    const fade = Math.max(0, Math.min(1, (value - 0.5) / 0.22));
    if (mountRef.current) mountRef.current.style.opacity = String(1 - fade);
    if (fade >= 1) globe.pauseAnimation();
    else globe.resumeAnimation();
    if (value < 0.04) {
      globe.globeOffset([baseOffset(width), 0]);
      return;
    }
    const t = Math.min(1, (value - 0.04) / 0.62);
    const eased = 1 - Math.pow(1 - t, 3);
    globe.globeOffset([baseOffset(width) * (1 - eased), 0]);
    globe.pointOfView(
      {
        lat: START.lat + (KIGALI.lat - START.lat) * eased,
        lng: START.lng + (KIGALI.lng - START.lng) * eased,
        altitude: START.altitude + (0.42 - START.altitude) * eased,
      },
      0,
    );
  });

  return (
    <section ref={sectionRef} className="relative h-[260vh] bg-[#04060A]">
      <style>{`
        .nexus-kigali-chip{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;border-radius:999px;background:rgba(11,13,16,.8);border:1px solid rgba(245,165,36,.5);color:#fff;font:600 11px var(--font-geist-sans),system-ui;letter-spacing:.02em;transform:translate(10px,-24px);backdrop-filter:blur(8px);pointer-events:none;white-space:nowrap}
        .nexus-kigali-chip span{width:7px;height:7px;border-radius:999px;background:#F5A524;box-shadow:0 0 12px #F5A524}
      `}</style>

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 28% 72%, #cbd5e1 50%, transparent 51%), radial-gradient(1.5px 1.5px at 44% 8%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 62% 34%, #94a3b8 50%, transparent 51%), radial-gradient(1px 1px at 78% 82%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 88% 14%, #e2e8f0 50%, transparent 51%), radial-gradient(1px 1px at 6% 58%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 52% 92%, #cbd5e1 50%, transparent 51%), radial-gradient(1px 1px at 94% 48%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 36% 42%, #94a3b8 50%, transparent 51%)',
            backgroundSize: '520px 520px',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_68%_50%,rgba(59,130,246,.22),transparent_70%)]" />

        <div className="absolute inset-0 z-0">
          <div
            ref={mountRef}
            className={cn('size-full cursor-grab active:cursor-grabbing', !ready && 'invisible')}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,rgba(4,6,10,.15),rgba(4,6,10,.7)_45%,rgba(4,6,10,.92))] md:hidden" />

        <div ref={cityRef} className="pointer-events-none absolute inset-0 z-10 opacity-0 will-change-transform">
          <img src={IMG.hero} alt="Kigali at night" className="size-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,10,.55),rgba(4,6,10,.15)_40%,rgba(11,13,16,.9))]" />
        </div>

        <motion.div
          style={reduce ? undefined : { opacity: textOpacity, y: textY }}
          className="pointer-events-none relative z-20 mx-auto flex h-full max-w-[1280px] flex-col justify-center px-5 md:px-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] font-medium text-white/90 backdrop-blur-md"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#F5A524] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#F5A524]" />
            </span>
            Live from Kigali, connected to everywhere
          </motion.div>

          <h1 className="t-hero max-w-[760px] text-white">
            {['Your world.', 'Connected.'].map((line, index) => (
              <motion.span
                key={line}
                className={cn(
                  'block',
                  index === 1 && 'bg-[linear-gradient(100deg,#93C5FD,#3B82F6_45%,#F5A524)] bg-clip-text text-transparent',
                )}
                initial={{ opacity: 0, y: 50, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.45 + index * 0.18, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="mt-7 max-w-md text-[17px] leading-relaxed text-white/75"
          >
            Your people, your places, your plans and your growth, on one living map. It starts in
            Kigali and reaches everywhere you go.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="pointer-events-auto mt-9 flex flex-wrap gap-3"
          >
            <Button size="xl" asChild>
              <Link href="/create-account">
                Create your world <ArrowRight />
              </Link>
            </Button>
            <Button size="xl" variant="glass" asChild>
              <Link href="/sign-in">
                <Play className="fill-current" /> See it live
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="mt-14 flex items-center gap-3 text-xs text-white/45"
          >
            <span className="h-px w-10 bg-white/25" /> Drag the globe · scroll to fly into Kigali
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          style={reduce ? undefined : { opacity: textOpacity }}
          className="floaty absolute right-8 bottom-16 z-20 hidden w-[290px] xl:block"
        >
          <div className="ai-border ai-glow rounded-2xl bg-[#0B0F16]/85 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <Spark />
              <span className="text-ai-gradient">Nexus AI</span>
              <span className="ml-auto font-mono text-[11px] text-[#8A93A3]">13:58</span>
            </div>
            <p className="mt-2 text-[14px] leading-snug text-white">
              You have <b className="text-[#60A5FA]">3h free</b> from 14:00. Kevin and Aline are at
              Norrsken until 18:00.
            </p>
          </div>
        </motion.div>

        <div
          ref={cityTextRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto max-w-[1280px] px-5 pb-20 opacity-0 md:px-10"
        >
          <div className="t-eyebrow text-[#F5A524]">-1.9441° S · 30.0619° E</div>
          <h2 className="t-d1 mt-4 max-w-3xl text-white">This is Kigali. This is where your world begins.</h2>
        </div>
      </div>
    </section>
  );
}
