import { useDarkMode } from '../useDarkMode';

/** Sun/moon switch used in every app's header. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useDarkMode();
  const martianFilter = 'brightness(0) saturate(100%) invert(43%) sepia(96%) saturate(2058%) hue-rotate(3deg) brightness(101%) contrast(106%)';
  return (
    <button
      onClick={toggle}
      className={`relative size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <img src="/assets/moon.svg" alt="" className={`absolute size-5 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}`} style={{ filter: martianFilter }} />
      <img src="/assets/sun.svg" alt="" className={`absolute size-5 transition-all duration-300 ${isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} style={{ filter: martianFilter }} />
    </button>
  );
}
