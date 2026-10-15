import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

/**
 * Staff authentication helpers.
 *
 * Authentication is handled by Clerk. The role ("admin" or "agent") is read
 * from the public metadata of the Clerk user. Set the role in the Clerk
 * dashboard: Users -> select user -> Metadata -> public:
 * { "role": "admin" }. If no role is set, the user is a support agent.
 */

export interface StaffUser {
  id: string;
  name: string;
  role: "admin" | "agent";
}

function readRole(metadata: unknown): "admin" | "agent" {
  const value =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>).role
      : undefined;
  return value === "admin" ? "admin" : "agent";
}

function displayName(user: {
  fullName: string | null;
  firstName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}): string {
  return (
    user.fullName ??
    user.firstName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Staff member"
  );
}

/** The signed-in staff member, or null when not signed in. */
export async function getStaffUser(): Promise<StaffUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    name: displayName(user),
    role: readRole(user.publicMetadata),
  };
}

/** The signed-in staff member. Throw when not signed in. */
export async function requireStaffUser(): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) {
    throw new Error("Not signed in.");
  }
  return staff;
}

/** All staff members, for the agent assignment list. */
export async function listStaff(): Promise<StaffUser[]> {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({ limit: 100 });
    return response.data.map((user) => ({
      id: user.id,
      name: displayName(user),
      role: readRole(user.publicMetadata),
    }));
  } catch (error) {
    console.error("listStaff failed:", error);
    return [];
  }
}
