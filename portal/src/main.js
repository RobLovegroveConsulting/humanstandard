import "./style.css";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth, configured, authReady } from "./firebase";
import * as repo from "./repository";
import { initialClients, modules } from "./domain";
const app = document.querySelector("#app");
let state = {
  user: null,
  member: null,
  clients: [],
  selected: null,
  tab: "overview",
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const notice = (message) => {
  document.querySelector("#notice").textContent = message;
};
const execute = (fn) => async (e) => {
  e?.preventDefault();
  const button = e?.submitter || e?.currentTarget;
  if (button) button.disabled = true;
  try {
    await fn(e);
  } catch (err) {
    notice(
      err.code?.startsWith("auth/")
        ? "Sign-in could not be completed. Check your details or use password reset."
        : err.message,
    );
  } finally {
    if (button) button.disabled = false;
  }
};
function login() {
  app.innerHTML = `<main class="login"><div class="login-story"><div class="wordmark">Human<br>Standard<span>WORKSPACE</span></div><p class="eyebrow">THE DIFFERENCE IS HUMAN</p><h1>Your clients.<br>Your standards.<br>A little more space.</h1><p>A private home for your brands, your social workforce and the people who protect the standard.</p></div><section class="login-card"><p class="eyebrow">ROB & SAM’S WORKSPACE</p><h2>Welcome back.</h2><p>Sign in with your individual workspace account.</p><form id="login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button ${configured ? "" : "disabled"}>Sign in →</button></form><button class="quiet" id="reset">Reset password</button><p id="notice" role="status">${configured ? "Access is granted by invitation only." : "Firebase configuration is required before sign-in."}</p></section></main>`;
  document.querySelector("#login").onsubmit = execute(async (e) => {
    const data = new FormData(e.target);
    await authReady;
    await signInWithEmailAndPassword(
      auth,
      data.get("email"),
      data.get("password"),
    );
  });
  document.querySelector("#reset").onclick = execute(async () => {
    const email = document.querySelector("[name=email]").value;
    if (!email) throw Error("Enter your email address first.");
    await sendPasswordResetEmail(auth, email);
    notice("If an account exists, password reset instructions will be sent.");
  });
}
async function render() {
  const c = state.clients.find((c) => c.id === state.selected);
  app.innerHTML = `<div class="workspace"><aside><div class="wordmark">Human<br>Standard<span>WORKSPACE</span></div><p class="eyebrow">YOUR WORKSPACE</p>${["overview", "brands", "social", "activity", "settings"].map((t) => `<button class="nav ${state.tab === t ? "active" : ""}" data-tab="${t}">${{ overview: "◈ Overview", brands: "▧ Clients & brands", social: "✳ Social Workforce", activity: "↗ Activity log", settings: "⚙ Connections" }[t]}</button>`).join("")}<div class="aside-bottom"><small>THE DIFFERENCE IS HUMAN</small><p>${esc(state.user.email)}</p><button id="logout" class="quiet">Sign out</button></div></aside><main class="content"><header><div><p class="eyebrow">HUMAN STANDARD / PRIVATE WORKSPACE</p><h1>${{ overview: "Room to do good work.", brands: "Every brand, understood.", social: "Your Social Workforce.", activity: "A clear line of sight.", settings: "Connected with care." }[state.tab]}</h1></div><span class="pill">● ${esc(state.member.role)}</span></header><div id="notice" role="status"></div><div id="view"></div></main></div>`;
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        state.tab = b.dataset.tab;
        render().catch((e) => notice(e.message));
      }),
  );
  document.querySelector("#logout").onclick = () => signOut(auth);
  const view = document.querySelector("#view");
  if (state.tab === "overview") {
    view.innerHTML = `<p class="lede">AI does the groundwork. People protect the standard.</p><div class="stats"><article><strong>${state.clients.length}</strong><span>Client workspaces</span></article><article><strong>01</strong><span>Workforce module in development</span></article><article><strong>Human</strong><span>Approval before publication</span></article></div><section class="panel"><div class="section-head"><h2>Your clients</h2><button id="manage" class="secondary">Manage brands →</button></div><div class="client-grid">${state.clients.length ? state.clients.map((x) => `<button class="client-card" data-client="${x.id}"><span class="monogram">${esc(x.name.slice(0, 2).toUpperCase())}</span><h3>${esc(x.name)}</h3><small>${esc(x.status)} · Brand library →</small></button>`).join("") : "<p>Add your first clients to begin. Their profiles will be stored securely in Firebase.</p>"}</div></section><section class="panel"><h2>Your workforce</h2>${modules.map((m) => `<div class="row"><span>${m.name}</span><span class="pill">${m.enabled ? "Foundation ready" : "Future module"}</span></div>`).join("")}</section>`;
    document.querySelector("#manage").onclick = () => {
      state.tab = "brands";
      render();
    };
    document.querySelectorAll("[data-client]").forEach(
      (b) =>
        (b.onclick = () => {
          state.selected = b.dataset.client;
          state.tab = "brands";
          render();
        }),
    );
  }
  if (state.tab === "brands") {
    view.innerHTML = `<div class="section-head"><p class="lede">The source of truth for every client.</p><button id="new">+ New client</button></div><label>Client<select id="client"><option value="">New client</option>${state.clients.map((x) => `<option value="${x.id}" ${c?.id === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label><div class="columns"><section class="panel"><h2>${c ? "Brand profile" : "Onboard a client"}</h2><form id="profile"><label>Client name<input name="name" maxlength="120" value="${esc(c?.name)}" required list="initial"></label><datalist id="initial">${initialClients.map((n) => `<option value="${n}">`).join("")}</datalist><label>Website<input name="website" value="${esc(c?.website)}" type="url"></label><label>Colour palette<input name="colours" placeholder="#203E32, #DCE6DF" value="${esc(c?.colours?.join(", "))}"></label><label>Tone of voice & brand instructions<textarea name="tone" maxlength="5000" rows="6">${esc(c?.tone)}</textarea></label><button>Save brand profile →</button></form></section><section class="panel"><h2>Brand library</h2><p>Logos, brand guidelines and approved imagery. PNG, JPG, WebP or PDF, up to 20 MB.</p>${c ? '<form id="upload"><label>Asset type<select name="category"><option>Logo</option><option>Brand guidelines</option><option>Imagery</option></select></label><label>Choose file<input name="file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required></label><button>Upload asset ↑</button></form><div id="assets">Loading assets…</div>' : "<p>Save the profile to open this client’s library.</p>"}</section></div>`;
    document.querySelector("#new").onclick = () => {
      state.selected = null;
      render();
    };
    document.querySelector("#client").onchange = (e) => {
      state.selected = e.target.value;
      render();
    };
    document.querySelector("#profile").onsubmit = execute(async (e) => {
      state.selected = await repo.saveClient(
        Object.fromEntries(new FormData(e.target)),
        c?.id,
      );
      state.clients = await repo.clients();
      await render();
      notice("Brand profile saved.");
    });
    if (c) {
      document.querySelector("#upload").onsubmit = execute(async (e) => {
        const f = new FormData(e.target);
        await repo.uploadAsset(c.id, f.get("file"), f.get("category"));
        await render();
        notice("Asset uploaded.");
      });
      const assets = await repo.assets(c.id);
      document.querySelector("#assets").innerHTML = assets.length
        ? assets
            .map(
              (a, i) =>
                `<div class="row"><span>${esc(a.name)}<small>${esc(a.category)} · ${Math.ceil(a.size / 1024)} KB</small></span><button class="secondary" data-download="${i}">Download</button></div>`,
            )
            .join("")
        : '<p class="empty">No assets yet. Start with the logo.</p>';
      document
        .querySelectorAll("[data-download]")
        .forEach(
          (b) =>
            (b.onclick = execute(() =>
              repo.downloadAsset(assets[Number(b.dataset.download)]),
            )),
        );
    }
  }
  if (state.tab === "social") {
    view.innerHTML = `<p class="lede">A considered workflow, from first draft to human approval.</p><div class="banner">Metricool and Meta are not connected. Scheduling, analytics, AI monitoring and autonomous engagement are awaiting integration.</div><label>Client<select id="social-client"><option value="">Choose a client</option>${state.clients.map((x) => `<option value="${x.id}" ${c?.id === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>${c ? '<div class="columns"><section class="panel"><h2>Create a draft</h2><form id="draft"><label>Channel<select name="platform"><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label><label>Post copy<textarea name="text" maxlength="2200" rows="8" required></textarea></label><button>Save draft →</button></form></section><section class="panel"><h2>Review queue</h2><div id="posts">Loading…</div></section></div>' : '<section class="panel">Choose a client to create and review social drafts.</section>'}`;
    document.querySelector("#social-client").onchange = (e) => {
      state.selected = e.target.value;
      render();
    };
    if (c) {
      document.querySelector("#draft").onsubmit = execute(async (e) => {
        await repo.saveDraft(c.id, Object.fromEntries(new FormData(e.target)));
        await render();
        notice("Draft saved.");
      });
      const posts = await repo.posts(c.id);
      document.querySelector("#posts").innerHTML = posts.length
        ? posts
            .map(
              (p, i) =>
                `<article class="post"><span class="pill">${esc(p.platform)} · ${esc(p.status.replaceAll("_", " "))}</span><p class="post-copy">${esc(p.text)}</p>${(p.status ===
                "draft"
                  ? [["pending_approval", "Send for approval"]]
                  : p.status === "pending_approval"
                    ? [
                        ["approved", "Approve"],
                        ["draft", "Return to draft"],
                      ]
                    : [["draft", "Reopen draft"]]
                )
                  .map(
                    ([s, label]) =>
                      `<button class="secondary" data-post="${i}" data-status="${s}">${label}</button>`,
                  )
                  .join(
                    "",
                  )}${p.status === "approved" ? "<small>Approved for scheduling. Provider connection required.</small>" : ""}</article>`,
            )
            .join("")
        : "<p>No drafts yet.</p>";
      document.querySelectorAll("[data-post]").forEach(
        (b) =>
          (b.onclick = execute(async () => {
            await repo.transition(
              c.id,
              posts[b.dataset.post],
              b.dataset.status,
            );
            await render();
          })),
      );
    }
  }
  if (state.tab === "activity") {
    const logs = await repo.activity();
    view.innerHTML = `<section class="panel"><h2>Recent activity</h2><p>The latest 100 recorded workspace changes.</p>${logs.length ? logs.map((l) => `<div class="row"><span>${esc(l.action)}<small>${esc(state.clients.find((c) => c.id === l.clientId)?.name || l.clientId)} · Actor ${esc(l.actor)}</small></span><small>${esc(l.createdAt?.toDate().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" }) || "Pending timestamp")}</small></div>`).join("") : "<p>No activity yet.</p>"}</section>`;
  }
  if (state.tab === "settings")
    view.innerHTML = `<section class="panel"><h2>Connection status</h2>${[
      ["Firebase", "Web app configured; authenticated access required"],
      ["Metricool", "Not connected · Server-side credentials required"],
      ["Meta engagement", "Not connected · Approved API permissions required"],
      ["AI assistance", "Not connected · Provider and review policy required"],
    ]
      .map(([a, b]) => `<div class="row"><h3>${a}</h3><span>${b}</span></div>`)
      .join(
        "",
      )}<p>Provider secrets are never entered into client profiles or exposed in the browser.</p></section>`;
}
login();
if (configured)
  onAuthStateChanged(auth, async (user) => {
    state = { ...state, user, member: null, clients: [], selected: null };
    if (!user) return login();
    if (!user.emailVerified) {
      login();
      notice("Verify your email address before accessing the workspace.");
      const verify = document.createElement("button");
      verify.textContent = "Send verification email";
      verify.onclick = execute(async () => {
        await sendEmailVerification(user);
        notice("Verification email sent. Follow the link, then sign in again.");
      });
      document.querySelector(".login-card").append(verify);
      return;
    }
    try {
      state.member = await repo.membership();
      state.clients = await repo.clients();
      await render();
    } catch (e) {
      login();
      notice(e.message);
      await signOut(auth);
      notice(e.message);
    }
  });
