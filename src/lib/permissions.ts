/** The catalog of permission keys a custom role can grant. */
export const PERMISSIONS = [
  {
    key: "moderate_topics",
    label: "Moderate topics & posts",
    help: "Delete posts in a group they moderate.",
  },
  {
    key: "moderate_members",
    label: "Moderate members",
    help: "Mark members of a group as moderated (hold their posts for approval).",
  },
  {
    key: "manage_lists",
    label: "Manage lists",
    help: "Create and edit lists/groups.",
  },
  {
    key: "send_broadcasts",
    label: "Send broadcasts",
    help: "Compose and send list messages.",
  },
  {
    key: "approve_users",
    label: "Approve users",
    help: "Approve pending user accounts.",
  },
  {
    key: "block_users",
    label: "Block users",
    help: "Block or unblock user accounts.",
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}
