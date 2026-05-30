import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.API_JWT_SECRET);

export interface AuthPayload {
  role: "AGENT_ROLE" | "COOP_ROLE" | "BUYER_ROLE" | "VAULT_ROLE" | "MULTISIG_ROLE";
  wallet: `0x${string}`;
  sub: string;
}

export async function verifyBearer(request: Request): Promise<AuthPayload> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = auth.slice(7);
  const { payload } = await jwtVerify(token, SECRET, { clockTolerance: 60 });
  return payload as unknown as AuthPayload;
}

export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
