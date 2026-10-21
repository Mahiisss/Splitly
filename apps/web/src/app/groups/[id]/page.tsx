import { GroupScreen } from "@/components/GroupScreen";

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  return <GroupScreen id={id} />;
}
