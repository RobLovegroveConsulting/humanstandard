export const initialClients = [
  "Cumquats Australia",
  "Esk Cheap Shop",
  "Mitre 10 Toogoolawah",
];
export const modules = [
  { id: "social", name: "Social Workforce", enabled: true },
  { id: "insights", name: "Insights & reporting", enabled: false },
  { id: "content", name: "Content Workforce", enabled: false },
];
export function profile(data) {
  const name = String(data.name || "").trim();
  if (!name || name.length > 120)
    throw Error("Enter a client name (up to 120 characters).");
  const colours = String(data.colours || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (colours.some((x) => !/^#[0-9a-f]{6}$/i.test(x)))
    throw Error("Use six-digit hex colours, separated by commas.");
  return {
    name,
    website: String(data.website || "")
      .trim()
      .slice(0, 500),
    tone: String(data.tone || "")
      .trim()
      .slice(0, 5000),
    colours,
    status: "onboarding",
  };
}
export function validateFile(file) {
  if (
    !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw Error("Use PNG, JPG, WebP or PDF files.");
  if (file.size <= 0) throw Error("The file is empty.");
  if (file.size > 20 * 1024 * 1024)
    throw Error("Files must be 20 MB or smaller.");
}
export function canTransition(from, to) {
  return (
    {
      draft: ["pending_approval"],
      pending_approval: ["approved", "draft"],
      approved: ["draft"],
    }[from]?.includes(to) || false
  );
}
