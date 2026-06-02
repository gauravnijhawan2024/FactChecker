import type { Analysis } from "../types/analysis";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(body.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function submitUrl(url: string) {
  const response = await fetch(`${API_BASE_URL}/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  return readJson<{ analysisId: string; status: string }>(response);
}

export async function submitText(text: string) {
  const response = await fetch(`${API_BASE_URL}/analyze/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  return readJson<{ analysisId: string; status: string }>(response);
}

export async function submitImage(image: File) {
  const formData = new FormData();
  formData.append("image", image);

  const response = await fetch(`${API_BASE_URL}/analyze/image`, {
    method: "POST",
    body: formData
  });

  return readJson<{ analysisId: string; status: string }>(response);
}

export async function getAnalysis(id: string) {
  const response = await fetch(`${API_BASE_URL}/analyze/${id}`);
  return readJson<Analysis>(response);
}

