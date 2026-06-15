require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
console.log(process.env.VITE_SUPABASE_URL);
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY);

const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const { createClient } = require("@supabase/supabase-js");
console.log(process.env.SUPABASE_URL);
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY);


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/sms", async (req, res) => {
  try {
    const incomingMsg = req.body.Body.trim();

    // Example:
    // VERIFY 123456789

    const parts = incomingMsg.split(" ");

    if (parts.length < 2) {
      return sendReply(
        res,
        "VerifyRX:\nInvalid format.\nUse: VERIFY <barcode>"
      );
    }

    const barcode = parts[1];

    // FIND MEDICINE
    const { data: medicine, error } = await supabase
      .from("medicines")
      .select("*")
      .eq("barcode", barcode)
      .single();

    if (!medicine || error) {
      return sendReply(
        res,
        "VerifyRX:\nMedicine not found."
      );
    }

    // CHECK DUPLICATES
    const { count } = await supabase
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("barcode", barcode);

    let status = "AUTHENTIC";
    let reason = "Verified manufacturer product.";

    if (count > 3) {
      status = "SUSPICIOUS";
      reason = "Duplicate barcode detected multiple times.";
    }

    let message = `
VerifyRX:
Medicine: ${medicine.brand_name}
Expiry: ${medicine.expiry_date}
Status: ${status}

${reason}
`;

    if (status === "SUSPICIOUS") {
      message += "\nContact your pharmacist immediately.";
    }

    return sendReply(res, message);

  } catch (err) {
    console.error(err);

    return sendReply(
      res,
      "VerifyRX:\nServer error occurred."
    );
  }
});

function sendReply(res, message) {
  const twiml = new twilio.twiml.MessagingResponse();

  twiml.message(message);

  res.writeHead(200, { "Content-Type": "text/xml" });

  res.end(twiml.toString());
}

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`SMS Server running on port ${PORT}`);
});