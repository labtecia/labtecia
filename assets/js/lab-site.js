(function () {
  "use strict";

  const DATA_URL = "data/site.json";
  const pageName = document.body.dataset.page || "index";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const data = await loadSiteData();
      renderShared(data);

      if (pageName === "team") renderTeamPage(data);
      else if (pageName === "event") renderEventPage(data);
      else if (pageName === "events") renderEventsArchive(data);
      else renderHomePage(data);

      activateImageFallbacks();
      refreshTemplatePlugins();
    } catch (error) {
      renderError("Content could not be loaded", error.message);
    }
  }

  async function loadSiteData() {
    if (window.location.protocol === "file:" && window.LABTEC_DATA) {
      return window.LABTEC_DATA;
    }

    try {
      const response = await fetch(DATA_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
      return await response.json();
    } catch (error) {
      if (window.LABTEC_DATA) return window.LABTEC_DATA;
      throw error;
    }
  }

  function renderShared(data) {
    const contact = data.site.contact;

    setHTML("#footer-contact", `
      <p>${esc(contact.address)}</p>
      <p class="mt-3"><strong>Phone:</strong> <span>${esc(contact.phone)}</span></p>
      <p><strong>Email:</strong> <span>${esc(contact.email)}</span></p>
    `);

    setHTML("#footer-social", data.site.social.map((item) => `
      <a href="${attr(item.url)}" target="_blank" rel="noopener" aria-label="${attr(item.label)}">
        <i class="bi ${attr(item.icon)}"></i>
      </a>
    `).join(""));

    setHTML("#footer-teams", sortedTeams(data).map((team) => `
      <li><a href="team.html?id=${attr(team.id)}">${esc(team.shortName)} · ${esc(team.name)}</a></li>
    `).join(""));
  }

  function renderHomePage(data) {
    const teams = sortedTeams(data);

    setHTML("#hero-stats", [
      statChip("Teams", teams.length),
      statChip("Events", data.events.length)/*,
      statChip("Media sets", (data.mediaArchive || []).length),
      statChip("Archive pages", (data.legacyPages || []).length)*/
    ].join(""));

    setHTML("#about-team-list", teams.map((team) => `
      <a class="about-team-item" href="team.html?id=${attr(team.id)}">
        <span>Team ${esc(team.order)}</span>
        <strong>${esc(team.name)}</strong>
        <small>${esc(team.head)}</small>
      </a>
    `).join(""));

    setHTML("#teams-grid", teams.map(renderTeamCard).join(""));
    setHTML("#home-events-list", data.events.map((event) => renderEventFeedItem(event, { compact: true })).join(""));
    setHTML("#official-resources", renderOfficialResources(data));
    setHTML("#publication-summary", renderPublicationSummary(teams));
    setHTML("#contact-grid", renderContact(data.site));
  }

  function renderEventsArchive(data) {
    setHTML("#events-archive-list", data.events.map((event) => renderEventFeedItem(event, { compact: false })).join(""));
  }

  function renderTeamPage(data) {
    const id = new URLSearchParams(window.location.search).get("id") || data.teams[0].id;
    const team = data.teams.find((item) => item.id === id);
    const root = document.querySelector("#team-root");
    if (!root) return;

    if (!team) {
      root.innerHTML = notFound("Team not found", "The requested team does not exist in the site data.", "index.html#teams", "Back to teams");
      return;
    }

    document.title = `${team.shortName} | LABTEC-IA`;
    const studentProfiles = team.phdStudents?.studentProfiles || [];
    const profileLinks = team.members.flatMap((member) => (member.profiles || []).map((profile) => ({ member, profile })));

    root.innerHTML = `
      <section class="page-hero team-detail-hero">
        <div class="container detail-hero-grid">
          <div>
            <p class="eyebrow">Team ${esc(team.order)} · ${esc(team.shortName)}</p>
            <h1>${esc(team.name)}</h1>
            <p>${esc(team.head)}</p>
            <div class="detail-nav">
              <a href="index.html#teams"><i class="bi bi-arrow-left"></i> All teams</a>
              <a href="#members"><i class="bi bi-people"></i> Members</a>
              <a href="#publications"><i class="bi bi-journal-text"></i> Publications</a>
            </div>
          </div>
          <div class="detail-hero-media contain" data-initials="${attr(initials(team.shortName))}">
            ${image(team.logo, `${team.shortName} logo`, { lazy: false })}
          </div>
        </div>
      </section>

      <section class="section detail-section">
        <div class="container">
          <div class="row gy-5">
            <div class="col-lg-6" data-aos="fade-up">
              <h2>Mission</h2>
              ${paragraphs(team.mission)}
              ${team.summary ? `<p>${esc(team.summary)}</p>` : ""}
            </div>
            <div class="col-lg-6" data-aos="fade-up" data-aos-delay="100">
              ${team.objectives?.length ? `<h2>Specific Mission Elements</h2>${bulletList(team.objectives)}` : ""}
              <h2>Research Focus</h2>
              ${bulletList(team.researchFocus || [])}
            </div>
          </div>
        </div>
      </section>

      <section id="members" class="section light-background team-members">
        <div class="container">
          <div class="lab-section-title text-center" data-aos="fade-up">
            <span>Members</span>
            <h2>${esc(team.shortName)} team</h2>
            ${team.membershipNote ? `<p>${esc(team.membershipNote)}</p>` : ""}
          </div>
          <div class="row gy-4">${team.members.map((member) => renderMemberCard(member, team)).join("")}</div>
        </div>
      </section>

      <section id="phd" class="section detail-section">
        <div class="container">
          <div class="row gy-5">
            <div class="col-lg-6" data-aos="fade-up">
              <h2>PhD Students</h2>
              ${studentBlock("Current PhD student", team.phdStudents?.current)}
              ${studentBlock(team.phdStudents?.pastLabel || "Past PhD student", team.phdStudents?.past)}
            </div>
            <div class="col-lg-6" data-aos="fade-up" data-aos-delay="100">
              <h2>Student Profiles</h2>
              ${studentProfiles.length ? `<div class="row gy-4">${studentProfiles.map((student) => renderMemberCard(student, team)).join("")}</div>` : `<p class="muted-copy">No student profile cards were included in the original page for this team.</p>`}
            </div>
          </div>
        </div>
      </section>

      <section id="publications" class="section light-background">
        <div class="container">
          <div class="lab-section-title" data-aos="fade-up">
            <span>Publications</span>
            <h2>Research profiles</h2>
          </div>
          <p>You can visit our Google scholar profiles for the full list of publications:</p>
          <div class="resource-list">${profileLinks.map(({ member, profile }) => resourceCard(member.name, profile.url, profile.label, "bi-journal-text")).join("")}</div>
        </div>
      </section>
    `;
  }

  function renderEventPage(data) {
    const id = new URLSearchParams(window.location.search).get("id") || data.events[0].id;
    const event = data.events.find((item) => item.id === id);
    const root = document.querySelector("#event-root");
    if (!root) return;

    if (!event) {
      root.innerHTML = notFound("Event not found", "The requested event does not exist in the site data.", "events.html", "Back to events");
      return;
    }

    document.title = `${event.title} | LABTEC-IA`;
    const gallery = [...(event.images || []), ...(event.gallery || [])];
    const hero = firstMedia(event);

    root.innerHTML = `
      <section class="page-hero event-detail-hero">
        <div class="container detail-hero-grid">
          <div>
            <p class="eyebrow">${esc(event.category || "Event")} ${event.date ? `· ${esc(event.date)}` : ""}</p>
            <h1>${esc(event.title)}</h1>
            ${event.summary ? `<p>${esc(event.summary)}</p>` : ""}
            <div class="detail-nav">
              <a href="events.html"><i class="bi bi-arrow-left"></i> All events</a>
              ${event.legacyPage ? `<a href="${attr(uri(event.legacyPage))}" target="_blank" rel="noopener"><i class="bi bi-archive"></i> Original page</a>` : ""}
            </div>
          </div>
          <div class="detail-hero-media" data-initials="${attr(initials(event.category || "Event"))}">
            ${hero ? image(hero, event.title, { lazy: false }) : fallback(initials(event.category || "Event"))}
          </div>
        </div>
      </section>

      <section class="section detail-section">
        <div class="container">
          <div class="row gy-5">
            <article class="col-lg-8 event-copy" data-aos="fade-up">
              <h2>Details</h2>
              ${paragraphs(event.body)}
              ${linkButtons(event.links)}
            </article>
            <aside class="col-lg-4" data-aos="fade-up" data-aos-delay="100">
              <div class="side-panel">
                <h2>Resources</h2>
                <div class="resource-list">
                  ${(event.attachments || []).map((item) => resourceCard(item.label, item.url, item.type || "File", "bi-file-earmark-pdf")).join("")}
                  ${(event.videos || []).map((item) => resourceCard(item.label, item.url, "Video", "bi-play-circle")).join("")}
                  ${!(event.attachments || []).length && !(event.videos || []).length ? `<p class="muted-copy">No attachments or videos listed for this event.</p>` : ""}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      ${(event.videos || []).length ? `
        <section class="section light-background">
          <div class="container">
            <div class="lab-section-title" data-aos="fade-up">
              <span>Video</span>
              <h2>Event media</h2>
            </div>
            <div class="row gy-4">${event.videos.map(renderVideo).join("")}</div>
          </div>
        </section>
      ` : ""}

      ${gallery.length ? `
        <section class="section gallery-section">
          <div class="container">
            <div class="lab-section-title" data-aos="fade-up">
              <span>Gallery</span>
              <h2>Images</h2>
            </div>
            <div class="row gy-4">${gallery.map((item) => renderMediaTile(item, event.title)).join("")}</div>
          </div>
        </section>
      ` : ""}
    `;
  }

  function renderTeamCard(team) {
    return `
      <div class="col-lg-6" data-aos="fade-up">
        <article class="team-card">
          <div class="team-card-media" data-initials="${attr(initials(team.shortName))}">
            ${image(team.image, team.name)}
          </div>
          <div class="team-card-body">
            <div class="team-kicker">Team ${esc(team.order)} · ${esc(team.shortName)}</div>
            <h3><a href="team.html?id=${attr(team.id)}">${esc(team.name)}</a></h3>
            <p class="team-head">Team head : ${esc(team.head)}</p>
            <p>${esc(truncate(team.mission?.[0] || "", 230))}</p>
            <a class="lab-inline-link" href="team.html?id=${attr(team.id)}">Open team page <i class="bi bi-arrow-right"></i></a>
          </div>
        </article>
      </div>
    `;
  }

  function renderEventFeedItem(event, options = {}) {
    const media = firstMedia(event);
    const mediaCount = (event.images || []).length + (event.gallery || []).length;
    const resourceCount = (event.attachments || []).length + (event.videos || []).length;

    return `
      <article class="event-feed-item">
        <a class="event-feed-media" href="event.html?id=${attr(event.id)}" data-initials="${attr(initials(event.category || "Event"))}">
          ${media ? image(media, event.title, { lazy: false }) : fallback(initials(event.category || "Event"))}
        </a>
        <div class="event-feed-body">
          <div class="event-meta">${esc(event.category || "Event")} ${event.date ? `· ${esc(event.date)}` : ""}</div>
          <h3><a href="event.html?id=${attr(event.id)}">${esc(event.title)}</a></h3>
          <p>${esc(event.summary || truncate(event.body?.[0] || "", options.compact ? 190 : 260))}</p>
          <div class="event-badges">
            ${mediaCount ? `<span><i class="bi bi-images"></i> ${mediaCount} media</span>` : ""}
            ${resourceCount ? `<span><i class="bi bi-paperclip"></i> ${resourceCount} resources</span>` : ""}
          </div>
          <div class="event-actions">
            <a class="lab-inline-link" href="event.html?id=${attr(event.id)}">Details <i class="bi bi-arrow-right"></i></a>
            ${(event.links || []).slice(0, options.compact ? 1 : 3).map((link) => `<a class="event-link" href="${attr(uri(link.url))}" ${target(link.url)}>${esc(link.label)}</a>`).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderMemberCard(member, team) {
    return `
      <div class="col-lg-4 col-md-6" data-aos="fade-up">
        <article class="member-card">
          <div class="member-photo" data-initials="${attr(initials(member.name))}">
            ${image(member.image, member.name)}
          </div>
          <div class="member-body">
            <h3>${esc(member.name)}</h3>
            <p class="member-role">${esc(member.role || "Team member")} · ${esc(team.shortName)}</p>
            ${paragraphs((member.bio || "").split("\n\n"))}
            <div class="member-actions">
              ${member.contact ? `<a href="${attr(uri(member.contact))}" ${target(member.contact)}>${esc(member.contactLabel || "Contact")}</a>` : ""}
              ${(member.profiles || []).map((profile) => `<a href="${attr(uri(profile.url))}" target="_blank" rel="noopener">${esc(profile.label)}</a>`).join("")}
            </div>
          </div>
        </article>
      </div>
    `;
  }

  function renderOfficialResources(data) {
    return data.site.resources.map((item) => resourceCard(item.label, item.url, item.type, "bi-file-earmark-pdf")).join("");
  }

  function renderPublicationSummary(teams) {
    return teams.map((team) => {
      const count = team.members.reduce((total, member) => total + (member.profiles || []).length, 0);
      return `
        <a class="team-publication-row" href="team.html?id=${attr(team.id)}#publications">
          <strong>${esc(team.shortName)}</strong>
          <span>${esc(team.name)}</span>
          <em>${count} profile${count === 1 ? "" : "s"}</em>
        </a>
      `;
    }).join("");
  }

  function renderContact(site) {
    const contact = site.contact;
    const cards = [
      ["bi-geo-alt", "Address", contact.address, ""],
      ["bi-telephone", "Phone", contact.phone, `tel:${contact.phone.replace(/\s+/g, "")}`],
      ["bi-envelope", "Email", contact.email, `mailto:${contact.email}`]
    ];

    return cards.map(([icon, title, text, href]) => `
      <div class="col-lg-4 col-md-6" data-aos="fade-up">
        <div class="contact-card">
          <i class="bi ${icon}"></i>
          <h3>${esc(title)}</h3>
          ${href ? `<p><a href="${attr(href)}">${esc(text)}</a></p>` : `<p>${esc(text)}</p>`}
        </div>
      </div>
    `).join("");
  }

  function resourceCard(title, href, meta, icon) {
    return `
      <a class="resource-card" href="${attr(uri(href))}" ${target(href)}>
        <i class="bi ${attr(icon || "bi-box-arrow-up-right")}"></i>
        <span>
          <strong>${esc(title)}</strong>
          <small>${esc(meta || href)}</small>
        </span>
      </a>
    `;
  }

  function renderVideo(video) {
    return `
      <div class="col-lg-8" data-aos="fade-up">
        <div class="video-frame">
          <video controls preload="metadata">
            <source src="${attr(uri(video.url))}" type="video/mp4">
            Your browser does not support HTML video.
          </video>
        </div>
        <p class="muted-copy mt-2">${esc(video.label)}</p>
      </div>
    `;
  }

  function renderMediaTile(item, title) {
    const label = item.split("/").pop();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(item);
    if (isImage) {
      return `
        <div class="col-lg-3 col-md-4 col-sm-6" data-aos="fade-up">
          <a class="gallery-tile glightbox" href="${attr(uri(item))}" data-gallery="${attr(slug(title))}">
            <span data-initials="${attr(initials(title))}">${image(item, label)}</span>
            <small>${esc(label)}</small>
          </a>
        </div>
      `;
    }

    return `
      <div class="col-lg-3 col-md-4 col-sm-6" data-aos="fade-up">
        <a class="gallery-tile file-tile" href="${attr(uri(item))}" ${target(item)}>
          ${fallback(/\.(mp4|webm|mov)$/i.test(item) ? "VID" : "PDF")}
          <small>${esc(label)}</small>
        </a>
      </div>
    `;
  }

  function statChip(label, value) {
    return `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  }

  function studentBlock(label, students = []) {
    return `
      <h3>${esc(label)}:</h3>
      ${students.length ? bulletList(students) : `<p class="muted-copy">No names were listed in the original page.</p>`}
    `;
  }

  function bulletList(items) {
    return `<ul class="clean-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }

  function linkButtons(links = []) {
    if (!links.length) return "";
    return `
      <div class="link-button-row">
        ${links.map((link) => `<a href="${attr(uri(link.url))}" ${target(link.url)}><i class="bi bi-box-arrow-up-right"></i> ${esc(link.label)}</a>`).join("")}
      </div>
    `;
  }

  function paragraphs(value) {
    const items = Array.isArray(value) ? value : [value];
    return items
      .flatMap((item) => String(item || "").split("\n\n"))
      .filter(Boolean)
      .map((item) => `<p>${esc(item)}</p>`)
      .join("");
  }

  function image(src, alt, options = {}) {
    if (!src) return "";
    const loading = options.lazy === false ? "" : ' loading="lazy"';
    return `<img src="${attr(uri(src))}" alt="${attr(alt || "")}"${loading} data-fallback>`;
  }

  function fallback(text) {
    return `<div class="image-fallback">${esc(text)}</div>`;
  }

  function firstMedia(event) {
    return event.images?.[0] || event.gallery?.[0] || "";
  }

  function sortedTeams(data) {
    return [...data.teams].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function truncate(text, max) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trim()}...` : clean;
  }

  function initials(text) {
    const letters = String(text || "")
      .split(/[\s&\-–—:()]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return letters || "LAB";
  }

  function slug(text) {
    return String(text || "gallery").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function target(href = "") {
    if (/^mailto:|^tel:/i.test(href)) return "";
    return /^https?:\/\//i.test(href) || /\.(pdf|jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i.test(href)
      ? 'target="_blank" rel="noopener"'
      : "";
  }

  function uri(value = "") {
    if (/^mailto:|^tel:/i.test(value)) return value;
    return encodeURI(String(value));
  }

  function activateImageFallbacks() {
    document.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", () => {
        const container = img.closest("[data-initials]") || img.parentElement;
        const text = container?.dataset.initials || "IMG";
        const div = document.createElement("div");
        div.className = "image-fallback";
        div.textContent = text;
        img.replaceWith(div);
      }, { once: true });
    });
  }

  function refreshTemplatePlugins() {
    if (window.AOS) window.AOS.refreshHard();
    if (window.GLightbox) window.GLightbox({ selector: ".glightbox" });
  }

  function renderError(title, message) {
    const root = document.querySelector("main") || document.body;
    root.innerHTML = notFound(title, message, "index.html", "Back home");
  }

  function notFound(title, message, href, label) {
    return `
      <section class="section not-found">
        <div class="container text-center">
          <h1>${esc(title)}</h1>
          <p>${esc(message)}</p>
          <a class="lab-primary-btn" href="${attr(href)}">${esc(label)}</a>
        </div>
      </section>
    `;
  }

  function setHTML(selector, html) {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = html;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function attr(value) {
    return esc(value);
  }
})();
