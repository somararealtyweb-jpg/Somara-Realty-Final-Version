// Receives a lead from one of the website's forms and forwards it to
// LeadRat's "Website" integration endpoint. Runs server-side (Netlify
// Function) so the LeadRat API key never reaches the browser.
//
// Required environment variable (set in Netlify: Site configuration ->
// Environment variables):
//   LEADRAT_API_KEY   the account-wide API-Key LeadRat gave you for the
//                      Website integration (see the CRM Integration doc).
//
// Each realtor on the Featured Realtors section has their OWN LeadRat
// API key. A lead started from a realtor's "Contact Us" card carries a
// realtorSlug, which this map turns into the Netlify env var holding
// THAT realtor's key. Add a realtor on the site (js/main.js REALTORS
// array) and you must add a matching line here + a new env var in
// Netlify (Site configuration -> Environment variables) with their key,
// or that realtor's button will fail with a clear "not connected yet"
// error rather than silently landing in the wrong account.
const REALTOR_KEY_ENV = {
  "amit-thakur": "LEADRAT_KEY_AMIT_THAKUR",
  "gautham-nandu": "LEADRAT_KEY_GAUTHAM_NANDU",
  "vidhi-nanda": "LEADRAT_KEY_VIDHI_NANDA",
  "digvijay-charan": "LEADRAT_KEY_DIGVIJAY_CHARAN",
  "ramesh-maloth": "LEADRAT_KEY_RAMESH_MALOTH",
  "aftab-khan": "LEADRAT_KEY_AFTAB_KHAN",
  "fahim-khan": "LEADRAT_KEY_FAHIM_KHAN",
  "mahebub-radhanpuri": "LEADRAT_KEY_MAHEBUB_RADHANPURI",
  "lalit-singh": "LEADRAT_KEY_LALIT_SINGH",
  "bharti-manchanda": "LEADRAT_KEY_BHARTI_MANCHANDA"
};

const LEADRAT_ENDPOINT = "https://connect.leadrat.com/api/v1/integration/Website";

function pad(n) {
  return String(n).padStart(2, "0");
}

// LeadRat's sample payload uses DD-MM-YY and HH:MM:SS. Stamped in Dubai
// time (UTC+4, no DST) since that's Somara Realty's own market/timezone,
// regardless of where the server or the person submitting happens to be.
var DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
function toDubaiTime(d) {
  return new Date(d.getTime() + DUBAI_OFFSET_MS);
}
function formatDate(d) {
  var dubai = toDubaiTime(d);
  return pad(dubai.getUTCDate()) + "-" + pad(dubai.getUTCMonth() + 1) + "-" + pad(dubai.getUTCFullYear() % 100);
}
function formatTime(d) {
  var dubai = toDubaiTime(d);
  return pad(dubai.getUTCHours()) + ":" + pad(dubai.getUTCMinutes()) + ":" + pad(dubai.getUTCSeconds());
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid request body." }) };
  }

  const name = (data.name || "").trim();
  const phone = (data.phone || "").trim();
  if (!name || !phone) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Name and phone are required." }) };
  }

  // Pick which LeadRat account this lead posts into: a specific
  // realtor's own key if one was named, otherwise the shared
  // general-leads key.
  const realtorSlug = (data.realtorSlug || "").trim();
  let apiKey;
  if (realtorSlug) {
    const envName = REALTOR_KEY_ENV[realtorSlug];
    if (!envName) {
      console.error("submit-lead: unknown realtorSlug", realtorSlug);
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Unknown realtor." }) };
    }
    apiKey = process.env[envName];
    if (!apiKey) {
      console.error("submit-lead: " + envName + " is not set in the environment (realtor: " + realtorSlug + ").");
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "This realtor's LeadRat account isn't connected yet." }) };
    }
  } else {
    apiKey = process.env.LEADRAT_API_KEY;
    if (!apiKey) {
      console.error("submit-lead: LEADRAT_API_KEY is not set in the environment.");
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server is not configured yet." }) };
    }
  }

  const now = new Date();

  const lead = {
    name: name,
    state: "",
    city: "Dubai",
    location: data.location || "",
    budget: data.budget || "",
    notes: data.message || "",
    email: data.email || "",
    countryCode: "",
    mobile: phone,
    project: data.propertyTitle || "",
    property: "",
    leadExpectedBudget: data.budget || "",
    propertyType: "",
    submittedDate: formatDate(now),
    submittedTime: formatTime(now),
    source: "Website",
    subSource: data.subSource || "",
    agencyName: "",
    additionalProperties: {
      EnquiredFor: data.interest || "",
      BHKType: "",
      NoOfBHK: ""
    },
    primaryUser: data.realtorName || "",
    secondaryUser: "",
    CampaignName: "",
    AgencyName: "",
    ChannelPartnerName: ""
  };

  try {
    const res = await fetch(LEADRAT_ENDPOINT, {
      method: "POST",
      headers: {
        "API-Key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([lead])
    });

    if (!res.ok) {
      const text = await res.text().catch(function () { return ""; });
      console.error("submit-lead: LeadRat responded with", res.status, text);
      const detail = (text || "").trim().slice(0, 200);
      return {
        statusCode: 502,
        body: JSON.stringify({
          ok: false,
          error: "LeadRat rejected the lead (HTTP " + res.status + (detail ? ": " + detail : "") + ")."
        })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("submit-lead: request to LeadRat failed", err);
    return { statusCode: 502, body: JSON.stringify({ ok: false, error: "Could not reach LeadRat." }) };
  }
};
