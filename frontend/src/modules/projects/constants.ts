/**
 * The one authoritative list of project statuses on the frontend.
 *
 * Both the list page (filter + buckets) and the detail page (status switcher)
 * render from here, so a status added for the backend cannot exist in one
 * screen and be invisible in the other.
 */
export const PROJECT_STATUSES = [
  'UPCOMING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CLOSED',
  'ARCHIVED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, ' '),
}));

/** How the list page groups projects when no explicit status filter is set. */
export const PROJECT_STATUS_BUCKETS: {
  key: string;
  title: string;
  statuses: ProjectStatus[];
  /** Finished work is history — keep it out of the way until asked for. */
  collapsedByDefault?: boolean;
}[] = [
  { key: 'upcoming', title: 'Upcoming', statuses: ['UPCOMING'] },
  { key: 'ongoing', title: 'Ongoing', statuses: ['ACTIVE', 'ON_HOLD'] },
  {
    key: 'completed',
    title: 'Completed',
    statuses: ['COMPLETED', 'CLOSED', 'ARCHIVED'],
    collapsedByDefault: true,
  },
];
