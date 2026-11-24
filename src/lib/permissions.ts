/** The catalog of permission keys a custom role can grant. */
export const PERMISSIONS = [
  {
    key: "moderate_topics",
    label: "Moderate topics & posts",
    help: "Delete posts in a group they moderate.",
  },
  {
    key: "moderate_members",
    label: "Manage group members",
    help: "Add/remove/confirm subscribers of a group.",
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
