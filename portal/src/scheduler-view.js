import * as repo from "./repository";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function brisbaneTime(value) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value || ""))
    throw Error("Choose a publication date and time.");
  const date = new Date(value + ":00+10:00");
  if (!Number.isFinite(date.getTime()))
    throw Error("Invalid publication time.");
  return date.toISOString();
}
export async function renderScheduler(container, posts) {
  container.innerHTML =
    "<h2>Esk Cheap Shop schedule</h2><p>Loading pilot connection…</p>";
  let data;
  try {
    data = await repo.schedules();
  } catch (e) {
    container.innerHTML = `<h2>Esk Cheap Shop schedule</h2><p>${esc(e.message)}</p><p>Automatic publishing remains off until the pilot connection and staging tests are complete.</p>`;
    return;
  }
  const scheduled = new Set(
    data.jobs
      .filter((j) =>
        [
          "queued",
          "processing",
          "sending",
          "published",
          "needs_attention",
        ].includes(j.status),
      )
      .map((j) => j.postId),
  );
  const eligible = posts.filter(
    (p) => p.status === "approved" && !scheduled.has(p.id),
  );
  container.innerHTML = `<h2>Esk Cheap Shop schedule</h2><button class="secondary" id="refresh-schedule">Refresh status</button><p>${data.enabled ? "Connected pilot: approved posts publish automatically with the browser closed." : "Meta connection pending. Automatic publication is off."}</p><form id="schedule-form"><label>Approved post<select name="postId" required><option value="">Choose a post</option>${eligible.map((p) => `<option value="${esc(p.id)}">${esc(p.platform)} · ${esc(p.text.slice(0, 80))}</option>`).join("")}</select></label><label>Publication time · Australia/Brisbane<input name="publishAt" type="datetime-local" required></label><button ${data.enabled ? "" : "disabled"}>Schedule automatic publication →</button></form><p role="status" id="schedule-notice"></p><div>${data.jobs.map((j) => `<article class="post"><span class="pill">${esc(j.platform)} · ${esc(j.status.replaceAll("_", " "))}</span><p>${esc(new Date(j.publishAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" }))} · Brisbane</p><small>${esc(posts.find((p) => p.id === j.postId)?.text.slice(0, 100) || j.postId)}</small>${j.error ? `<p>Needs review: ${esc(j.error)}</p>` : ""}${j.providerId ? `<small>Meta confirmation: ${esc(j.providerId)}</small>` : ""}${["queued", "processing"].includes(j.status) ? `<button class="secondary" data-cancel="${esc(j.id)}">Cancel schedule</button>` : ""}</article>`).join("") || "<p>No scheduled posts yet.</p>"}</div>`;
  container.querySelector("#refresh-schedule").onclick = () =>
    renderScheduler(container, posts);
  const notice = (s) =>
    (container.querySelector("#schedule-notice").textContent = s);
  container.querySelector("#schedule-form").onsubmit = async (e) => {
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      const f = new FormData(e.target);
      await repo.schedulePost(
        f.get("postId"),
        brisbaneTime(f.get("publishAt")),
      );
      await renderScheduler(container, posts);
    } catch (error) {
      notice(error.message);
    } finally {
      if (e.submitter.isConnected) e.submitter.disabled = !data.enabled;
    }
  };
  container.querySelectorAll("[data-cancel]").forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        try {
          await repo.cancelSchedule(b.dataset.cancel);
          await renderScheduler(container, posts);
        } catch (error) {
          notice(error.message);
          b.disabled = false;
        }
      }),
  );
}
