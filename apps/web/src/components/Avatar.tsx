import { avatarColors, initials } from "@splitly/theme";
import type { Member } from "@splitly/core";

const sizes = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
} as const;

/** `members` is the whole group, so each person gets a colour by their position in it. */
export function Avatar({
  member,
  members,
  size = "md",
  ring,
}: {
  member: Member;
  members: Member[];
  size?: keyof typeof sizes;
  ring?: string;
}) {
  const color = avatarColors(members.findIndex((m) => m.id === member.id));
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${ring ?? ""}`}
      style={{ backgroundColor: color.background, color: color.text }}
    >
      {initials(member.name)}
    </span>
  );
}

export function AvatarStack({ members }: { members: Member[] }) {
  return (
    <span className="flex -space-x-2">
      {members.map((member) => (
        <Avatar key={member.id} member={member} members={members} ring="ring-2 ring-canvas" />
      ))}
    </span>
  );
}
