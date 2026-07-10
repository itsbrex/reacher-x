export function resolveReasoningDisclosureOpen(args: {
  isStreaming: boolean;
  completedOpen: boolean;
}) {
  return args.isStreaming || args.completedOpen;
}

export function resolveReasoningDisclosureRequest(args: {
  isStreaming: boolean;
  currentCompletedOpen: boolean;
  requestedOpen: boolean;
}) {
  return args.isStreaming ? args.currentCompletedOpen : args.requestedOpen;
}
