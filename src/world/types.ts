export type Obstacle = {
  id: string;
  position: [number, number, number]; // center
  size: [number, number, number];     // full extents
  url?: string;                       // optional GLB path per obstacle
};