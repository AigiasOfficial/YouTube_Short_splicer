export const titleAnimations = [
  {
    id: 'fade',
    name: 'Fade In',
    description: 'Simple fade from transparent to visible',
    preview: 'opacity: 0 → 1',
  },
  {
    id: 'slide-up',
    name: 'Slide Up',
    description: 'Slides up from below while fading in',
    preview: 'translateY(20px) → 0',
  },
  {
    id: 'slide-down',
    name: 'Slide Down',
    description: 'Slides down from above while fading in',
    preview: 'translateY(-20px) → 0',
  },
  {
    id: 'pop',
    name: 'Pop',
    description: 'Scales up with a bounce effect',
    preview: 'scale(0) → scale(1.1) → scale(1)',
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    description: 'Types each character one by one',
    preview: 'Character by character reveal',
  },
  {
    id: 'bounce',
    name: 'Bounce',
    description: 'Bounces in from above',
    preview: 'Elastic bounce effect',
  },
  {
    id: 'glitch',
    name: 'Glitch',
    description: 'Digital glitch effect',
    preview: 'RGB split + jitter',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Letters wave in sequentially',
    preview: 'Per-character wave motion',
  },
];

export const getAnimationCSS = (animationId, duration = 0.5) => {
  const animations = {
    'fade': {
      keyframes: `
        from { opacity: 0; }
        to { opacity: 1; }
      `,
      animation: `fade ${duration}s ease-out forwards`,
    },
    'slide-up': {
      keyframes: `
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      `,
      animation: `slide-up ${duration}s ease-out forwards`,
    },
    'slide-down': {
      keyframes: `
        from { opacity: 0; transform: translateY(-30px); }
        to { opacity: 1; transform: translateY(0); }
      `,
      animation: `slide-down ${duration}s ease-out forwards`,
    },
    'pop': {
      keyframes: `
        0% { opacity: 0; transform: scale(0); }
        70% { transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      `,
      animation: `pop ${duration}s ease-out forwards`,
    },
    'bounce': {
      keyframes: `
        0% { opacity: 0; transform: translateY(-100px); }
        60% { transform: translateY(10px); }
        80% { transform: translateY(-5px); }
        100% { opacity: 1; transform: translateY(0); }
      `,
      animation: `bounce ${duration}s ease-out forwards`,
    },
  };
  
  return animations[animationId] || animations['fade'];
};
