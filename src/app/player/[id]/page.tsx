import PlayerPage from "@/components/PlayerPage";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerPage playerId={Number(id)} />;
}
