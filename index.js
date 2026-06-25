const functions  = require("firebase-functions");
const axios      = require("axios");

/* ══════════════════════════════════════════════════════════
   Firestore trigger — fires whenever a new RSVP is created
   Collection: "rsvps"
══════════════════════════════════════════════════════════ */
exports.sendRsvpSms = functions.firestore
  .document("rsvps/{docId}")
  .onCreate(async (snap) => {

    const data       = snap.data();
    const name       = data.name       || "Guest";
    const phone      = data.phone      || "";
    const attendance = data.attendance || "";

    /* ── Strip everything except digits, keep last 10 ── */
    const cleaned = phone.replace(/\D/g, "").slice(-10);

    if (cleaned.length !== 10) {
      console.log("Invalid phone, skipping SMS:", phone);
      return null;
    }

    /* ══════════════════════════════════════════════════
       MESSAGE TEMPLATES — edit these freely
    ══════════════════════════════════════════════════ */
    let message = "";

    if (attendance === "yes") {
      message =
        `Dear ${name}, 🪔\n\n` +
        `We are overjoyed to know you will be joining us for our Shubh Vivah! ` +
        `Your presence truly means the world to us. ` +
        `The celebrations begin 23rd April — we can't wait to celebrate with you! 🌸\n\n` +
        `With love & gratitude,\nBride & Groom\nUdaipur, 25 April 2026`;
    } else if (attendance === "no") {
      message =
        `Dear ${name}, 🪔\n\n` +
        `We completely understand and are grateful you let us know. ` +
        `You will truly be missed at our celebrations. ` +
        `Please know your love and blessings mean everything to us, even from afar. 🙏\n\n` +
        `With warmth & love,\nBride & Groom\nUdaipur, 25 April 2026`;
    } else {
      /* Fallback for any other value */
      console.log("Unknown attendance value, skipping SMS:", attendance);
      return null;
    }

    /* ══════════════════════════════════════════════════
       FAST2SMS API CALL
       Docs: https://docs.fast2sms.com
    ══════════════════════════════════════════════════ */
    try {
      const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
          authorization: process.env.FAST2SMS_KEY,  // set via firebase functions:config:set fast2sms.key="YOUR_KEY"
          message:       message,
          language:      "english",
          route:         "q",          // "q" = Quick Transactional, "v" = Promotional
          numbers:       cleaned,
        },
        headers: {
          "cache-control": "no-cache",
        },
        timeout: 10000,
      });

      console.log("Fast2SMS response:", JSON.stringify(response.data));
      return null;

    } catch (err) {
      console.error("Fast2SMS error:", err.message);
      return null;
    }
  });