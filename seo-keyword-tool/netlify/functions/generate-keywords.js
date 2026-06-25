exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { niche, audience, goal } = JSON.parse(event.body);

    if (!niche || !audience || !goal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const prompt = `You are an expert SEO keyword researcher specialising in helping brand new websites with low domain authority rank on Google within 90 days.

The user runs a business with these details:
- Business/Niche: ${niche}
- Target Audience: ${audience}
- Content Goal: ${goal}

Generate exactly 20 long-tail keyword ideas this site can realistically rank for within 90 days as a brand new site with zero backlinks and low domain authority.

For each keyword return these exact fields:
- keyword: a specific 4-8 word phrase (never generic 1-2 word terms)
- intent: exactly one of "Informational", "Commercial", or "Transactional"
- difficulty: exactly one of "Low", "Medium", or "High" — for a NEW site with no authority
- content_type: exactly one of "How-to guide", "Case study", "Comparison", "Tutorial", "List post", or "Product showcase"
- quick_win: true or false — true means a brand new site can realistically rank top 10 within 60 days
- quick_win_reason: ONLY include this field when quick_win is true — write ONE specific sentence explaining exactly why a new site can beat the current results for this keyword, referencing the weakness of existing content

Rules for selection:
1. At least 6 keywords must be quick_win: true
2. Prioritise keywords where existing top results are generic, outdated, or from low-authority sites
3. Prioritise buyer-intent and problem-aware phrases
4. Every keyword must be directly relevant to the specific niche provided
5. Never include generic head terms like "SEO" or "marketing" alone

Return ONLY a valid raw JSON array. No explanation. No preamble. No markdown. No backticks. Start immediately with [ and end with ].

Example format:
[{"keyword":"...","intent":"Informational","difficulty":"Low","content_type":"How-to guide","quick_win":true,"quick_win_reason":"Current top results are generic guides that don't address this specific audience..."},{"keyword":"...","intent":"Commercial","difficulty":"Low","content_type":"Comparison","quick_win":false}]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "AI service error. Please try again." }),
      };
    }

    const data = await response.json();
    const rawText = data.content[0].text.trim();

    // Strip any accidental markdown fences
    const clean = rawText.replace(/```json|```/g, "").trim();
    const keywords = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(keywords),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong. Please try again in 30 seconds." }),
    };
  }
};
