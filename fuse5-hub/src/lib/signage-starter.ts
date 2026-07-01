// WoodGreen signage starter templates — real notice types mapped onto the
// signage design system (see lib/signage-html.ts). These are the display-channel
// baseline: what plays on lobby/elevator screens.
import type { SignageInput } from "@/lib/signage-html";

export interface SignageTemplate {
  id: string;
  name: string;
  category: string;
  input: SignageInput;
}

const IMG = {
  volunteers: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&q=70",
  winter: "https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=70",
  welcome: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=70",
  survey: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=70",
  // Generated to match the WoodGreen source deck (served from /public/signage).
  mouse: "/signage/mouse.png",
  water: "/signage/water.png",
};

export const SIGNAGE_TEMPLATES: SignageTemplate[] = [
  { id: "sg-vol", name: "Corporate Volunteers", category: "Community",
    input: { orgName: "WoodGreen", category: "Community social", headline: "Corporate Volunteers", subhead: "Thank you for making a difference in our city", layout: "fullbleed", image: IMG.volunteers } },
  { id: "sg-pest", name: "Pest Inspections & Treatment", category: "Operations & Waste",
    input: { orgName: "WoodGreen", category: "Operations pest", headline: "Pest Inspections and Treatment", dateText: "January 25", timeText: "9am – 5pm", secondary: "害虫防治活动通知", categoryLabel: "Regular maintenance / Mice", image: IMG.mouse, layout: "split" } },
  { id: "sg-water", name: "Water Shut-Off", category: "Operations & Waste",
    input: { orgName: "WoodGreen", category: "Operations water", headline: "Water Shut-Off", dateText: "Saturday, July 12", timeText: "9am – 12pm", secondary: "停水通知 — 请提前储水", categoryLabel: "Scheduled work / Plumbing", image: IMG.water, layout: "split" } },
  { id: "sg-cold", name: "Extreme Cold Alert", category: "Emergency & Safety",
    input: { orgName: "WoodGreen", category: "Emergency alert", headline: "Extreme Cold Alert", subhead: "Warming centres are open — please check on your neighbours", layout: "fullbleed", image: IMG.winter } },
  { id: "sg-welcome", name: "Welcome to Your New Home", category: "Leasing & Move",
    input: { orgName: "WoodGreen", category: "Leasing welcome", headline: "Welcome to Your New Home", subhead: "We're so glad you're here", layout: "fullbleed", image: IMG.welcome } },
  { id: "sg-amenity", name: "Book the Amenity Space", category: "Amenities",
    input: { orgName: "WoodGreen", category: "Amenities", headline: "Book the Amenity Space", dateText: "Now open", timeText: "9am – 9pm", subhead: "Reserve at the front office", layout: "split" } },
  { id: "sg-survey", name: "Annual Tenant Survey", category: "Community",
    input: { orgName: "WoodGreen", category: "Community", headline: "Annual Tenant Survey", subhead: "Your voice shapes your community — scan to take part", layout: "fullbleed", image: IMG.survey } },
  { id: "sg-fire", name: "Fire Safety Equipment Testing", category: "Emergency & Safety",
    input: { orgName: "WoodGreen", category: "Safety", headline: "Fire Safety Equipment Testing", dateText: "This week", timeText: "8am – 4pm", subhead: "Alarms may sound during testing — no action needed", layout: "split" } },

  // ── From the PosterMyWall notice-archetype outlines ──
  { id: "sg-office-closed", name: "Office Closed — Holiday", category: "Community",
    input: { orgName: "WoodGreen", category: "Community", headline: "Building Office Closed", dateText: "Monday, Aug 4", subhead: "For the Civic Holiday. Emergency maintenance line stays open 24/7.", secondary: "办公室节假日关闭", layout: "split" } },
  { id: "sg-keepdoors", name: "Keep Doors Secured", category: "Emergency & Safety",
    input: { orgName: "WoodGreen", category: "Security", headline: "Please Keep All Doors Secured", subhead: "Do not hold or prop exterior doors. It keeps everyone safe.", secondary: "请保持所有门锁好", layout: "warning" } },
  { id: "sg-notrespass", name: "Authorized Access Only", category: "Emergency & Safety",
    input: { orgName: "WoodGreen", category: "Security", headline: "Authorized Access Only", subhead: "This area is for residents and staff only.", layout: "warning" } },
  { id: "sg-urgent", name: "Urgent — Action Required", category: "Emergency & Safety",
    input: { orgName: "WoodGreen", category: "Emergency alert", headline: "Do Not Drink the Water", subhead: "Boil-water advisory in effect. Boil for 1 minute before use.", secondary: "煮沸通知 — 请将水煮沸一分钟", layout: "warning" } },
  { id: "sg-parking", name: "Parking Notice", category: "Operations & Waste",
    input: { orgName: "WoodGreen", category: "Operations", headline: "Visitor Parking Notice", dateText: "Effective Aug 1", subhead: "Permits now required after 10pm — register at the front office.", layout: "split" } },
  { id: "sg-announce", name: "Important Announcement", category: "Financial",
    input: { orgName: "WoodGreen", category: "Financial", headline: "Rent Payment Options Have Changed", subhead: "You can now pay online through the resident portal — no more cheques.", layout: "fullbleed" } },
  { id: "sg-postponed", name: "Event Postponed", category: "Community",
    input: { orgName: "WoodGreen", category: "Community", headline: "Community BBQ Postponed", dateText: "New date: Aug 17", subhead: "Rescheduled due to weather. Same time, same place.", layout: "split" } },
  { id: "sg-relocation", name: "Office Relocation", category: "Community",
    input: { orgName: "WoodGreen", category: "Community", headline: "The Office Has Moved", subhead: "Find us on the ground floor, Suite 101 — same friendly team.", layout: "split" } },
  { id: "sg-elevator", name: "Elevator Out of Service", category: "Operations & Waste",
    input: { orgName: "WoodGreen", category: "Operations elevator", headline: "Elevator Out of Service", dateText: "Until Friday", subhead: "Repairs underway. We apologize for the inconvenience.", secondary: "电梯停止服务", layout: "split" } },
  { id: "sg-waste", name: "Waste & Recycling Reminder", category: "Operations & Waste",
    input: { orgName: "WoodGreen", category: "Operations waste", headline: "Know Before You Throw", subhead: "Recycling goes in blue, organics in green, garbage in grey.", layout: "split" } },
  { id: "sg-spotlight", name: "Community Spotlight", category: "Community",
    input: { orgName: "WoodGreen", category: "Community social", headline: "You Belong Here", subhead: "New programs, new friends — see what's on this month in the community room.", layout: "fullbleed" } },
];
