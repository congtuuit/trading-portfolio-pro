/**
 * ai.js
 * Handles AI API integrations (Gemini, OpenAI)
 */

export async function queryAI(inputData, settings) {
  if (!settings.apiKey) {
    throw new Error(
      "Chưa cấu hình API Key. Vui lòng mở Settings ⚙️ để nhập khóa API.",
    );
  }

  let messages = [];
  if (typeof inputData === "string") {
    messages = [{ role: "user", text: inputData }];
  } else if (Array.isArray(inputData)) {
    messages = inputData;
  }

  if (settings.aiProvider === "gemini") {
    const model = settings.aiModel || "gemini-1.5-flash";
    return await queryGemini(messages, model, settings.apiKey);
  } else if (settings.aiProvider === "openai") {
    const model = settings.aiModel || "gpt-4o-mini";
    return await queryOpenAI(messages, model, settings.apiKey);
  } else {
    throw new Error("Nhà cung cấp AI không hợp lệ.");
  }
}

async function queryGemini(messages, model, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  const payload = {
    contents: contents,
    system_instruction: {
      parts: [
        { text: "Bạn là một trợ lý giao dịch tài chính chuyên nghiệp, am hiểu chiến thuật lướt T0 (Thay nước) và phân tích kỹ thuật (Fibonacci, S/R). Luôn trả lời súc tích, quyết đoán, đủ ý và có dữ liệu dẫn chứng." }
      ]
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      topP: 0.8,
      topK: 40
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Lỗi giao tiếp với Gemini API.");
  }

  const data = await response.json();
  if (
    data.candidates &&
    data.candidates[0].content &&
    data.candidates[0].content.parts
  ) {
    // Join all parts to avoid truncation
    return data.candidates[0].content.parts.map(p => p.text).join("");
  }

  throw new Error("Gemini không trả về kết quả hợp lệ.");
}

async function queryOpenAI(messagesArr, model, apiKey) {
  const url = "https://api.openai.com/v1/chat/completions";

  const mappedMessages = messagesArr.map(m => ({
    role: m.role,
    content: m.text
  }));

  const payload = {
    model: model,
    messages: [
      {
        role: "system",
        content:
          "Bạn là một chuyên gia tư vấn đầu tư tài chính nhạy bén và kỷ luật. Luôn trả lời trọng tâm, format rõ ràng.",
      },
      ...mappedMessages
    ],
    temperature: 0.1,
    max_tokens: 2048,
    top_p: 0.8,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("[TPP] OpenAI API Error:", errData);
    throw new Error(errData.error?.message || "Lỗi giao tiếp với OpenAI API.");
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }

  throw new Error("OpenAI không trả về kết quả hợp lệ.");
}

export async function fetchModels(provider, apiKey) {
  if (!apiKey) throw new Error("Chưa nhập API Key.");

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Key không hợp lệ hoặc nghẹt mạng.");
    const data = await res.json();
    return data.models
      .filter(
        (m) =>
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent"),
      )
      .map((m) => m.name.replace("models/", ""));
  } else if (provider === "openai") {
    const url = "https://api.openai.com/v1/models";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("API Key không hợp lệ hoặc nghẹt mạng.");
    const data = await res.json();
    return data.data
      .filter((m) => m.id.includes("gpt"))
      .map((m) => m.id)
      .sort();
  }
  return [];
}
