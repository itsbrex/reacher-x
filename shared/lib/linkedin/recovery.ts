export interface LinkedInRecoveryAction {
  href: "/plans" | "/settings/connected-accounts";
  label:
    | "Connect account"
    | "Manage account"
    | "Reconnect account"
    | "View plans";
}

export function resolveLinkedInRecoveryAction(
  reasonCode: string | null | undefined
): LinkedInRecoveryAction | null {
  switch (reasonCode) {
    case "missing_account":
    case "missing_connection":
      return {
        href: "/settings/connected-accounts",
        label: "Connect account",
      };
    case "credentials_required":
    case "missing_scopes":
      return {
        href: "/settings/connected-accounts",
        label: "Reconnect account",
      };
    case "action_required":
    case "restricted":
      return {
        href: "/settings/connected-accounts",
        label: "Manage account",
      };
    case "feature_not_subscribed":
    case "subscription_required":
      return { href: "/plans", label: "View plans" };
    default:
      return null;
  }
}
