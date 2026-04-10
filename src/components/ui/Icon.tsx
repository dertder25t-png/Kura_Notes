type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'plus'
  | 'x'
  | 'search'
  | 'folder'
  | 'folder-plus'
  | 'note'
  | 'study'
  | 'flashcards'
  | 'sparkles'
  | 'grid'
  | 'layout-top'
  | 'layout-left'
  | 'reset'
  | 'select'
  | 'move'
  | 'trash'
  | 'pin'
  | 'unpin'
  | 'focus'
  | 'organize'
  | 'settings';

interface Props {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
  className?: string;
}

function IconPath({ name }: { name: IconName }) {
  switch (name) {
    case 'chevron-left':
      return <path d="M15 18l-6-6 6-6" />;
    case 'chevron-right':
      return <path d="M9 6l6 6-6 6" />;
    case 'chevron-down':
      return <path d="M6 9l6 6 6-6" />;
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'x':
      return <path d="M6 6l12 12M18 6L6 18" />;
    case 'search':
      return <path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm8 2-4.35-4.35" />;
    case 'folder':
      return <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.2l1.7 2H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />;
    case 'folder-plus':
      return <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.2l1.7 2H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Zm9 3.5v6m-3-3h6" />;
    case 'note':
      return <path d="M7 4.5h7l5 5V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Zm6 0V10h5" />;
    case 'study':
      return <path d="M4 6.5 12 3l8 3.5-8 3.5-8-3.5ZM6 10v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />;
    case 'flashcards':
      return <path d="M5 7h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm5-4h9a2 2 0 0 1 2 2v10" />;
    case 'sparkles':
      return <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Zm7.5 9.5 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />;
    case 'grid':
      return <path d="M5 5h6v6H5V5Zm8 0h6v6h-6V5ZM5 13h6v6H5v-6Zm8 0h6v6h-6v-6Z" />;
    case 'layout-top':
      return <path d="M4 5h16v4H4V5Zm0 6h16v8H4v-8Z" />;
    case 'layout-left':
      return <path d="M4 5h5v14H4V5Zm7 0h9v14h-9V5Z" />;
    case 'reset':
      return <path d="M20 11a8 8 0 1 0-2.34 5.66M20 11v-5m0 5h-5" />;
    case 'select':
      return <path d="M4 4l6.5 14 1.8-5.2L18 12l-14-8Z" />;
    case 'move':
      return <path d="M12 3v18M3 12h18M12 3 8 7m4-4 4 4M12 21l-4-4m4 4 4-4M3 12l4-4m-4 4 4 4M21 12l-4-4m4 4-4 4" />;
    case 'trash':
      return <path d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12" />;
    case 'pin':
      return <path d="M14 3l7 7-3 1-3 7-2-2-5 5-2-2 5-5-2-2 7-3-2-6Z" />;
    case 'unpin':
      return <path d="M14 3l7 7-3 1-3 7-2-2-5 5-2-2 5-5-2-2 7-3-2-6M4 20l16-16" />;
    case 'focus':
      return <path d="M8 4H4v4M20 8V4h-4M4 16v4h4M16 20h4v-4" />;
    case 'organize':
      return <path d="M4 7h16v4H4V7Zm0 6h10v4H4v-4Zm12 0h4v4h-4v-4Z" />;
    case 'settings':
      return <path d="M12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25Zm8.5 3.75-1.9-.62a6.74 6.74 0 0 0-.56-1.34l.95-1.75-1.83-1.83-1.75.95c-.43-.23-.88-.42-1.34-.56L13 3.5h-2l-.62 1.9c-.46.14-.91.33-1.34.56l-1.75-.95L5.46 6.84l.95 1.75c-.23.43-.42.88-.56 1.34L4 12v2l1.9.62c.14.46.33.91.56 1.34l-.95 1.75 1.83 1.83 1.75-.95c.43.23.88.42 1.34.56L11 20.5h2l.62-1.9c.46-.14.91-.33 1.34-.56l1.75.95 1.83-1.83-.95-1.75c.23-.43.42-.88.56-1.34L20.5 14v-2Z" />;
  }
}

export default function Icon({ name, size = 16, strokeWidth = 1.8, title, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
    >
      {title ? <title>{title}</title> : null}
      <IconPath name={name} />
    </svg>
  );
}