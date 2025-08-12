"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import SecondaryButtonWithPlus from "@/app/testcomps/components/secondary-button-with-plus";
import EditSingleFieldPopup from "@/app/testcomps/components/edit-single-field-popup";
import ImportContactsPopup from "./import-contacts-popup";
import EditContactPopup, { type EditContact } from "./edit-contact-popup";
import DeleteContactConfirmPopup from "./delete-contact-confirm-popup";
import DeleteListConfirmPopup from "./delete-list-confirm-popup";
import ContactDetails from "@/app/testcomps/components/contact-details";

interface ContactRow {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  website: string | null;
}

interface ContactsTableProps {
  listId: number;
}

const ContactsTable: React.FC<ContactsTableProps> = ({ listId }) => {
  const [listName, setListName] = useState<string>("");
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [showEditName, setShowEditName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<EditContact | null>(null);
  const [showDeleteContact, setShowDeleteContact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string | null } | null>(null);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  // Contact details popup
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);

  const router = useRouter();

  // Basic pagination (same defaults as other tables)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const totalCount = useMemo(() => rows.length, [rows]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  // Navigate to dedicated one-one-call route for a single contact
  const handleOneOnCall = (contactId: number) => {
    // Include listId for compatibility; one-one-call will forward both
    router.push(`/calling/one-one-call?contactId=${contactId}&listId=${listId}`);
  };

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => !!selected[r.id]),
    [rows, selected]
  );

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allSelected) {
        // Deselect all rows
        return {};
      }
      // Select all rows
      const next: Record<number, boolean> = {};
      rows.forEach((r) => {
        next[r.id] = true;
      });
      return next;
    });
  };

  const openContactDetails = (row: ContactRow) => {
    setSelectedContact(row);
    setShowContactDetails(true);
  };

  const handleConfirmDeleteList = async () => {
    try {
      setDeletingList(true);
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Ensure the list belongs to the user
      const { data: list, error: listErr } = await supabase
        .from("contact_lists")
        .select("id")
        .eq("id", listId)
        .eq("user_id", userId)
        .maybeSingle();
      if (listErr) throw listErr;
      if (!list) throw new Error("List not found");

      // Delete contacts in this list first (in case FK doesn't cascade)
      const { error: delContactsErr } = await supabase
        .from("contacts")
        .delete()
        .eq("contact_list_id", listId);
      if (delContactsErr) throw delContactsErr;

      // Then delete the list
      const { error: delListErr } = await supabase
        .from("contact_lists")
        .delete()
        .eq("id", listId)
        .eq("user_id", userId);
      if (delListErr) throw delListErr;

      // Go back to lists page
      router.push("/contacts");
    } catch (e) {
      console.error("Failed to delete list:", e);
    } finally {
      setDeletingList(false);
      setShowDeleteList(false);
    }
  };

  const openDeleteContact = (id: number) => {
    const row = rows.find((r) => r.id === id) || null;
    setDeleteTarget({ id, name: row?.name ?? null });
    setShowDeleteContact(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("contacts")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("contact_list_id", listId);
      if (delErr) throw delErr;

      // Animate removal then update UI
      const idToRemove = deleteTarget.id;
      setRemovingIds((prev) => new Set(prev).add(idToRemove));
      setTimeout(() => {
        setRows((prev) => prev.filter((r) => r.id !== idToRemove));
        setSelected((prev) => {
          const next = { ...prev };
          delete next[idToRemove];
          return next;
        });
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(idToRemove);
          return next;
        });
      }, 250);
      setShowDeleteContact(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error("Failed to delete contact:", e);
    } finally {
      setDeleting(false);
    }
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[Number(k)]).map(Number), [selected]);
  const selectedCount = selectedIds.length;

  const handleConfirmBulkDelete = async () => {
    if (selectedCount === 0) return;
    try {
      setDeletingBulk(true);
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("contacts")
        .delete()
        .in("id", selectedIds)
        .eq("contact_list_id", listId);
      if (delErr) throw delErr;

      // Animate removal then update UI
      setRemovingIds((prev) => {
        const next = new Set(prev);
        selectedIds.forEach((id) => next.add(id));
        return next;
      });
      setShowBulkDelete(false);
      setTimeout(() => {
        setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
        setSelected({});
        setRemovingIds((prev) => {
          const next = new Set(prev);
          selectedIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 250);
    } catch (e) {
      console.error("Failed to bulk delete contacts:", e);
    } finally {
      setDeletingBulk(false);
    }
  };

  const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (!userId) {
          setError("You must be signed in to view contacts.");
          setRows([]);
          setListName("");
          return;
        }

        // Load list name (ensure it belongs to user)
        const { data: list, error: listErr } = await supabase
          .from("contact_lists")
          .select("name")
          .eq("id", listId)
          .eq("user_id", userId)
          .maybeSingle();
        if (listErr) throw listErr;
        setListName(list?.name || "");

        // Load contacts for this list
        const { data: contacts, error: contactsErr } = await supabase
          .from("contacts")
          .select("id, name, phone, email, company, position, website")
          .eq("contact_list_id", listId)
          .order("id", { ascending: true })
          .limit(50000);
        if (contactsErr) throw contactsErr;

        const mapped: ContactRow[] = (contacts || []).map((c: any) => ({
          id: c.id as number,
          name: (c.name as string) ?? null,
          phone: (c.phone as string) ?? null,
          email: (c.email as string) ?? null,
          company: (c.company as string) ?? null,
          position: (c.position as string) ?? null,
          website: (c.website as string) ?? null,
        }));
        setRows(mapped);
      } catch (e: any) {
        console.error("Failed to load contacts:", e);
        setError(e?.message || "Failed to load contacts");
        setRows([]);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, [listId]);

  const openEditContact = async (id: number) => {
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        setError("You must be signed in to edit contacts.");
        return;
      }

      // Load the full contact for editing, ensuring it belongs to this list (list ownership already validated)
      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .select("id, name, phone, email, company, position, website, notes, contact_list_id")
        .eq("id", id)
        .maybeSingle();
      if (contactErr) throw contactErr;
      if (!contact || contact.contact_list_id !== listId) {
        setError("Contact not found");
        return;
      }

      setEditingContact({
        id: contact.id,
        name: contact.name ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        company: contact.company ?? "",
        position: contact.position ?? "",
        website: contact.website ?? "",
        notes: contact.notes ?? "",
      });
      setShowEditContact(true);
    } catch (e: any) {
      console.error("Failed to load contact for edit:", e);
      setError(e?.message || "Failed to load contact");
    }
  };

  const handleSaveContact = async (updated: EditContact) => {
    if (!updated?.id) return;
    try {
      setSavingContact(true);
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error: updErr } = await supabase
        .from("contacts")
        .update({
          name: updated.name,
          phone: updated.phone,
          email: updated.email,
          company: updated.company,
          position: updated.position,
          website: updated.website,
          notes: updated.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updated.id)
        .eq("contact_list_id", listId);
      if (updErr) throw updErr;

      // Update local rows for immediate UI feedback
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, name: updated.name ?? r.name, phone: updated.phone ?? r.phone } : r)));
      setShowEditContact(false);
      setEditingContact(null);
    } catch (e) {
      console.error("Failed to save contact:", e);
    } finally {
      setSavingContact(false);
    }
  };

  const handleRenameList = async (newName: string) => {
    try {
      setSavingName(true);
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error: updErr } = await supabase
        .from("contact_lists")
        .update({ name: newName })
        .eq("id", listId)
        .eq("user_id", userId);
      if (updErr) throw updErr;
      setListName(newName);
      setShowEditName(false);
    } catch (e) {
      console.error("Failed to rename list:", e);
      // keep popup open for retry
    } finally {
      setSavingName(false);
    }
  };

  return (
    <section
      className="relative bg-white border border-[#003333]/10 rounded-[10px]"
      style={{ width: "100%", maxWidth: 1418, minHeight: 489, margin: "40px auto 0" }}
    >
      {/* Header */}
      <div className="w-full flex items-end justify-between" style={{ padding: "44px 72px 29px" }}>
        <div className="flex items-center gap-3">
          <Link href="/contacts" aria-label="Back to Contacts" className="inline-flex items-center">
            <Image src="/back-arrow.svg" alt="Back" width={30} height={30} className="hover:opacity-80 transition-opacity" />
          </Link>
          <h2
            className="text-[#003333] font-bold"
            style={{ fontFamily: "Open Sans, sans-serif", fontSize: "33.81px" }}
          >
            {listName || "Contacts"}
          </h2>
          {/* Edit list name button */}
          <button
            type="button"
            aria-label="Edit list name"
            onClick={() => setShowEditName(true)}
            className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
          >
            <img
              src="/edit-icon.svg"
              alt="Edit list name"
              className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
            />
          </button>
          {/* Delete list button */}
          <button
            type="button"
            aria-label="Delete list"
            onClick={() => setShowDeleteList(true)}
            className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
          >
            <img
              src="/delete-icon.svg"
              alt="Delete list"
              className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
            />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <SecondaryButtonWithPlus
            label="Import Contacts"
            onClick={() => setShowImport(true)}
          />
          {selectedCount > 0 && (
            <button
              type="button"
              aria-label="Delete selected contacts"
              onClick={() => setShowBulkDelete(true)}
              className="inline-flex items-center justify-center rounded-[16px] bg-[#FF0000] hover:bg-[#e00000] text-white"
              style={{ height: 41, width: 41 }}
              title="Delete selected"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M16.5 4.478V5.25H21a.75.75 0 010 1.5h-1.04l-1.1 12.1A3.75 3.75 0 0115.12 22H8.88a3.75 3.75 0 01-3.739-3.15l-1.1-12.1H3a.75.75 0 010-1.5h4.5v-.772A2.728 2.728 0 0110.228 1.75h3.544A2.728 2.728 0 0116.5 4.478zM9.75 9a.75.75 0 00-1.5 0v8.25a.75.75 0 001.5 0V9zm6 0a.75.75 0 00-1.5 0v8.25a.75.75 0 001.5 0V9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table header row */}
      <div className="w-full" style={{ backgroundColor: "#E9ECED", height: 52 }}>
        <div className="flex h-full">
          {/* Checkbox column header (Select All) */}
          <div className="flex items-center" style={{ width: "5.085%" }}>
            <input
              type="checkbox"
              aria-label="Select all"
              className="ml-[24px] h-[18px] w-[18px] cursor-pointer"
              checked={allSelected}
              onChange={toggleSelectAll}
              style={{ accentColor: '#003333' }}
            />
          </div>
          <div className="flex items-center" style={{ width: "40%" }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">NAME</span>
          </div>
          <div className="flex items-center" style={{ width: "calc(100% - (5.085% + 40% + 190px + 180px))" }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">PHONE</span>
          </div>
          {/* Actions header */}
          <div className="flex items-center justify-start pl-3" style={{ width: 190 }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">ACTIONS</span>
          </div>
          {/* Right spacer to align like Date Created column (adjusted to 180px) */}
          <div className="flex items-center" style={{ width: 180 }} />
        </div>
      </div>

      {/* Rows */}
      <div className="w-full" style={{ minHeight: pageRows.length === 0 ? 489 - (44 + 29 + 52) : undefined }}>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading contacts…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : pageRows.length === 0 ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="flex flex-col items-center" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <Image src="/placeholder-empty.svg" alt="Empty" width={93} height={84} />
              <h3 className="mt-4 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Contacts Found</h3>
              <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Start by importing contacts</p>
              <div className="mt-4">
                <SecondaryButtonWithPlus
                  label="Import Contacts"
                  onClick={() => setShowImport(true)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingBottom: 96 }}>
            {pageRows.map((r) => (
              <div
                key={r.id}
                className={`flex h-[48px] items-center border-b border-[#003333]/10 transition-all duration-300 ease-out hover:bg-[#F9FBFB] cursor-pointer ${removingIds.has(r.id) ? 'opacity-0 translate-x-2' : ''}`}
                onClick={() => openContactDetails(r)}
              >
              {/* Checkbox cell */}
              <div className="flex items-center" style={{ width: "5.085%" }}>
                <input
                  type="checkbox"
                  aria-label={`Select contact ${r.name ?? r.phone ?? r.id}`}
                  className="ml-[24px] h-[18px] w-[18px] cursor-pointer"
                  checked={!!selected[r.id]}
                  onChange={() => toggleRow(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: '#003333' }}
                />
              </div>
              {/* NAME */}
              <div className="flex items-center" style={{ width: "40%" }}>
                <span className="text-[#111827] text-[14.4px]">{r.name || "—"}</span>
              </div>
              {/* PHONE */}
              <div className="flex items-center" style={{ width: "calc(100% - (5.085% + 40% + 190px + 180px))" }}>
                <span className="text-[#111827] text-[14.4px]">{r.phone || "—"}</span>
              </div>
              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-2" style={{ width: 190 }}>
                {/* Edit button */}
                <button
                  type="button"
                  aria-label="Edit contact"
                  className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
                  onClick={(e) => { e.stopPropagation(); openEditContact(r.id); }}
                >
                  <img
                    src="/edit-icon.svg"
                    alt="Edit"
                    className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
                  />
                </button>
                {/* Delete button */}
                <button
                  type="button"
                  aria-label="Delete contact"
                  className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
                  onClick={(e) => { e.stopPropagation(); openDeleteContact(r.id); }}
                >
                  <img
                    src="/delete-icon.svg"
                    alt="Delete"
                    className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
                  />
                </button>
                {/* One-On Call button (small, green) */}
                <button
                  type="button"
                  aria-label="One-On Call"
                  className="inline-flex items-center justify-center rounded-xl px-2.5 h-[26px] text-white bg-[#059669] hover:bg-[#047857] transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleOneOnCall(r.id); }}
                  style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '12.8px', lineHeight: 1 }}
                >
                  <img src="/call-icon.svg" alt="Call" className="w-3.5 h-3.5 mr-1.5" />
                  One-On Call
                </button>
              </div>
              {/* Right spacer to align like Date Created column (adjusted to keep total right reserve at 370px) */}
              <div className="flex items-center" style={{ width: 180 }} />
            </div>
            ))}
          </div>
        )}

      {showDeleteList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <DeleteListConfirmPopup
              title="Delete List"
              listName={listName}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              isDeleting={deletingList}
              onCancel={() => setShowDeleteList(false)}
              onConfirm={handleConfirmDeleteList}
            />
          </div>
        </div>
      )}

      {showDeleteContact && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <DeleteContactConfirmPopup
              title="Delete Contact"
              contactName={deleteTarget.name}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              isDeleting={deleting}
              onCancel={() => {
                setShowDeleteContact(false);
                setDeleteTarget(null);
              }}
              onConfirm={handleConfirmDelete}
            />
          </div>
        </div>
      )}

      {showBulkDelete && selectedCount > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <DeleteContactConfirmPopup
              title="Delete Selected Contacts"
              customMessage={`Are you sure you want to delete ${selectedCount} selected contact${selectedCount > 1 ? 's' : ''}?`}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              isDeleting={deletingBulk}
              onCancel={() => setShowBulkDelete(false)}
              onConfirm={handleConfirmBulkDelete}
            />
          </div>
        </div>
      )}
      </div>

      {/* Pagination (hidden when no rows) */}
      {totalCount > 0 && (
        <div
          className="flex items-center justify-between py-3"
          style={{ position: "absolute", bottom: 32, marginLeft: "5.085%", width: "calc(100% - 5.085%)", paddingRight: 40 }}
        >
          {/* Left: Rows Per Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#374151]">Rows Per Page</span>
            <div className="relative">
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-[#E5E7EB] rounded appearance-none pl-2 pr-8 py-1 text-[14px]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
          {/* Right: Page x of y + controls */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center h-8 px-2 text-sm text-[#374151] mr-2">Page {page} of {totalPages}</div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-[#374151] disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={`inline-flex items-center h-8 px-2 rounded border border-[#E5E7EB] ${num === page ? "bg[#E9ECED]" : ""}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-[#374151] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showEditName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <EditSingleFieldPopup
              title="Rename list"
              description="Update the name of your contact list"
              label="List name"
              placeholder="Enter new list name"
              initialValue={listName}
              submitLabel="Save"
              cancelLabel="Cancel"
              isSaving={savingName}
              successMessage="List name updated"
              onCancel={() => setShowEditName(false)}
              onSave={handleRenameList}
            />
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <ImportContactsPopup
              isOpen={true}
              listId={listId}
              title="Import contacts"
              description="Upload a CSV with at least Name and Phone columns."
              onClose={() => setShowImport(false)}
              onImportComplete={async () => {
                await fetchData();
              }}
            />
          </div>
        </div>
      )}

      {showEditContact && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <EditContactPopup
              title="Edit contact"
              description="Update the contact information"
              submitLabel="Save"
              cancelLabel="Cancel"
              isSaving={savingContact}
              successMessage="Contact updated"
              initialContact={editingContact}
              onCancel={() => {
                setShowEditContact(false);
                setEditingContact(null);
              }}
              onSave={handleSaveContact}
            />
          </div>
        </div>
      )}

      {showContactDetails && selectedContact && (
        <ContactDetails
          modal
          isOpen={true}
          onClose={() => {
            setShowContactDetails(false);
            setSelectedContact(null);
          }}
          // Pass minimal known contact data; other props use defaults
          contactId={selectedContact.id}
          listId={listId}
          contactName={selectedContact.name ?? ''}
          contactPhone={selectedContact.phone ?? ''}
          contactEmail={selectedContact.email ?? ''}
          contactRole={selectedContact.position ?? ''}
          companyName={selectedContact.company ?? ''}
          websiteUrl={selectedContact.website ?? ''}
        />
      )}
    </section>
  );
};

export default ContactsTable;
