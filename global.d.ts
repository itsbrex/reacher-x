export {}; // This makes the file a module.

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "hls-video": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
