export type ParticleMotionPreference = "on" | "off";

export const PARTICLE_MOTION_KEY = "cybershield-particle-motion";

export function isParticleMotionEnabled(preference: string | null): boolean {
  return preference !== "off";
}

export function nextParticleMotionPreference(enabled: boolean): ParticleMotionPreference {
  return enabled ? "off" : "on";
}
