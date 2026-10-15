/**
 * Master Club List Configuration
 * Easily update or add new school clubs here.
 */
export const MASTER_CLUBS: readonly string[] = [
  "Robotics Club",
  "Debate Club",
  "Basketball Club",
  "Art & Design Club",
  "Coding Club",
  "Music Club",
] as const;

export type ClubName = (typeof MASTER_CLUBS)[number];
