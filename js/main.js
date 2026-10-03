/* =========================================================
   SOMARA REALTY — main.js
   Vanilla JS only — no build step, no dependencies.
   ========================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------
     Header: transparent only at the very top of the page.
     Solid as soon as any scrolling happens — same behavior
     on every page, whether or not it has a hero. A plain
     passive scroll listener is plenty cheap for a single
     threshold comparison; no throttling needed.
  ----------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    function update() {
      header.classList.toggle("is-solid", window.scrollY > 8);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* -----------------------------------------------------
     Mobile menu
  ----------------------------------------------------- */
  function initMobileMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var menu = document.querySelector(".mobile-menu");
    var closeBtn = document.querySelector(".mobile-menu-close");
    if (!toggle || !menu) return;

    function open() {
      menu.classList.add("is-open");
      document.body.style.overflow = "hidden";
      var firstLink = menu.querySelector("a");
      if (firstLink) firstLink.focus();
    }
    function close() {
      menu.classList.remove("is-open");
      document.body.style.overflow = "";
      toggle.focus();
    }

    toggle.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) close();
    });
  }

  /* -----------------------------------------------------
     Property data — loaded from content/properties.json at
     runtime, which is exactly the file the admin panel
     (/admin) edits. Nothing here is hardcoded anymore.
  ----------------------------------------------------- */
  var PROPERTIES = [];

  /* -----------------------------------------------------
     Featured Properties (home page) — progressive reveal.
     Starts at 6 (2 rows x 3 cols), "View More" adds 3 at a
     time. Only active when the #propertiesViewMoreWrap button
     exists (home page); on the standalone /properties/ page,
     which has no such button, the full list renders at once,
     same as before.
  ----------------------------------------------------- */
  var propertiesViewState = { list: [], visibleCount: 6, pageSize: 3 };

  function renderVisibleProperties() {
    var slice = propertiesViewState.list.slice(0, propertiesViewState.visibleCount);
    renderProperties(slice, "propertyGrid");
    var wrap = document.getElementById("propertiesViewMoreWrap");
    if (wrap) {
      wrap.style.display =
        propertiesViewState.visibleCount < propertiesViewState.list.length ? "" : "none";
    }
  }

  function renderPropertiesSection(list) {
    var wrap = document.getElementById("propertiesViewMoreWrap");
    if (wrap) {
      propertiesViewState.list = list;
      propertiesViewState.visibleCount = 6;
      renderVisibleProperties();
    } else {
      // No pagination control on this page — render everything (e.g. /properties/).
      renderProperties(list, "propertyGrid");
    }
  }

  function initPropertiesViewMore() {
    var btn = document.getElementById("propertiesViewMoreBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      propertiesViewState.visibleCount += propertiesViewState.pageSize;
      renderVisibleProperties();
    });
  }

  /* -----------------------------------------------------
     Browse By Category — Off-Plan / Ready to Move In pills
     that filter and render inline on the home page itself,
     no separate page. Supports deep-linking via /#off-plan,
     /#ready-to-move-in (used by the footer).
  ----------------------------------------------------- */
  var CATEGORY_DESCRIPTIONS = {
    "Off-Plan": "Early access to new launches, structured payment plans included.",
    "Ready": "Ready homes across Dubai's most established communities."
  };
  var CATEGORY_LABELS = {
    "Off-Plan": "off-plan",
    "Ready": "ready to move in"
  };

  function initCategoryPills() {
    var pills = document.querySelectorAll(".category-pills .pill");
    var grid = document.getElementById("categoryGrid");
    var desc = document.getElementById("categoryDesc");
    var browseSection = document.getElementById("browse");
    if (!pills.length || !grid) return;

    var hashMap = { "off-plan": "Off-Plan", "ready-to-move-in": "Ready" };

    function renderCategory(cat) {
      var filtered = PROPERTIES.filter(function (p) { return p.status === cat; });
      if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No ' + (CATEGORY_LABELS[cat] || cat.toLowerCase()) + ' listings yet, check back soon.</p></div>';
      } else {
        grid.innerHTML = filtered.map(propertyCardHTML).join("");
        grid.querySelectorAll(".property-card").forEach(function (card) {
          card.addEventListener("click", function () { openModal(card.getAttribute("data-id")); });
          card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card.getAttribute("data-id")); }
          });
        });
      }
      if (desc) desc.textContent = CATEGORY_DESCRIPTIONS[cat] || "";
      pills.forEach(function (p) {
        var isActive = p.getAttribute("data-category") === cat;
        p.classList.toggle("is-active", isActive);
        p.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    // Handles /#off-plan, /#ready-to-move-in links (header nav, footer, and
    // any other page linking in) — these hashes have no matching element
    // id, so the browser won't auto-scroll; this does it manually and also
    // keeps working if the hash changes while already on the page.
    function applyHash(shouldScroll) {
      var hash = window.location.hash.replace("#", "").toLowerCase();
      var cat = hashMap[hash];
      if (!cat) return false;
      renderCategory(cat);
      if (shouldScroll && browseSection) {
        browseSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return true;
    }

    // Plain /#browse link (the header/mobile "Properties" nav item) — real
    // element id, so a same-page click scrolls natively, but a cross-page
    // navigation (e.g. from /about/) isn't reliably auto-scrolled by the
    // browser once the page's own content has finished laying out, so this
    // scrolls explicitly on load.
    function scrollToBrowseIfHashed() {
      var hash = window.location.hash.replace("#", "").toLowerCase();
      if (hash === "browse" && browseSection) {
        browseSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    pills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        renderCategory(pill.getAttribute("data-category"));
      });
    });

    window.addEventListener("hashchange", function () {
      if (!applyHash(true)) scrollToBrowseIfHashed();
    });
    window.setTimeout(scrollToBrowseIfHashed, 300);

    if (!applyHash(true)) renderCategory("Off-Plan");
  }

  /* -----------------------------------------------------
     Hero settings — also loaded from content/settings.json
     (edited via the "Site Settings" collection in /admin).
     Progressive enhancement only: the HTML already has real
     default text/media, so if this fetch fails, is slow, or
     a field is left blank in the CMS, the page never shows
     anything empty — it just quietly keeps the default.
  ----------------------------------------------------- */
  function loadHeroSettings() {
    fetch("/content/hero.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load settings.json");
        return res.json();
      })
      .then(function (s) {
        var line1 = document.getElementById("heroLine1");
        var line2 = document.getElementById("heroLine2");
        var subtext = document.getElementById("heroSubtext");
        var photo = document.getElementById("heroPhoto");
        var video = document.getElementById("heroVideo");

        if (s.heroLine1 && line1) line1.textContent = s.heroLine1;
        if (s.heroLine2 && line2) line2.textContent = s.heroLine2;
        if (s.heroSubtext && subtext) subtext.textContent = s.heroSubtext;

        // Video first if one's set, with the image as a silent fallback:
        // if the video 404s, is an unsupported format, or simply fails to
        // play (slow connection, browser policy, etc.), we swap back to
        // the still image rather than leaving a blank/black hero.
        if (s.heroVideo && video) {
          var fallToImage = function () {
            video.style.display = "none";
            if (s.heroImage && photo) {
              photo.src = s.heroImage;
              photo.style.display = "block";
            }
          };
          video.addEventListener("error", fallToImage);
          video.src = s.heroVideo;
          video.style.display = "block";
          if (photo) photo.style.display = "none";
          var playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(fallToImage);
          }
        } else if (s.heroImage && photo) {
          photo.src = s.heroImage;
          photo.style.display = "block";
        }
      })
      .catch(function (err) {
        console.error(err);
        // Defaults already on screen — nothing further to do.
      });
  }

  /* -----------------------------------------------------
     Contact info — runs on every page, since email/WhatsApp/
     Instagram links appear in the footer everywhere, not
     just on the Contact page. Same safe pattern: only touches
     an element if both the field has a value AND that element
     exists on the current page.
  ----------------------------------------------------- */
  function loadContactInfo() {
    fetch("/content/contact-info.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load contact-info.json");
        return res.json();
      })
      .then(function (c) {
        // Footer + home-page CTA — always present, real default already
        // shown, so only touch it when a real value exists.
        if (c.email) {
          ["footerEmail", "contactEmail", "footerBarEmail"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.href = "mailto:" + c.email; el.textContent = c.email; }
          });
          var ctaEmail = document.getElementById("ctaEmail");
          if (ctaEmail) ctaEmail.href = "mailto:" + c.email;
        }

        if (c.whatsapp) {
  var waMessage = encodeURIComponent("Hi Somara Realty, I'd like to know more about your properties.");
  var waUrl = "https://wa.me/" + c.whatsapp + "?text=" + waMessage;
  var footerWa = document.getElementById("footerWhatsapp");
  if (footerWa) { footerWa.href = waUrl; footerWa.style.display = ""; }
  var contactWa = document.getElementById("contactWhatsapp");
  if (contactWa) { contactWa.href = waUrl; contactWa.textContent = "Message us on WhatsApp"; }
  var floatWa = document.getElementById("whatsappFloat");
  if (floatWa) { floatWa.href = waUrl; floatWa.classList.add("is-visible"); }
}

              if (c.instagramUrl) {
          ["footerInstagram", "ctaInstagram", "instaFollowLink"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.href = c.instagramUrl; el.style.display = ""; }
          });
        }

        if (c.phone) {
          ["contactPhone", "footerBarPhone"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.href = "tel:" + c.phone.replace(/\s+/g, ""); el.textContent = c.phone; }
          });
        }

        var addressEl = document.getElementById("contactAddress");
        if (addressEl && (c.addressLine1 || c.city)) {
          var line1 = [c.addressLine1, c.addressLine2].filter(Boolean).join(" ");
          var line2 = [c.city, c.country].filter(Boolean).join(", ");
          addressEl.innerHTML = (line1 ? line1 + "<br>" : "") + line2;
        }

        var mapWrap = document.getElementById("mapWrap");
        if (mapWrap && c.mapEmbedUrl) {
          mapWrap.innerHTML =
            '<iframe src="' + c.mapEmbedUrl + '" width="100%" height="100%" style="border:0;" ' +
            'loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Office location"></iframe>';
          mapWrap.classList.add("has-map");
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  }
  /* -----------------------------------------------------
     Instagram reels — homepage "Follow The Journey" section.
     Calls our Netlify Function (which talks to the Instagram Graph
     API server-side, token never touches the browser) and swaps in
     the real reels, best-performing first. If the function isn't
     configured yet, or the call fails for any reason, we simply
     leave the placeholder images already in the HTML untouched.
  ----------------------------------------------------- */
  function loadInstagramReels() {
    var scroll = document.getElementById("instaScroll");
    if (!scroll) return;

    fetch("/.netlify/functions/instagram-reels")
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (data) {
        if (!data || !data.ok || !data.reels || !data.reels.length) return;

        scroll.innerHTML = data.reels.map(function (reel) {
          return (
            '<a class="insta-item" href="' + reel.permalink + '" target="_blank" rel="noopener noreferrer">' +
              '<img src="' + reel.thumbnail + '" alt="" loading="lazy" />' +
              '<span class="insta-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg></span>' +
            '</a>'
          );
        }).join("");

        var caption = document.getElementById("instaCaption");
        if (caption) caption.textContent = "Our best-performing reels, updated automatically from Instagram.";
      })
      .catch(function (err) {
        console.error("loadInstagramReels failed", err);
      });
  }
  /* -----------------------------------------------------
     About page content — only relevant on about.html.
     Same progressive-enhancement rule: blank/missing fields
     leave the existing default copy exactly as-is.
  ----------------------------------------------------- */
  function loadAboutContent() {
    fetch("/content/about-content.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load about-content.json");
        return res.json();
      })
      .then(function (a) {
        function setText(id, value) {
          var el = document.getElementById(id);
          if (el && value) el.textContent = value;
        }
        setText("aboutQuote", a.quoteHeading);
        setText("aboutStory", a.storyParagraph);
        setText("aboutPromise", a.promiseText);
        setText("aboutHowWeWork", a.howWeWorkText);

        var valuesGrid = document.getElementById("aboutValuesGrid");
        if (valuesGrid && Array.isArray(a.values) && a.values.length > 0) {
          valuesGrid.innerHTML = a.values
            .map(function (v) {
              return (
                '<div class="card-outlined"><h3>' + v.title + "</h3>" +
                '<p class="body-sm" style="margin-top:0.5rem">' + v.description + "</p></div>"
              );
            })
            .join("");
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  /* -----------------------------------------------------
     Category tiles (Buy / Rent / Off-Plan) — home page only.
  ----------------------------------------------------- */
  function loadCategoryTiles() {
    fetch("/content/categories.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load categories.json");
        return res.json();
      })
      .then(function (c) {
        if (c.buyDescription) CATEGORY_DESCRIPTIONS["Buy"] = c.buyDescription;
        if (c.rentDescription) CATEGORY_DESCRIPTIONS["Rent"] = c.rentDescription;
        if (c.offPlanDescription) CATEGORY_DESCRIPTIONS["Off-Plan"] = c.offPlanDescription;

        // Pills may already be rendered with the default copy — patch the
        // currently active one in place rather than waiting for a re-click.
        var activePill = document.querySelector(".category-pills .pill.is-active");
        var desc = document.getElementById("categoryDesc");
        if (activePill && desc) {
          desc.textContent = CATEGORY_DESCRIPTIONS[activePill.getAttribute("data-category")];
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  /* -----------------------------------------------------
     Categories page (/categories/) — renders two filtered,
     paginated grids (Off-Plan, Ready to Move In) keyed off
     each property's status field. Same progressive "View
     More" behavior the old Featured Properties section had
     (start at 6, +3 per click), one independent instance per
     grid.
  ----------------------------------------------------- */
  function initCategoryGridWithViewMore(list, gridId, btnId, wrapId) {
    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No properties in this category yet.</p></div>';
      return;
    }

    var state = { visibleCount: 6, pageSize: 3 };
    var wrap = document.getElementById(wrapId);
    var btn = document.getElementById(btnId);

    function renderVisible() {
      var slice = list.slice(0, state.visibleCount);
      grid.innerHTML = slice.map(propertyCardHTML).join("");
      grid.querySelectorAll(".property-card").forEach(function (card) {
        card.addEventListener("click", function () {
          openModal(card.getAttribute("data-id"));
        });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal(card.getAttribute("data-id"));
          }
        });
      });
      if (wrap) wrap.style.display = state.visibleCount < list.length ? "" : "none";
    }

    if (btn) {
      btn.addEventListener("click", function () {
        state.visibleCount += state.pageSize;
        renderVisible();
      });
    }

    renderVisible();
  }

  function initCategoriesPage() {
    loadProperties().then(function () {
      var offPlan = PROPERTIES.filter(function (p) { return p.status === "Off-Plan"; });
      var ready = PROPERTIES.filter(function (p) { return p.status === "Ready"; });
      initCategoryGridWithViewMore(offPlan, "propertyGridOffPlan", "offPlanViewMoreBtn", "offPlanViewMoreWrap");
      initCategoryGridWithViewMore(ready, "propertyGridReady", "readyViewMoreBtn", "readyViewMoreWrap");
    });
  }

  function loadProperties() {
    return fetch("/content/properties.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load properties.json");
        return res.json();
      })
      .then(function (data) {
        PROPERTIES = data.items || [];
      })
      .catch(function (err) {
        console.error(err);
        var grid = document.getElementById("propertyGrid");
        if (grid) {
          grid.innerHTML =
            '<div class="empty-state"><p>Properties could not be loaded. ' +
            "If you're viewing this file directly on your computer (a file:/// address), " +
            "open it through a local server or the live site instead. " +
            "Browsers block this kind of file loading for local files.</p></div>";
        }
      });
  }

  var AED = new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  });

  function propertyCardHTML(p) {
    return (
      '<article class="card-outlined property-card" data-id="' +
      p.id +
      '" tabindex="0" role="button" aria-label="View details for ' +
      p.title +
      '">' +
      '<div class="property-media">' +
      (p.image ? '<img src="' + p.image + '" alt="" onerror="this.style.display=\'none\'" />' : "") +
      '<span class="property-badge">' +
      p.status +
      "</span>" +
      buildingIconSVG() +
      "</div>" +
      '<div class="property-body">' +
      "<h3>" +
      p.title +
      "</h3>" +
      '<p class="property-location">' +
      pinIconSVG() +
      p.location +
      "</p>" +
      '<p class="property-price">' +
      AED.format(p.price) +
      "</p>" +
      '<div class="property-meta"><span>' +
      p.bedrooms +
      " bed</span><span>" +
      p.bathrooms +
      " bath</span><span>" +
      p.area.toLocaleString() +
      " sq ft</span></div>" +
      "</div>" +
      "</article>"
    );
  }

  function buildingIconSVG() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="4" y="3" width="16" height="18"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>';
  }
  function pinIconSVG() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" style="flex-shrink:0"><path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>';
  }

  function renderProperties(list, gridId) {
    gridId = gridId || "propertyGrid";
    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML =
        '<div class="empty-state"><p>No properties match your current search.</p>' +
        '<button type="button" class="btn btn-outline" id="clearFiltersBtn-' + gridId + '">Clear filters</button></div>';
      var clearBtn = document.getElementById("clearFiltersBtn-" + gridId);
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          var form = document.getElementById("heroSearchForm");
          if (form) form.reset();
          renderProperties(PROPERTIES, gridId);
        });
      }
      return;
    }

    grid.innerHTML = list.map(propertyCardHTML).join("");

    grid.querySelectorAll(".property-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openModal(card.getAttribute("data-id"));
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(card.getAttribute("data-id"));
        }
      });
    });
  }
var LOCATIONS = ["Downtown Dubai", "Dubai Marina", "Dubai Hills Estate", "Business Bay", "Palm Jumeirah", "Arabian Ranches"];

function initLocationAutocomplete() {
  var input = document.getElementById("searchLocation");
  var list = document.getElementById("searchLocationList");
  if (!input || !list) return;

  var activeIndex = -1;

  function render(items) {
    if (items.length === 0) {
      list.classList.remove("is-open");
      list.innerHTML = "";
      return;
    }
    list.innerHTML = items
      .map(function (loc, i) {
        return '<div class="autocomplete-item" data-index="' + i + '">' + loc + "</div>";
      })
      .join("");
    list.classList.add("is-open");
    activeIndex = -1;
  }

  function currentMatches() {
    var q = input.value.trim().toLowerCase();
    if (!q) return LOCATIONS;
    return LOCATIONS.filter(function (loc) {
      return loc.toLowerCase().indexOf(q) !== -1;
    });
  }

  input.addEventListener("focus", function () {
    render(currentMatches());
  });
  input.addEventListener("input", function () {
    render(currentMatches());
  });
  input.addEventListener("keydown", function (e) {
    var items = list.querySelectorAll(".autocomplete-item");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      input.value = items[activeIndex].textContent;
      list.classList.remove("is-open");
      return;
    } else if (e.key === "Escape") {
      list.classList.remove("is-open");
      return;
    } else {
      return;
    }
    items.forEach(function (item, i) {
      item.classList.toggle("is-active", i === activeIndex);
    });
  });
  list.addEventListener("click", function (e) {
    var item = e.target.closest(".autocomplete-item");
    if (!item) return;
    input.value = item.textContent;
    list.classList.remove("is-open");
  });
  document.addEventListener("click", function (e) {
    if (e.target !== input && !list.contains(e.target)) {
      list.classList.remove("is-open");
    }
  });
}
  function initSearch() {
    var form = document.getElementById("heroSearchForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var location = document.getElementById("searchLocation").value.trim();
      var type = document.getElementById("searchType").value;
      var budget = document.getElementById("searchBudget").value;

      var filtered = PROPERTIES.filter(function (p) {
        var matchLocation = !location || p.location.toLowerCase().indexOf(location.toLowerCase()) !== -1;
        var matchType = !type || p.type === type;
        var matchBudget = !budget || p.budgetTier === budget;
        return matchLocation && matchType && matchBudget;
      });

      renderPropertiesSection(filtered);

      var target = document.getElementById("properties");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* -----------------------------------------------------
     Property detail modal
  ----------------------------------------------------- */
  function openModal(id) {
    var property = PROPERTIES.filter(function (p) {
      return p.id === id;
    })[0];
    if (!property) return;

    var overlay = document.getElementById("propertyModal");
    var content = document.getElementById("propertyModalContent");
    if (!overlay || !content) return;

    content.innerHTML =
      '<div class="modal-inner">' +
      '<button type="button" class="modal-close" id="modalCloseBtn" aria-label="Close">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15"/></svg>' +
      "</button>" +
      '<div class="modal-media">' +
      (property.image ? '<img src="' + property.image + '" alt="" onerror="this.style.display=\'none\'" />' : "") +
      buildingIconSVG() +
      "</div>" +
      '<div class="modal-body">' +
      '<span class="property-badge">' +
      property.status +
      "</span>" +
      "<h2 style=\"margin-top:0.9rem\">" +
      property.title +
      "</h2>" +
      '<p class="property-location" style="margin-top:0.5rem">' +
      pinIconSVG() +
      property.location +
      "</p>" +
      '<p class="property-price" style="margin-top:1rem">' +
      AED.format(property.price) +
      "</p>" +
      '<div class="property-meta" style="border-top:none;padding-top:0">' +
      "<span>" +
      property.bedrooms +
      " bed</span><span>" +
      property.bathrooms +
      " bath</span><span>" +
      property.area.toLocaleString() +
      " sq ft</span></div>" +
      '<p class="body-sm" style="margin-top:1.25rem">' +
      property.description +
      "</p>" +
      '<div class="modal-amenities">' +
      property.amenities.map(function (a) { return "<span>" + a + "</span>"; }).join("") +
      "</div>" +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-primary btn-block" id="askAboutBtn">Ask About This Property</button>' +
      "</div>" +
      "</div>" +
      "</div>";

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    var closeBtn = document.getElementById("modalCloseBtn");
    if (closeBtn) closeBtn.focus();
    document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
    document.getElementById("askAboutBtn").addEventListener("click", function () {
      closeModal();
      openLeadModal(property.id);
    });
  }

  function closeModal() {
    var overlay = document.getElementById("propertyModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  /* -----------------------------------------------------
     Shared lead submission — every form on the site (the two
     popups and the inline "Book a Consultation" forms) calls
     this to send the enquiry to LeadRat via the Netlify
     Function at /.netlify/functions/submit-lead, which holds
     the real API key server-side. Resolves true/false; never
     rejects, so callers don't need a .catch.

     Note: this endpoint only exists once the site is deployed
     to Netlify (or run locally with `netlify dev`) with the
     LEADRAT_API_KEY environment variable set — it will 404 on
     a plain static server.
  ----------------------------------------------------- */
  function submitLeadToServer(payload) {
    return fetch("/.netlify/functions/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () { return {}; })
          .then(function (body) {
            return { ok: res.ok, error: (body && body.error) || "" };
          });
      })
      .catch(function (err) {
        console.error("submitLeadToServer failed", err);
        return { ok: false, error: "" };
      });
  }

  /* -----------------------------------------------------
     "Ask About This Property" lead-capture popup — property
     image on one side, enquiry form on the other. Submits to
     LeadRat via submitLeadToServer() above.
  ----------------------------------------------------- */
  function openLeadModal(id) {
    var property = PROPERTIES.filter(function (p) { return p.id === id; })[0];
    if (!property) return;

    var overlay = document.getElementById("leadModal");
    var content = document.getElementById("leadModalContent");
    if (!overlay || !content) return;
    overlay.setAttribute("aria-label", "Ask about this property");

    content.innerHTML =
      '<div class="lead-modal-inner">' +
      '<button type="button" class="modal-close" id="leadModalCloseBtn" aria-label="Close">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15"/></svg>' +
      "</button>" +
      '<div class="lead-modal-media">' +
      (property.image ? '<img src="' + property.image + '" alt="" onerror="this.style.display=\'none\'" />' : "") +
      buildingIconSVG() +
      '<div class="lead-modal-media-caption">' +
      '<span class="lead-modal-badge">' + property.status + "</span>" +
      "<h3 style=\"margin-top:0.75rem\">" + property.title + "</h3>" +
      '<p class="property-location" style="margin-top:0.4rem">' + pinIconSVG() + property.location + "</p>" +
      "</div>" +
      "</div>" +
      '<div class="lead-modal-form">' +
      "<h2>Ask about this property</h2>" +
      '<p class="body-sm" style="margin-top:0.5rem">Share a few details and a Somara Realty consultant will get back to you shortly.</p>' +
      '<form id="leadForm" class="form-grid" style="margin-top:1.5rem">' +
      '<div class="field-full"><label for="lf-name">Full name</label><input type="text" id="lf-name" required /></div>' +
      '<div class="form-grid two-col">' +
      '<div class="field-full"><label for="lf-email">Email</label><input type="email" id="lf-email" /></div>' +
      '<div class="field-full"><label for="lf-phone">Phone</label><input type="tel" id="lf-phone" required /></div>' +
      "</div>" +
      '<div class="field-full"><label for="lf-message">Additional Information</label><textarea id="lf-message"></textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Send Enquiry</button>' +
      '<p id="leadFormStatus" class="form-status" role="status"></p>' +
      "</form>" +
      "</div>" +
      "</div>";

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    var closeBtn = document.getElementById("leadModalCloseBtn");
    if (closeBtn) closeBtn.focus();
    document.getElementById("leadModalCloseBtn").addEventListener("click", closeLeadModal);

    document.getElementById("leadForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = document.getElementById("leadForm");
      var name = document.getElementById("lf-name").value.trim();
      var email = document.getElementById("lf-email").value.trim();
      var phone = document.getElementById("lf-phone").value.trim();
      var message = document.getElementById("lf-message").value.trim();
      var status = document.getElementById("leadFormStatus");

      if (!name || !phone) {
        status.textContent = "Please fill in your name and phone number.";
        status.className = "form-status is-visible error";
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      status.textContent = "Sending...";
      status.className = "form-status is-visible";

      submitLeadToServer({
        name: name,
        email: email,
        phone: phone,
        message: message,
        location: property.location || "",
        propertyTitle: property.title || "",
        subSource: "Property Enquiry - " + (property.title || "Unknown Property")
      }).then(function (result) {
        if (submitBtn) submitBtn.disabled = false;
        if (result.ok) {
          status.textContent = "Thanks, a Somara Realty consultant will reach out shortly.";
          status.className = "form-status is-visible success";
          form.reset();
        } else {
          status.textContent = result.error || "Something went wrong sending that, please try again or WhatsApp us directly.";
          status.className = "form-status is-visible error";
        }
      });
    });
  }

  function closeLeadModal() {
    var overlay = document.getElementById("leadModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  /* -----------------------------------------------------
     Generic "Book a Consultation" popup — same overlay as the
     per-property ask form, but with a brand panel instead of a
     photo (this isn't tied to any one listing). Opened by the
     header, hero and mobile-menu "Book a Consultation" buttons
     instead of sending people to a separate page. Falls back to
     the button's normal href (/contact/) on any page where the
     #leadModal markup isn't present, or if this script fails.
  ----------------------------------------------------- */
  function openConsultationModal(triggerLabel) {
    var subSourceLabel = triggerLabel || "Book a Consultation Popup";
    var overlay = document.getElementById("leadModal");
    var content = document.getElementById("leadModalContent");
    if (!overlay || !content) return false;
    overlay.setAttribute("aria-label", "Book a consultation");

    content.innerHTML =
      '<div class="lead-modal-inner">' +
      '<button type="button" class="modal-close" id="leadModalCloseBtn" aria-label="Close">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15"/></svg>' +
      "</button>" +
      '<div class="lead-modal-media">' +
      '<img src="/images/hero/dubai_december-12-2025_12374.webp" alt="" onerror="this.style.display=\'none\'" />' +
      buildingIconSVG() +
      '<div class="lead-modal-media-caption">' +
      '<span class="logo" style="font-size:1.3rem;">SOMARA REALTY</span>' +
      '<p class="body-sm" style="margin-top:0.5rem">A Dubai real estate practice built on resilience, trust and vision.</p>' +
      "</div>" +
      "</div>" +
      '<div class="lead-modal-form">' +
      "<h2>Book a Consultation</h2>" +
      '<p class="body-sm" style="margin-top:0.5rem">Share a few details and a Somara Realty consultant will follow up shortly.</p>' +
      '<form id="leadForm" class="form-grid" style="margin-top:1.5rem">' +
      '<div class="field-full"><label for="lf-name">Full name</label><input type="text" id="lf-name" required /></div>' +
      '<div class="form-grid two-col">' +
      '<div class="field-full"><label for="lf-email">Email</label><input type="email" id="lf-email" /></div>' +
      '<div class="field-full"><label for="lf-phone">Phone</label><input type="tel" id="lf-phone" required /></div>' +
      "</div>" +
      '<div class="field-full"><label for="lf-interest">I\'m interested in</label>' +
      '<select id="lf-interest"><option>Buying</option><option>Renting</option><option>Investing</option><option>Just exploring</option></select>' +
      "</div>" +
      '<div class="field-full"><label for="lf-message">Additional Information</label><textarea id="lf-message"></textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Send Enquiry</button>' +
      '<p id="leadFormStatus" class="form-status" role="status"></p>' +
      "</form>" +
      "</div>" +
      "</div>";

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    var closeBtn = document.getElementById("leadModalCloseBtn");
    if (closeBtn) closeBtn.focus();
    document.getElementById("leadModalCloseBtn").addEventListener("click", closeLeadModal);

    document.getElementById("leadForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = document.getElementById("leadForm");
      var name = document.getElementById("lf-name").value.trim();
      var email = document.getElementById("lf-email").value.trim();
      var phone = document.getElementById("lf-phone").value.trim();
      var interest = document.getElementById("lf-interest").value;
      var message = document.getElementById("lf-message").value.trim();
      var status = document.getElementById("leadFormStatus");

      if (!name || !phone) {
        status.textContent = "Please fill in your name and phone number.";
        status.className = "form-status is-visible error";
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      status.textContent = "Sending...";
      status.className = "form-status is-visible";

      submitLeadToServer({
        name: name,
        email: email,
        phone: phone,
        interest: interest,
        message: message,
        subSource: subSourceLabel
      }).then(function (result) {
        if (submitBtn) submitBtn.disabled = false;
        if (result.ok) {
          status.textContent = "Thanks, a Somara Realty consultant will reach out shortly.";
          status.className = "form-status is-visible success";
          form.reset();
        } else {
          status.textContent = result.error || "Something went wrong sending that, please try again or WhatsApp us directly.";
          status.className = "form-status is-visible error";
        }
      });
    });

    return true;
  }

  function initConsultationButtons() {
    document.querySelectorAll(".js-open-consultation").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        // Only intercept navigation if the popup actually exists on this
        // page — otherwise let the normal /contact/ link go through.
        var opened = openConsultationModal();
        if (opened) e.preventDefault();
      });
    });
  }

  /* -----------------------------------------------------
     Featured Realtors — each realtor has their own LeadRat
     API key, so an enquiry started from their card needs to
     be tagged with a "realtorSlug" the Netlify Function can
     map to that specific key (see submit-lead.js). Adding or
     renaming a realtor here means also wiring their key +
     slug server-side, so keep this list and that mapping in
     sync.
  ----------------------------------------------------- */
  var REALTORS = [
    { slug: "amit-thakur", name: "Amit Thakur", role: "CEO" },
    { slug: "gautham-nandu", name: "Gautham Nandu", role: "Property Associate" },
    { slug: "vidhi-nanda", name: "Vidhi Nanda", role: "Senior Property Associate" },
    { slug: "digvijay-charan", name: "Digvijay Charan", role: "Property Associate" },
    { slug: "ramesh-maloth", name: "Ramesh Maloth", role: "Property Associate" },
    { slug: "aftab-khan", name: "Aftab Khan", role: "Property Associate" },
    { slug: "fahim-khan", name: "Fahim Khan", role: "Property Associate" },
    { slug: "mahebub-radhanpuri", name: "Mahebub Radhanpuri", role: "Property Associate" },
    { slug: "lalit-singh", name: "Lalit Singh", role: "Property Associate" },
    { slug: "bharti-manchanda", name: "Bharti Manchanda", role: "Property Associate" }
  ];

  function renderRealtors() {
    var grid = document.getElementById("realtorGrid");
    if (!grid) return;

    grid.innerHTML = REALTORS.map(function (r) {
      return (
        '<div class="card-outlined realtor-card">' +
        '<div class="realtor-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg></div>' +
        "<h3>" + r.name + "</h3>" +
        '<p class="body-sm realtor-role">' + r.role + "</p>" +
        '<button type="button" class="btn btn-outline btn-block js-realtor-contact" data-slug="' + r.slug + '" data-name="' + r.name + '">Contact Us</button>' +
        "</div>"
      );
    }).join("");

    grid.querySelectorAll(".js-realtor-contact").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openRealtorLeadModal(btn.getAttribute("data-slug"), btn.getAttribute("data-name"));
      });
    });
  }

  /* -----------------------------------------------------
     Per-realtor "Contact Us" popup — same shared #leadModal
     overlay as the other two, but tagged with realtorSlug so
     the Netlify Function routes it to that realtor's own
     LeadRat API key instead of the shared one.
  ----------------------------------------------------- */
  function openRealtorLeadModal(slug, name) {
    var overlay = document.getElementById("leadModal");
    var content = document.getElementById("leadModalContent");
    if (!overlay || !content) return false;
    overlay.setAttribute("aria-label", "Contact " + name);

    content.innerHTML =
      '<div class="lead-modal-inner">' +
      '<button type="button" class="modal-close" id="leadModalCloseBtn" aria-label="Close">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15"/></svg>' +
      "</button>" +
      '<div class="lead-modal-media">' +
      buildingIconSVG() +
      '<div class="lead-modal-media-caption">' +
      '<span class="logo" style="font-size:1.3rem;">SOMARA REALTY</span>' +
      '<p class="body-sm" style="margin-top:0.5rem">Get in touch directly with ' + name + ".</p>" +
      "</div>" +
      "</div>" +
      '<div class="lead-modal-form">' +
      "<h2>Contact " + name + "</h2>" +
      '<p class="body-sm" style="margin-top:0.5rem">Share a few details and ' + name + ' will get back to you shortly.</p>' +
      '<form id="leadForm" class="form-grid" style="margin-top:1.5rem">' +
      '<div class="field-full"><label for="lf-name">Full name</label><input type="text" id="lf-name" required /></div>' +
      '<div class="form-grid two-col">' +
      '<div class="field-full"><label for="lf-email">Email</label><input type="email" id="lf-email" /></div>' +
      '<div class="field-full"><label for="lf-phone">Phone</label><input type="tel" id="lf-phone" required /></div>' +
      "</div>" +
      '<div class="field-full"><label for="lf-message">Additional Information</label><textarea id="lf-message"></textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">Send Enquiry</button>' +
      '<p id="leadFormStatus" class="form-status" role="status"></p>' +
      "</form>" +
      "</div>" +
      "</div>";

    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    var closeBtn = document.getElementById("leadModalCloseBtn");
    if (closeBtn) closeBtn.focus();
    document.getElementById("leadModalCloseBtn").addEventListener("click", closeLeadModal);

    document.getElementById("leadForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = document.getElementById("leadForm");
      var nameVal = document.getElementById("lf-name").value.trim();
      var email = document.getElementById("lf-email").value.trim();
      var phone = document.getElementById("lf-phone").value.trim();
      var message = document.getElementById("lf-message").value.trim();
      var status = document.getElementById("leadFormStatus");

      if (!nameVal || !phone) {
        status.textContent = "Please fill in your name and phone number.";
        status.className = "form-status is-visible error";
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      status.textContent = "Sending...";
      status.className = "form-status is-visible";

      submitLeadToServer({
        name: nameVal,
        email: email,
        phone: phone,
        message: message,
        realtorSlug: slug,
        realtorName: name,
        subSource: "Realtor Contact - " + name
      }).then(function (result) {
        if (submitBtn) submitBtn.disabled = false;
        if (result.ok) {
          status.textContent = "Thanks, " + name + " will reach out shortly.";
          status.className = "form-status is-visible success";
          form.reset();
        } else {
          status.textContent = result.error || "Something went wrong sending that, please try again or WhatsApp us directly.";
          status.className = "form-status is-visible error";
        }
      });
    });

    return true;
  }

  /* -----------------------------------------------------
     First-visit pop-up — home page only. Opens the same
     "Book a Consultation" form as the header/hero CTA, on
     its own, 6 seconds after the page loads, but only the
     first time a given browser visits (tracked in
     localStorage). Never interrupts a visitor who has
     already opened or dismissed it before, and never fires
     on top of a modal the visitor already has open.
  ----------------------------------------------------- */
  function initFirstVisitPopup() {
    if (!document.querySelector(".hero")) return; // home page only
    if (!document.getElementById("leadModal")) return;

    var STORAGE_KEY = "somaraConsultationPopupShown";
    var alreadyShown = false;
    try {
      alreadyShown = !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // localStorage unavailable (private browsing, etc.) — fail open and
      // just show it this once rather than never showing it at all.
    }
    if (alreadyShown) return;

    window.setTimeout(function () {
      var overlay = document.getElementById("leadModal");
      var propertyOverlay = document.getElementById("propertyModal");
      var alreadyOpen =
        (overlay && overlay.classList.contains("is-open")) ||
        (propertyOverlay && propertyOverlay.classList.contains("is-open"));
      if (alreadyOpen) return;

      var opened = openConsultationModal("Home Popup (First Visit)");
      if (opened) {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch (e) {
          // Nothing to do — worst case it can show again next visit.
        }
      }
    }, 6000);
  }

  /* -----------------------------------------------------
     Stats strip — counts each number up from 0 once it
     scrolls into view. Respects prefers-reduced-motion (jumps
     straight to the final value instead of animating).
  ----------------------------------------------------- */
  function initStatsCounters() {
    var stats = document.querySelectorAll(".stat-number[data-count-to]");
    if (!stats.length) return;

    var reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animateCount(el) {
      var target = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      var suffix = el.getAttribute("data-suffix") || "";

      if (reduceMotion) {
        el.textContent = target + suffix;
        return;
      }

      var duration = 1400;
      var start = null;

      function step(timestamp) {
        if (!start) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 2); // ease-out
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      stats.forEach(animateCount);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    stats.forEach(function (el) { observer.observe(el); });
  }

  function initModal() {
    ["propertyModal", "leadModal"].forEach(function (id) {
      var overlay = document.getElementById(id);
      if (!overlay) return;
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
          overlay.classList.remove("is-open");
          document.body.style.overflow = "";
        }
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      ["propertyModal", "leadModal"].forEach(function (id) {
        var overlay = document.getElementById(id);
        if (overlay && overlay.classList.contains("is-open")) {
          overlay.classList.remove("is-open");
          document.body.style.overflow = "";
        }
      });
    });
  }

  /* -----------------------------------------------------
     Contact / consultation form
     No backend is connected yet, so this builds a mailto:
     draft with the submitted details rather than pretending
     to send it somewhere — a real, working mechanism instead
     of a fake success message.
  ----------------------------------------------------- */
  function initContactForm() {
    var form = document.getElementById("consultationForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("formStatus");

      var name = form.querySelector("#cf-name").value.trim();
      var email = form.querySelector("#cf-email").value.trim();
      var phone = form.querySelector("#cf-phone").value.trim();
      var interestEl = form.querySelector("#cf-interest");
      var budgetEl = form.querySelector("#cf-budget");
      var interest = interestEl ? interestEl.value : "";
      var budget = budgetEl ? budgetEl.value : "";
      var message = form.querySelector("#cf-message").value.trim();

      if (!name || !phone) {
        status.textContent = "Please fill in your name and phone number.";
        status.className = "form-status is-visible error";
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      status.textContent = "Sending...";
      status.className = "form-status is-visible";

      submitLeadToServer({
        name: name,
        email: email,
        phone: phone,
        interest: interest,
        budget: budget,
        message: message,
        subSource: "Get In Touch Form (" + window.location.pathname + ")"
      }).then(function (result) {
        if (submitBtn) submitBtn.disabled = false;
        if (result.ok) {
          status.textContent = "Thanks, a Somara Realty consultant will reach out shortly.";
          status.className = "form-status is-visible success";
          form.reset();
        } else {
          status.textContent = result.error || "Something went wrong sending that, please try again or WhatsApp us directly.";
          status.className = "form-status is-visible error";
        }
      });
    });
  }

  /* -----------------------------------------------------
     Init
  ----------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initMobileMenu();
    initModal();
    initConsultationButtons();
    initFirstVisitPopup();
    initContactForm();
    initStatsCounters();
    loadContactInfo();

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

        renderRealtors();
    loadInstagramReels();

    // Only the property grid depends on the fetched data — everything

    // Only the property grid depends on the fetched data — everything
    // else above is ready immediately.
    if (document.getElementById("propertyGrid")) {
      loadProperties().then(function () {
        renderPropertiesSection(PROPERTIES);
        initPropertiesViewMore();
        initSearch();
        initLocationAutocomplete();
        initCategoryPills();
      });
    }

    if (document.getElementById("heroLine1")) {
      loadHeroSettings();
    }

    if (document.getElementById("aboutQuote")) {
      loadAboutContent();
    }

    if (document.querySelector(".category-pills")) {
      loadCategoryTiles();
    }

    if (document.getElementById("propertyGridOffPlan")) {
      initCategoriesPage();
    }
  });
})();
