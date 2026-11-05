// SquareUp Events API
export async function onRequest(){
  return Response.json({ error: 'Events setup pending' }, { status: 503 });
}
