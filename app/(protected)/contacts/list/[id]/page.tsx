"use client";
import React from "react";
import { useParams } from "next/navigation";
import ContactsTable from "../../components/contacts-table";

export default function ContactsListByIdPage() {
  const params = useParams();
  const idParam = params?.id as string | undefined;
  const listId = idParam ? Number(idParam) : NaN;

  if (!idParam || Number.isNaN(listId)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <p className="text-sm text-red-600 mt-2">Invalid or missing list ID in URL.</p>
      </div>
    );
  }

  return <ContactsTable listId={listId} />;
}
