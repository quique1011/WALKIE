import React from 'react';

interface WalkieLogoProps {
  className?: string;
  color?: string; // Por defecto el verde característico del logo (#066337)
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  title?: string;
}

export const WalkieLogo: React.FC<WalkieLogoProps> = ({
  className = '',
  color = '#066337',
  size,
  title = 'WALKIE - Paseo de Mascotas'
}) => {
  // Dimensiones predeterminadas según size si no se especifica clase de tamaño
  let sizeClass = '';
  switch (size) {
    case 'xs':
      sizeClass = 'h-5 w-auto';
      break;
    case 'sm':
      sizeClass = 'h-7 sm:h-8 w-auto';
      break;
    case 'md':
      sizeClass = 'h-9 sm:h-10 w-auto';
      break;
    case 'lg':
      sizeClass = 'h-12 sm:h-14 w-auto';
      break;
    case 'xl':
      sizeClass = 'h-16 sm:h-20 w-auto';
      break;
    case 'hero':
      sizeClass = 'h-20 sm:h-28 md:h-32 w-auto max-w-full';
      break;
    default:
      sizeClass = className ? '' : 'h-10 w-auto';
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 740 280"
      className={`inline-block select-none overflow-visible ${sizeClass} ${className}`}
      fill={color}
      aria-label={title}
      role="img"
    >
      <title>{title}</title>
      <defs>
        {/* Plantilla idéntica de Huella Canina Walkie (Almohadilla central + 4 dedos) */}
        <g id="walkie-paw-print">
          {/* Almohadilla central con 3 lóbulos y hendidura anatómica */}
          <path d="M 0,-10 C -4.5,-12 -9,-10.5 -12,-6 C -15,-1 -14,6 -8.5,9.5 C -4.5,12 -1.5,10.5 0,9 C 1.5,10.5 4.5,12 8.5,9.5 C 14,6 15,-1 12,-6 C 9,-10.5 4.5,-12 0,-10 Z" />
          {/* 4 dedos redondeados y curvados en abanico */}
          <ellipse cx="-13" cy="-7.5" rx="3.5" ry="5.6" transform="rotate(-30 -13 -7.5)" />
          <ellipse cx="-4.8" cy="-15" rx="3.6" ry="6" transform="rotate(-10 -4.8 -15)" />
          <ellipse cx="4.8" cy="-15" rx="3.6" ry="6" transform="rotate(10 4.8 -15)" />
          <ellipse cx="13" cy="-7.5" rx="3.5" ry="5.6" transform="rotate(30 13 -7.5)" />
        </g>
      </defs>

      {/* ============================================================== */}
      {/* 1. TIPOGRAFÍA VECTORIAL IDÉNTICA "WALKIE"                      */}
      {/* ============================================================== */}
      <g id="walkie-letters">
        {/* Letra W con el vértice central a altura completa idéntico al logo original */}
        <polygon points="32,60 62,60 91,152 120,60 138,60 167,152 196,60 226,60 180,180 152,180 129,112 106,180 78,180" />

        {/* Letra A */}
        <path d="M 230,180 L 273,60 L 305,60 L 348,180 L 319,180 L 308,148 L 270,148 L 259,180 Z M 277,126 L 301,126 L 289,88 Z" />

        {/* Letra L */}
        <polygon points="364,60 393,60 393,154 445,154 445,180 364,180" />

        {/* Letra K */}
        <path d="M 464,60 L 493,60 L 493,122 L 536,60 L 570,60 L 522,126 L 573,180 L 538,180 L 493,130 L 493,180 L 464,180 Z" />

        {/* Letra I */}
        <rect x="590" y="60" width="28" height="120" />

        {/* Letra E */}
        <polygon points="636,60 706,60 706,86 665,86 665,107 701,107 701,133 665,133 665,154 706,154 706,180 636,180" />
      </g>

      {/* ============================================================== */}
      {/* 2. SENDERO DIAGONAL DE 6 HUELLAS CANINAS IDÉNTICAS AL DISEÑO   */}
      {/* ============================================================== */}
      <g id="walkie-paw-trail">
        {/* Huella 1: Debajo entre L y K (inicio del sendero) */}
        <use href="#walkie-paw-print" x="400" y="244" transform="rotate(24 400 244) scale(1.08)" />

        {/* Huella 2: Debajo del asta vertical de la K */}
        <use href="#walkie-paw-print" x="470" y="226" transform="rotate(23 470 226) scale(1.10)" />

        {/* Huella 3: Debajo de la pata diagonal derecha de la K */}
        <use href="#walkie-paw-print" x="528" y="196" transform="rotate(22 528 196) scale(1.10)" />

        {/* Huella 4: Cruzando entre la K y el tercio inferior de la I */}
        <use href="#walkie-paw-print" x="572" y="160" transform="rotate(24 572 160) scale(1.12)" />

        {/* Huella 5: Cruzando el sector superior de la letra I */}
        <use href="#walkie-paw-print" x="606" y="118" transform="rotate(23 606 118) scale(1.12)" />

        {/* Huella 6: Flotando arriba entre el tope de la I y la E */}
        <use href="#walkie-paw-print" x="640" y="66" transform="rotate(24 640 66) scale(1.10)" />
      </g>
    </svg>
  );
};
