import { listCooperatives } from "@/lib/cooperatives";

export async function GET() {
  return Response.json({ cooperatives: listCooperatives() });
}
