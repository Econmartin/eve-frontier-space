import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import './Hero.css';

export function Hero() {
  return (
    <section
      className="move-hero-section grid min-h-[70vh] -mt-[76px] items-start"
    >
      {/* Background gradient + text */}
      <div className="move-hero-mask relative overflow-hidden rounded-3xl [grid-area:1/1] place-self-stretch">
        <ShaderGradientCanvas
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          pixelDensity={1}
          fov={45}
          lazyLoad={false}
        >
          <ShaderGradient
            type="sphere"
            animate="on"
            uTime={0}
            uSpeed={0.3}
            uStrength={0.3}
            uDensity={0.8}
            uFrequency={5.5}
            uAmplitude={3.2}
            color1="#ffd1a5"
            color2="#ff610a"
            color3="#FAFAE5"
            wireframe={false}
            shader="defaults"
            envPreset="city"
            lightType="env"
            brightness={2.1}
            grain="on"
            reflection={0.4}
            positionX={-0.1}
            positionY={0}
            positionZ={0}
            rotationX={0}
            rotationY={130}
            rotationZ={70}
            range="disabled"
            rangeStart={0}
            rangeEnd={40}
            cDistance={0.5}
            cPolarAngle={180}
            cAzimuthAngle={270}
            cameraZoom={15.1}
          />
        </ShaderGradientCanvas>
        {/* <div className="absolute inset-0 bg-black/55" /> */}
        <div className="move-hero-gradient absolute inset-0" />

        <div className="relative flex flex-col justify-end h-full pb-32 px-10">
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-[var(--color-cyan)] mb-4 opacity-90">
            Interactive Course
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-[0.9] font-heading">
            Learn Move.<br />
            Ship on Sui.
          </h1>
          <p className="text-base text-white/70 max-w-md leading-relaxed">
            Go from zero to writing real Sui smart contracts.
            Browser-based, real compiler — no setup required.
          </p>
        </div>
      </div>

    </section>
  );
}
