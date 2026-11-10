
const ALLOWED_ORIGIN = "https://storyframe-private-pages.pages.dev";
const MODEL = "@cf/google/gemma-4-26b-a4b-it";

function makeHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function errorResponse(message, status, headers) {
  return Response.json({ error: message }, { status, headers });
}

function parseAIResponse(result) {
  let content = result?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("Format jawaban AI tidak dikenali.");
  }

  content = content.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("AI tidak menghasilkan format JSON.");
    }

    return JSON.parse(content.slice(start, end + 1));
  }
}

export default {
  async fetch(request, env) {
    const headers = makeHeaders();
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (origin && origin !== ALLOWED_ORIGIN) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers });
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return errorResponse("Origin tidak diizinkan.", 403, headers);
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({
        status: "online",
        aiConfigured: Boolean(env.AI),
        message: "StoryFrame AI Worker is running."
      }, { headers });
    }

    if (url.pathname !== "/api/generate") {
      return errorResponse("Endpoint tidak ditemukan.", 404, headers);
    }

    if (request.method !== "POST") {
      return errorResponse("Metode tidak diizinkan.", 405, headers);
    }

    if (!env.AI) {
      return errorResponse("AI belum terhubung pada Worker.", 503, headers);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Format permintaan tidak valid.", 400, headers);
    }

    if (
      typeof body.idea !== "string" ||
      !body.idea.trim() ||
      body.idea.length > 3000
    ) {
      return errorResponse(
        "Ide cerita wajib diisi dan maksimal 3000 karakter.",
        400,
        headers
      );
    }

    const sceneCount = [5, 7, 10, 15].includes(Number(body.scenes))
      ? Number(body.scenes)
      : 5;

    const language = body.language === "en" ? "English" : "Indonesian";
    const style = String(body.style || "Epic Cinematic").slice(0, 60);
    const genre = String(body.genre || "Adventure").slice(0, 60);

    const prompt = `
You are StoryFrame, a professional cinematic storyboard writer.

Create a complete storyboard from this idea:
${body.idea}

Settings:
- Language: ${language}
- Genre: ${genre}
- Cinematic style: ${style}
- Exact number of scenes: ${sceneCount}

Return ONLY valid JSON. Do not use Markdown fences.

Use exactly this structure:
{
  "title": "Story title",
  "logline": "Short story summary",
  "scenes": [
    {
      "title": "Scene title",
      "visualPrompt": "Detailed visual description",
      "cameraDirection": "Camera angle and movement",
      "narration": "Narration or dialogue",
      "sound": "Music and sound design"
    }
  ]
}

Requirements:
- Create exactly ${sceneCount} scenes.
- Keep every scene connected to the story.
- Make visual descriptions cinematic and useful for storyboarding.
- Write all fields in ${language}.
- Keep content suitable for a general audience.
- Do not include graphic violence, explicit sexual content,
  or instructions for real-world harm.
- Return valid JSON with no text before or after it.
`;

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: "You create safe, original cinematic storyboards."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        chat_template_kwargs: {
          enable_thinking: false
        }
      });

      const data = parseAIResponse(result);

      if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
        throw new Error("Storyboard tidak memiliki adegan.");
      }

      const scenes = data.scenes.slice(0, sceneCount).map((scene, index) => ({
        title: String(scene.title || `Scene ${index + 1}`),
        visualPrompt: String(scene.visualPrompt || scene.visual || ""),
        cameraDirection: String(scene.cameraDirection || scene.camera || ""),
        narration: String(scene.narration || ""),
        sound: String(scene.sound || "")
      }));

      return Response.json({
        title: String(data.title || "StoryFrame Storyboard"),
        logline: String(data.logline || ""),
        scenes
      }, { headers });

    } catch (error) {
      return errorResponse(
        "Gagal menghasilkan storyboard. Silakan coba lagi.",
        502,
        headers
      );
    }
  }
};
