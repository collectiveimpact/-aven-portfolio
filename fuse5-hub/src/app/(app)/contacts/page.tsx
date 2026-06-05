import { getContacts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { ContactsTable } from "./contacts-table";

export default async function ContactsPage() {
  const [contacts, me] = await Promise.all([getContacts(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Contacts</div>
      <div className="f5-page-sub">Staff and vendor directory across the WoodGreen portfolio.</div>

      <ContactsTable contacts={contacts} canEdit={canEdit} />
    </main>
  );
}
