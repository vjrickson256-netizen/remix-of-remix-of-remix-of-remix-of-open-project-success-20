// Shared content types. All catalog content is uploaded by the admin and stored
// in Firebase Firestore — there is no bundled sample data.
export interface Movie {
  id: number
  title: string
  year: number
  genres: string[]
  language: string
  poster: string
  backdrop?: string
  rating?: number
  imdbRating?: number
  duration?: string
  description?: string
  director?: string
  cast?: string[]
  ageRating?: string
  type?: 'movie' | 'series'
  seasons?: number
  episodes?: Episode[]
  videoUrl?: string
  /** Optional Mux playback ID; when set the player streams from Mux. */
  muxPlaybackId?: string
  /** Featured in the homepage hero carousel. */
  hero?: boolean
  /** Marked for the Agent page — hidden from every other page until unmarked. */
  agent?: boolean
}

export interface Episode {
  number: number
  title: string
  duration: string
  thumbnail: string
  /** Video file for this episode (uploaded to R2). Episodes hold their own video. */
  videoUrl?: string
}
