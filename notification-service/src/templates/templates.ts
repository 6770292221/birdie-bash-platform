import { EventCreated } from "../types";

function baseText(ev: any) {
  const name = ev.eventName;
  const date = ev.eventDate;
  const venue = ev.venue ?? ev.location ?? "";
  return { name, date, venue };
}

export function renderCreateTemplate(ev: EventCreated | any) {
  const { name, date, venue } = baseText(ev.data || ev);
  const emailSubject = `📅 New Event: ${name} (${date})`;
  const emailHtml = `
    <div style="font-family:system-ui,Arial">
      <h2>New Event Created</h2>
      <p><b>Event:</b> ${name}</p>
      <p><b>Date:</b> ${date}</p>
      <p><b>Venue:</b> ${venue}</p>
      <hr/><small>Sent by BBP Notification Service</small>
    </div>`;
  const smsText = `New Event: ${name} on ${date} at ${venue} — BBP`;
  return { emailSubject, emailHtml, smsText };
}

export function renderUpdateTemplate(ev: any) {
  const { name, date, venue } = baseText(ev.data || ev);
  const emailSubject = `🛠️ Event Updated: ${name} (${date})`;
  const emailHtml = `
    <div style="font-family:system-ui,Arial">
      <h2>Event Updated</h2>
      <p><b>Event:</b> ${name}</p>
      <p><b>Date:</b> ${date}</p>
      <p><b>Venue:</b> ${venue}</p>
      <hr/><small>Sent by BBP Notification Service</small>
    </div>`;
  const smsText = `Updated: ${name} on ${date} at ${venue} — BBP`;
  return { emailSubject, emailHtml, smsText };
}
