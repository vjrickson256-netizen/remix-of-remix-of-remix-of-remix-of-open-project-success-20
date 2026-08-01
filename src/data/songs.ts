// Songs are uploaded by the admin and stored in Firebase Firestore.
export interface Song {
  id: number;
  title: string;
  artist: string;
  genre: string;
  year: number;
  rating: number;
  duration: string;
  coverUrl: string;
  /** Music video file — the song of the week plays as a video. */
  videoUrl?: string;
  /** Legacy audio-only uploads. */
  audioUrl?: string;

  featured?: boolean;
}
