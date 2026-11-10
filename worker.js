
const ALLOWED_ORIGIN = "https://ahmadmamennn-coder.github.io";

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin");

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({
        status: "online",
        aiConfigured: false,
        message: "StoryFrame Worker is running."
      }, { headers });
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Format permintaan tidak valid." },
          { status: 400, headers }
        );
      }

      if (
        typeof body.idea !== "string" ||
        !body.idea.trim() ||
        body.idea.length > 3000
      ) {
        return Response.json(
          { error: "Ide cerita wajib diisi." },
          { status: 400, headers }
        );
      }

      return Response.json({
        error: "AI belum dikonfigurasi.",
        message: "Backend StoryFrame sudah menerima permintaan."
      }, { status: 503, headers });
    }

    return Response.json(
      { error: "Endpoint tidak ditemukan." },
      { status: 404, headers }
    );
  }
};
