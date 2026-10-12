import React from 'react';
import { PulseBackground } from './PulseBackground';

export function NeuralProcessor({ isLight, children }: { isLight: boolean, children?: React.ReactNode }) {
  return (
    <PulseBackground isLight={isLight}>
      {children}
    </PulseBackground>
  );
}
