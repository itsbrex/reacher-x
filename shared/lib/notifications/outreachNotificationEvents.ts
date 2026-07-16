export type OutreachNotificationEvent = {
  _creationTime: number;
  _id: string;
  eventUpdatedAt?: number;
  eventVersion?: number;
};

export function getOutreachNotificationEventTimestamp(
  notification: Pick<
    OutreachNotificationEvent,
    "_creationTime" | "eventUpdatedAt"
  >
): number {
  return notification.eventUpdatedAt ?? notification._creationTime;
}

export function getOutreachNotificationEventKey(
  notification: OutreachNotificationEvent
): string {
  return [
    notification._id,
    notification.eventVersion ?? 1,
    getOutreachNotificationEventTimestamp(notification),
  ].join(":");
}
