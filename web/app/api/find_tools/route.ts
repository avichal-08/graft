// forwards to the graft gateway's http api so the browser never talks to it directly
const api = process.env.GRAFT_API ?? 'http://127.0.0.1:7700'

export async function POST(req: Request) {
  try {
    const res = await fetch(`${api}/find_tools`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    })
    return new Response(await res.text(), { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch {
    return Response.json({ error: `gateway not reachable at ${api}. start it with npm run serve` }, { status: 502 })
  }
}
