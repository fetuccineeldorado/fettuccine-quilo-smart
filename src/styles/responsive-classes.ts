/**
 * UTILITÁRIO DE CLASSES RESPONSIVAS MOBILE-FIRST
 * 
 * Este arquivo contém classes Tailwind pré-definidas para facilitar
 * a implementação de responsividade em todo o sistema.
 */

export const ResponsiveClasses = {
  // CONTAINERS
  container: {
    main: "p-4 lg:p-8 max-w-7xl mx-auto",
    narrow: "p-4 lg:p-8 max-w-4xl mx-auto",
    wide: "p-4 lg:p-8 max-w-full mx-auto",
  },

  // SPACING
  spacing: {
    section: "space-y-4 lg:space-y-8",
    card: "space-y-3 lg:space-y-6",
    form: "space-y-2 lg:space-y-4",
    gap: {
      sm: "gap-2 lg:gap-3",
      md: "gap-3 lg:gap-4",
      lg: "gap-4 lg:gap-6",
    }
  },

  // TYPOGRAPHY
  typography: {
    h1: "text-2xl lg:text-4xl font-bold",
    h2: "text-xl lg:text-3xl font-bold",
    h3: "text-lg lg:text-2xl font-bold",
    h4: "text-base lg:text-xl font-semibold",
    body: "text-sm lg:text-base",
    small: "text-xs lg:text-sm",
    muted: "text-xs lg:text-sm text-muted-foreground",
  },

  // PADDING
  padding: {
    page: "p-4 lg:p-8",
    card: "p-4 lg:p-6",
    cardHeader: "px-4 lg:px-6 py-3 lg:py-6",
    cardContent: "px-4 lg:px-6",
    button: "px-3 lg:px-4 py-2 lg:py-2.5",
  },

  // LAYOUT
  layout: {
    flexCol: "flex flex-col lg:flex-row",
    flexRow: "flex flex-row",
    gridAuto: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    gridFull: "grid grid-cols-1",
    grid2Col: "grid grid-cols-1 lg:grid-cols-2",
    grid3Col: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    grid4Col: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  },

  // BUTTONS
  button: {
    fullToAuto: "w-full lg:w-auto",
    icon: "h-4 w-4 lg:h-5 lg:w-5",
    iconSm: "h-3 w-3 lg:h-4 lg:w-4",
    iconLg: "h-5 w-5 lg:h-6 lg:w-6",
    text: "text-sm lg:text-base",
  },

  // CARDS
  card: {
    base: "shadow-soft hover:shadow-lg transition-smooth",
    header: "px-4 lg:px-6",
    title: "text-base lg:text-lg font-semibold",
    description: "text-xs lg:text-sm text-muted-foreground",
  },

  // ICONS
  icon: {
    xs: "h-3 w-3 lg:h-4 lg:w-4",
    sm: "h-4 w-4 lg:h-5 lg:w-5",
    md: "h-5 w-5 lg:h-6 lg:w-6",
    lg: "h-6 w-6 lg:h-8 lg:w-8",
    xl: "h-8 w-8 lg:h-10 lg:w-10",
  },

  // VISIBILITY
  visibility: {
    mobileOnly: "lg:hidden",
    desktopOnly: "hidden lg:block",
    tabletUp: "hidden md:block",
    desktopUp: "hidden lg:flex",
  },

  // TABLE ALTERNATIVES (Cards for mobile)
  table: {
    mobileCards: "lg:hidden space-y-3",
    desktopTable: "hidden lg:block",
    mobileCard: "p-4 bg-card rounded-lg border border-border shadow-sm",
  },

  // FORM ELEMENTS
  form: {
    fieldset: "space-y-2",
    label: "text-sm lg:text-base font-medium",
    input: "text-sm lg:text-base",
    buttonGroup: "flex flex-col sm:flex-row gap-2 lg:gap-4",
  },

  // STAT CARDS
  stat: {
    container: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6",
    card: "shadow-soft hover:shadow-lg transition-smooth",
    header: "flex flex-row items-center justify-between pb-2 px-4 lg:px-6",
    title: "text-xs lg:text-sm font-medium text-muted-foreground",
    value: "text-2xl lg:text-3xl font-bold",
    icon: "h-4 w-4 lg:h-5 lg:w-5",
    iconContainer: "p-1.5 lg:p-2 rounded-lg",
  },

  // DIALOG/MODAL
  dialog: {
    content: "max-w-[95vw] lg:max-w-2xl",
    title: "text-lg lg:text-xl",
    description: "text-sm lg:text-base",
  },
};

// Helper function to merge classes
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Pre-built component class combinations
export const ComponentStyles = {
  page: {
    container: cn(ResponsiveClasses.container.main, ResponsiveClasses.spacing.section),
    header: "flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-4",
    title: cn(ResponsiveClasses.typography.h1, "mb-1 lg:mb-2"),
    description: cn(ResponsiveClasses.typography.muted),
  },

  card: {
    default: cn(ResponsiveClasses.card.base, ResponsiveClasses.padding.card),
    header: cn(ResponsiveClasses.card.header),
    title: cn(ResponsiveClasses.card.title),
    description: cn(ResponsiveClasses.card.description),
    content: cn(ResponsiveClasses.padding.cardContent, ResponsiveClasses.spacing.card),
  },

  button: {
    primary: cn(ResponsiveClasses.button.fullToAuto, ResponsiveClasses.button.text),
    icon: ResponsiveClasses.button.icon,
    group: ResponsiveClasses.form.buttonGroup,
  },

  grid: {
    auto: cn(ResponsiveClasses.layout.gridAuto, ResponsiveClasses.spacing.gap.lg),
    stats: cn(ResponsiveClasses.stat.container),
  },
};

export default ResponsiveClasses;

