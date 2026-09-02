import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type Ref,
} from "react";
import { ensureFormEmbed, ensureWidgetEmbed } from "@semblia/embed";

/**
 * Thin typed wrappers over the Semblia embed custom elements. The rendering
 * runtime is evergreen and CDN-only — these components inject the same
 * script the copy-paste snippet uses (once per page) and render the element;
 * nothing on npm ever goes stale against the API.
 */

interface SembliaWidgetElementAttributes
  extends React.HTMLAttributes<HTMLElement> {
  project?: string;
  widget?: string;
  "api-base"?: string;
  ref?: Ref<HTMLElement>;
}

interface SembliaFormElementAttributes
  extends React.HTMLAttributes<HTMLElement> {
  project?: string;
  form?: string;
  ref?: Ref<HTMLElement>;
}

// Augment every JSX entry point: classic runtime consumers resolve JSX from
// "react", automatic-runtime consumers from "react/jsx-runtime" (or the dev
// variant). Namespace merging keeps the duplicates harmless.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "semblia-widget": SembliaWidgetElementAttributes;
      "semblia-form": SembliaFormElementAttributes;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "semblia-widget": SembliaWidgetElementAttributes;
      "semblia-form": SembliaFormElementAttributes;
    }
  }
}

interface EmbedCallbacks {
  onLoad?: () => void;
  onError?: () => void;
}

function useEmbedElement(
  ensure: () => void,
  loadEvent: string,
  errorEvent: string,
  { onLoad, onError }: EmbedCallbacks,
) {
  const ref = useRef<HTMLElement>(null);
  const callbacks = useRef<EmbedCallbacks>({ onLoad, onError });
  callbacks.current = { onLoad, onError };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleLoad = () => callbacks.current.onLoad?.();
    const handleError = () => callbacks.current.onError?.();
    element.addEventListener(loadEvent, handleLoad);
    element.addEventListener(errorEvent, handleError);

    // Inject the script only after the listeners exist, so a runtime that is
    // already on the page cannot dispatch its load event unobserved. Reading
    // callbacks through the ref keeps the subscription stable across renders
    // with inline arrow props.
    ensure();

    return () => {
      element.removeEventListener(loadEvent, handleLoad);
      element.removeEventListener(errorEvent, handleError);
    };
  }, [ensure, loadEvent, errorEvent]);

  return ref;
}

export interface SembliaWidgetProps {
  /** Project slug, exactly as in the embed snippet. */
  project: string;
  /** Widget id from the Studio's share panel. */
  widget: string;
  /**
   * Override the API origin the element fetches its fragment from.
   * Advanced — defaults to the production API.
   */
  apiBase?: string;
  className?: string;
  style?: CSSProperties;
  /** Fired when the widget content has mounted. */
  onLoad?: () => void;
  /** Fired when the widget failed to load. */
  onError?: () => void;
}

/**
 * Renders a published Semblia widget.
 *
 * ```tsx
 * <SembliaWidget project="acme" widget="widget_123" />
 * ```
 */
export function SembliaWidget({
  project,
  widget,
  apiBase,
  className,
  style,
  onLoad,
  onError,
}: SembliaWidgetProps): ReactElement {
  const ref = useEmbedElement(
    ensureWidgetEmbed,
    "semblia:widget-load",
    "semblia:widget-error",
    { onLoad, onError },
  );

  return (
    <semblia-widget
      ref={ref}
      project={project}
      widget={widget}
      api-base={apiBase}
      className={className}
      style={style}
    />
  );
}

export interface SembliaFormProps {
  /** Project slug, exactly as in the embed snippet. */
  project: string;
  /** Form slug from the form's share panel. */
  form: string;
  /** Accessible title for the embedded form's iframe. */
  title?: string;
  className?: string;
  style?: CSSProperties;
  /** Fired when the form iframe has loaded. */
  onLoad?: () => void;
  /** Fired when the form failed to load. */
  onError?: () => void;
}

/**
 * Renders a published Semblia collection form. The embed runtime sizes the
 * iframe to the form's content automatically.
 *
 * ```tsx
 * <SembliaForm project="acme" form="customer-feedback" />
 * ```
 */
export function SembliaForm({
  project,
  form,
  title,
  className,
  style,
  onLoad,
  onError,
}: SembliaFormProps): ReactElement {
  const ref = useEmbedElement(
    ensureFormEmbed,
    "semblia:form-load",
    "semblia:form-error",
    { onLoad, onError },
  );

  return (
    <semblia-form
      ref={ref}
      project={project}
      form={form}
      title={title}
      className={className}
      style={style}
    />
  );
}
