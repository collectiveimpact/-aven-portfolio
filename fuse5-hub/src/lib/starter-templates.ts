// Starter template library — provider-branded HTML letters shipped with Fuse5.
//
// The Hamilton East Kiwanis Non-Profit Homes tenant-service-request (TSR) lifecycle
// letters, ported from their real Yardi email templates. Demonstrates that Fuse5
// hosts each provider's OWN branded HTML (logo, colours, footer, Yardi merge
// fields like #DESTINATIONFIRSTNAME#) — not just re-skinned plain text.
//
// The shared shell is encoded once (faithful to the source templates); each status
// supplies its title + body. Statuses 03/05/06/07/08 are the exact source copy;
// 01/02/04 complete the standard TSR lifecycle in the identical design.

export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  channels: string[];
  provider: string;
  html: string; // full, self-contained email HTML
}

// Kiwanis Homes brand
const NAVY = "#1F3A4D";
const GREEN = "#7AB648";
const LOGO = "https://kiwanishomes.ca/wp-content/uploads/2022/03/KiwanisHomes_FullLogo_RGB-2.png";

/** Faithful reproduction of the Kiwanis TSR email shell. `bodyParas` are inner
 *  HTML for the message paragraphs (between the greeting and the sign-off). */
function kiwanisLetter(title: string, bodyParas: string[]): string {
  const paras = bodyParas
    .map((p) => `<p style="font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 22px; margin: 0 0 16px 0">${p}</p>`)
    .join("\n");
  return `<table style="width: 100%" bgcolor="#eeeeee" cellpadding="0" cellspacing="0"><tbody><tr>
<td style="background-color: #EEEEEE">
 <table border="0" align="center" cellpadding="0" cellspacing="0" style="border-collapse: collapse; max-width: 640px; width: 100%; margin: 0 auto"><tbody><tr>
  <td style="padding: 20px 0" valign="top">
   <table align="center" border="0" cellpadding="0" cellspacing="0" bgcolor="${NAVY}" style="width: 100%"><tbody>
    <tr><td style="height: 24px">&nbsp;</td></tr>
    <tr><td align="center" valign="middle"><img src="${LOGO}" alt="Kiwanis Homes" width="180" style="display: block; max-width: 180px; height: auto; background:#ffffff; padding:10px; border-radius:6px" /></td></tr>
    <tr><td style="height: 12px">&nbsp;</td></tr>
    <tr><td align="center" style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; padding: 0 20px">HAMILTON EAST KIWANIS NON-PROFIT HOMES INC.</td></tr>
    <tr><td style="height: 24px">&nbsp;</td></tr>
   </tbody></table>
   <table align="center" cellpadding="0" cellspacing="0" style="background: #ffffff; width: 100%; border-left: 1px solid #dddddd; border-right: 1px solid #dddddd"><tbody>
    <tr><td style="height: 40px">&nbsp;</td></tr>
    <tr align="center" valign="middle"><td><p style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 600; color: ${NAVY}; padding: 0 20px; margin: 0">${title}</p></td></tr>
    <tr><td style="height: 30px">&nbsp;</td></tr>
    <tr align="left" valign="top"><td style="padding: 0 40px">
     <p style="font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 22px; margin: 0 0 16px 0">Hi #DESTINATIONFIRSTNAME#,</p>
     ${paras}
     <p style="font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 22px; margin: 24px 0 4px 0">Regards,</p>
     <p style="font-family: Arial, sans-serif; font-size: 15px; color: ${NAVY}; line-height: 22px; margin: 0; font-weight: 600">Hamilton East Kiwanis Non-Profit Homes Inc.</p>
    </td></tr>
    <tr><td style="height: 40px">&nbsp;</td></tr>
   </tbody></table>
   <table align="center" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width: 100%; border: 1px solid #dddddd; border-top: 3px solid ${NAVY}"><tbody>
    <tr><td style="height: 20px">&nbsp;</td></tr>
    <tr><td style="padding: 0 30px">
     <p style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; color: ${NAVY}; margin: 0 0 6px 0">HAMILTON EAST KIWANIS NON-PROFIT HOMES INC.</p>
     <p style="font-family: Arial, sans-serif; font-size: 13px; color: #444444; line-height: 20px; margin: 0 0 6px 0">281 Queenston Road, Hamilton, ON L8K 1G9 &nbsp;|&nbsp; Fax: 905-545-4884</p>
     <p style="font-family: Arial, sans-serif; font-size: 13px; color: #444444; line-height: 20px; margin: 0 0 6px 0">Website: <a href="https://www.kiwanishomes.ca" style="color: ${NAVY}; text-decoration: underline">www.kiwanishomes.ca</a> &nbsp;<span style="color:${GREEN}">|</span>&nbsp; Facebook: <a href="https://www.facebook.com/KiwanisHomesHamilton/" style="color: ${NAVY}; text-decoration: underline">KiwanisHomesHamilton</a></p>
    </td></tr>
    <tr><td style="height: 12px">&nbsp;</td></tr>
    <tr><td style="padding: 0 30px"><p style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; color: ${GREEN}; margin: 0">Please consider the environment before printing this email.</p></td></tr>
    <tr><td style="height: 12px">&nbsp;</td></tr>
    <tr><td style="padding: 0 30px 24px 30px"><p style="font-family: Arial, sans-serif; font-size: 11px; color: #888888; line-height: 16px; margin: 0; text-align: justify"><strong>Notice:</strong> The information contained in this electronic mail transmission is intended for the use of the named individual or entity to which it is addressed and may contain information that is privileged or otherwise confidential. If you have received this electronic transmission in error, please delete it without copying or forwarding it, and notify the sender of the error. Thank you.</p></td></tr>
   </tbody></table>
   <table align="center" cellpadding="0" cellspacing="0" style="width: 100%"><tbody><tr><td height="30" style="background: #eeeeee">&nbsp;</td></tr></tbody></table>
  </td>
 </tr></tbody></table>
</td></tr></tbody></table>`;
}

const KIWANIS_MAIN = `If you have not heard back within <strong>3 business days</strong>, please contact your property coordinator or the Kiwanis Homes Main Office at <a href="mailto:info@kiwanishomes.ca" style="color:${NAVY}">info@kiwanishomes.ca</a>.`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: "kw-01", name: "TSR — Received Online", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Has Been Received", ["We've received your tenant service request submitted online. Our team will review it and follow up with next steps.", KIWANIS_MAIN]) },
  { id: "kw-02", name: "TSR — Logged (Verbal)", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Has Been Logged", ["We've logged the tenant service request you reported to our office. Our team will review it and follow up with next steps.", KIWANIS_MAIN]) },
  { id: "kw-03", name: "TSR — Assigned to Contractor", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Has Been Assigned to a Contractor", ["This tenant service request has been assigned to a contractor for further assessment and/or repair.", `If you have not heard from the contractor within <strong>3 business days</strong>, please contact your property coordinator or the Kiwanis Homes Main Office at <a href="mailto:info@kiwanishomes.ca" style="color:${NAVY}">info@kiwanishomes.ca</a>.`]) },
  { id: "kw-04", name: "TSR — In Progress (Weather Dependant)", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Is In Progress", ["This tenant service request is in progress. Some of the work is weather dependant and will be scheduled once conditions allow.", KIWANIS_MAIN]) },
  { id: "kw-05", name: "TSR — On Hold (Seasonal)", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Is On Hold &mdash; Seasonal", ["This tenant service request has been approved but is weather dependant and will be addressed in the spring.", `If you have not heard from staff or a contractor by <strong>April 1st</strong>, please contact your property coordinator or the Kiwanis Homes Main Office at <a href="mailto:info@kiwanishomes.ca" style="color:${NAVY}">info@kiwanishomes.ca</a>.`]) },
  { id: "kw-06", name: "TSR — On Hold (Cosmetic)", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Is On Hold &mdash; Cosmetic", ["This tenant service request has been assessed and deemed a cosmetic repair. We are unable to upgrade this item due to current budget constraints.", "This request will be assessed at a later date when adequate funding is available. Please contact us if the condition worsens."]) },
  { id: "kw-07", name: "TSR — Cancelled / Closed", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Has Been Closed", ["This tenant service request has been closed, and no repair was necessary."]) },
  { id: "kw-08", name: "TSR — Completed", category: "Maintenance", channels: ["email"], provider: "Kiwanis Homes",
    html: kiwanisLetter("Your Service Request Has Been Completed", ["This tenant service request has been completed. Thank you for letting us know."]) },
];
