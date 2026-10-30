export interface Film {
  file: string;
  thumb: string;
  title: string;
  category: string;
  duration: string;
  has4k?: boolean;
  halloweenPriority?: number;
}

export const films: Film[] = [
  { file: 'glaze', thumb: '01-glaze', title: 'Your colors. Your Blackboard.', category: 'Meet Glaze', duration: '0:22' },
  { file: '1158pm', thumb: '02-1158pm', title: '11:58 PM', category: 'Typing backup', duration: '0:20' },
  { file: 'should-have-shown', thumb: '03-should-have-shown', title: 'It should have shown you.', category: 'Grades & due dates', duration: '0:24' },
  { file: 'switchboard', thumb: '04-switchboard', title: 'A little less friction.', category: 'Optional helpers', duration: '0:25' },
  { file: 'pass-it-on', thumb: '05-pass-it-on', title: 'Good looks travel.', category: 'Theme sharing', duration: '0:22' },
  { file: 'read-it-your-way', thumb: '06-read-it-your-way', title: 'Read it your way.', category: 'Fonts & readability', duration: '0:22' },
  { file: 'hover-to-know', thumb: '07-hover-to-know', title: 'A little hint. A big help.', category: 'Previews & hints', duration: '0:18' },
  { file: 'course-colors', thumb: '08-course-colors', title: 'Every course. Its own color.', category: 'Course colors', duration: '0:21' },
  { file: 'glaze-now-on-canvas', thumb: '09-glaze-now-on-canvas', title: 'Glaze on Canvas.', category: 'Canvas', duration: '0:30', has4k: false },
  { file: 'the-haunting-of-canvas', thumb: '10-the-haunting-of-canvas', title: 'The Haunting of Canvas', category: 'Halloween Looks', duration: '0:20', has4k: false, halloweenPriority: 2 },
  { file: 'night-of-the-living-deadlines', thumb: '11-night-of-the-living-deadlines', title: 'Night of the Living Deadlines', category: 'A Glaze Halloween', duration: '0:30', has4k: false, halloweenPriority: 1 },
  { file: 'due-at-midnight', thumb: '12-due-at-midnight', title: 'Due at Midnight', category: 'A Glaze Halloween', duration: '0:34', has4k: false, halloweenPriority: 0 },
];

// What the player and the rail load for a film, under public/projects/glaze/. The page lists a film only once all of
// them are there, so an entry can land before its files.
export const filmFiles = (film: Film): string[] => [
  `${film.thumb}.webp`, `${film.file}.mp4`, `${film.file}-720p.mp4`, `${film.file}.vtt`,
  ...(film.has4k === false ? [] : [`${film.file}-2160p.mp4`]),
];

export const availableFilms = (fileExists: (file: string) => boolean): Film[] =>
  films.filter((film) => filmFiles(film).every(fileExists));

export const orderFilms = (films: readonly Film[], halloween = false): Film[] =>
  halloween
    ? [...films].sort((a, b) => (a.halloweenPriority ?? Infinity) - (b.halloweenPriority ?? Infinity))
    : [...films];
