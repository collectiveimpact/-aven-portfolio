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
];
