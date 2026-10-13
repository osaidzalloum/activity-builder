export async function GET(request: Request) {
  const url = new URL(request.url);
  const amount = url.searchParams.get("amount") ?? "5";

  // هون لو في مفتاح سري، بتقرأه هيك (بدون VITE_، فما بيوصل للمتصفح أبداً):
  // const apiKey = process.env.TRIVIA_API_KEY;

  const response = await fetch(
    `https://opentdb.com/api.php?amount=${amount}&type=multiple&encode=url3986`
  );

  if (!response.ok) {
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }

  const data = await response.json();
  return Response.json(data);
}