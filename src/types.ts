export interface SimulationSettings {
  speed: number;
  dimension: number;
  particleCount: number;
  colorPalette: 'default' | 'neon' | 'fire' | 'ocean' | 'monochrome' | 'cyberpunk';
  shape: 'sphere' | 'helix' | 'tornado' | 'galaxy' | 'cube' | 'torus' | 'wave' | 'implosion';
  particleShape: 'sphere' | 'cube' | 'star';
}

export interface HandGesture {
  type: 'one-finger' | 'open-hand' | 'closed-hand' | 'none';
  confidence: number;
  x: number; // Normalized X position (0 to 1)
}
